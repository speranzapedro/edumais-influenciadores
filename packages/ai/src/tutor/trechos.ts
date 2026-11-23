import { createHash } from "node:crypto";
import { type Bloco, type Ementa, normalizarCompetencias } from "@edu/core";

/**
 * Base de conhecimento do tutor: transforma o conteúdo de uma trilha (materiais do criador, aulas e
 * skill cards publicados) em seções e trechos prontos para indexar.
 *
 * - Seção = unidade enviada inteira ao embedding contextual (o vetor de cada trecho "enxerga" a seção)
 *   e unidade de reaproveitamento: seção com o mesmo hash não é reprocessada.
 * - Trecho = unidade recuperada pela busca (~350 tokens), com o "caminho" (ex.: Módulo 1 › Aula 3)
 *   que serve de citação, pesa mais na busca lexical e dá contexto ao modelo.
 * - Gabarito nunca entra: dos blocos avaliativos só vai o enunciado.
 */

export type OrigemTrecho = "material" | "aula" | "card";

export interface TrechoTutor {
  origem: OrigemTrecho;
  material_id: string | null;
  aula_id: string | null;
  card_id: string | null;
  pagina_inicio: number | null;
  pagina_fim: number | null;
  avaliativo: boolean;
  caminho: string;
  texto: string;
  tokens: number;
}

export interface SecaoTutor {
  /** Identifica a seção dentro da trilha (ex.: material:<id>:2, aula:<id>, cards:M1). */
  chave: string;
  hash: string;
  trechos: TrechoTutor[];
}

export interface MaterialTutor {
  id: string;
  nome: string;
  paginas: { pagina: number; texto: string }[];
}

export interface AulaTutor {
  id: string;
  ordem: number;
  modulo_id: string;
  modulo_titulo: string | null;
  titulo: string;
  objetivo: string | null;
  blocos: Bloco[];
}

export interface CardTutor {
  id: string;
  titulo: string;
  conceito: string;
  pontos_chave: string[];
  exemplo: string | null;
  topico_ids: string[];
}

export interface ConteudoTrilha {
  titulo: string;
  descricao: string | null;
  ementa: Ementa | null;
  materiais: MaterialTutor[];
  aulas: AulaTutor[];
  cards: CardTutor[];
}

/** Tamanhos em caracteres (~3,5 caracteres por token em português). */
export const TAMANHO_TRECHO = { alvo: 1400, maximo: 2000, minimo: 350 };
/** Limite de uma seção para o embedding contextual (32K tokens por documento no Voyage), com folga. */
export const MAX_TOKENS_SECAO = 20_000;

/** Estimativa conservadora (superestima) — usada para respeitar limites, não para cobrar. */
export function estimarTokens(texto: string) {
  return Math.ceil(texto.length / 3.2);
}

// ─────────────────────────── Limpeza do texto extraído ───────────────────────────

const LIGADURAS: Record<string, string> = { ﬁ: "fi", ﬂ: "fl", ﬀ: "ff", ﬃ: "ffi", ﬄ: "ffl" };

function normalizarEspacos(t: string) {
  return t
    .replace(/\r\n?/g, "\n")
    .replace(/[ﬁﬂﬀﬃﬄ]/g, (c) => LIGADURAS[c] ?? c)
    .replace(/[​-‍﻿­]/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n");
}

const NUMERO_PAGINA = /^(p(á|a)g(ina)?\.?\s*)?\d{1,4}(\s*(de|\/)\s*\d{1,4})?$/i;
const chaveLinha = (l: string) => l.trim().toLowerCase().replace(/\d+/g, "#");

/**
 * Remove cabeçalhos e rodapés repetidos (linhas que aparecem no topo ou no pé de boa parte das
 * páginas, ignorando números) e linhas que são só o número da página.
 */
export function removerCabecalhosRodapes(paginas: string[]): string[] {
  const linhas = paginas.map((p) => p.split("\n"));
  const candidatas = (ls: string[]) => {
    const idx = ls.map((l, i) => (l.trim() ? i : -1)).filter((i) => i >= 0);
    return [...idx.slice(0, 2), ...idx.slice(-2)];
  };
  const repetidas = new Set<string>();
  if (paginas.length >= 4) {
    const contagem = new Map<string, number>();
    for (const ls of linhas) {
      for (const k of new Set(candidatas(ls).map((i) => chaveLinha(ls[i])))) contagem.set(k, (contagem.get(k) ?? 0) + 1);
    }
    const minimo = Math.max(3, Math.ceil(paginas.length * 0.4));
    // Cabeçalho/rodapé é curto; linha longa repetida provavelmente é conteúdo.
    for (const [k, n] of contagem) if (n >= minimo && k.length > 0 && k.length <= 120) repetidas.add(k);
  }
  return linhas.map((ls) => {
    const remover = new Set(candidatas(ls).filter((i) => repetidas.has(chaveLinha(ls[i])) || NUMERO_PAGINA.test(ls[i].trim())));
    return ls.filter((_, i) => !remover.has(i)).join("\n");
  });
}

// ─────────────────────────── Estrutura: títulos e parágrafos ───────────────────────────

const PALAVRA_SECAO = /^(cap[íi]tulo|se[çc][ãa]o|t[íi]tulo|parte|anexo|ap[êe]ndice|unidade|m[óo]dulo|aula)\b/i;
const ITEM_LISTA = /^([•▪◦●\-–—*]|\d{1,2}[.)]\s|[a-z][)]\s)/;
const FIM_DE_FRASE = /[.!?:;]["'”)\]]?$/;

/** Legendas, citações quebradas ("(MORIN, 2011).") e linhas de sumário não são títulos. */
const NAO_TITULO = /^(figura|quadro|tabela|gr[áa]fico|fonte|nota)\b|[()]|\b(19|20)\d{2}\b/i;
/** Linha de sumário/lista de figuras: "2.3 ÉTICA ........ 30". */
const LINHA_SUMARIO = /(\.\s?){4,}\s*\d+\s*$|…+\s*\d+\s*$/;
const TERMINA_EM_CONECTIVO = /\b(de|da|do|das|dos|em|e|a|o|as|os|com|para|no|na|nos|nas|ao|à|por|sobre|entre)$/i;
const REFERENCIAS = /^(refer[êe]ncias|bibliografia)( bibliogr[áa]ficas)?$/i;

/** Nível do título (1 = mais alto) ou null se a linha não parece título. */
export function nivelTitulo(linha: string): number | null {
  const l = linha.trim();
  const md = /^(#{1,6})\s+\S/.exec(l);
  if (md) return md[1].length;
  if (l.length < 3 || l.length > 90 || /[,;]$/.test(l) || NAO_TITULO.test(l) || LINHA_SUMARIO.test(l)) return null;
  if (l.split(/\s+/).length > 12) return null;
  const letras = l.replace(/[^\p{L}]/gu, "");
  const caixaAlta = letras.length >= 4 && letras === letras.toLocaleUpperCase("pt-BR");
  const numerado = /^(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+(.+)$/u.exec(l);
  if (numerado) {
    // "1 INTRODUÇÃO" e "2.3.1 História da ética" são títulos; "2. Focalizada" é item de lista.
    const nivel = numerado[1].split(".").length;
    if (/\.$/.test(numerado[2])) return null;
    return (nivel === 1 ? caixaAlta : /^\p{Lu}/u.test(numerado[2])) ? nivel : null;
  }
  // Título em caixa alta pode terminar em ponto ("DAS RELAÇÕES COM A PESSOA.").
  if (caixaAlta) return PALAVRA_SECAO.test(l) ? 1 : 2;
  if (/\.$/.test(l)) return null;
  if (PALAVRA_SECAO.test(l) && /^\S+\s+([IVXLC]+|\d+)\b/i.test(l)) return 1;
  return null;
}

interface Unidade {
  tipo: "titulo" | "paragrafo";
  nivel: number;
  texto: string;
  pagina: number;
}

/**
 * Converte as páginas (já limpas) em títulos e parágrafos: desfaz a hifenização de fim de linha e
 * junta as linhas quebradas pelo PDF, preservando itens de lista e títulos.
 */
export function estruturar(paginas: { pagina: number; texto: string }[]): Unidade[] {
  const saida: Unidade[] = [];
  let aberto: Unidade | null = null;
  for (const { pagina, texto } of paginas) {
    const linhas = texto.replace(/(\p{Ll})-\n(\p{Ll})/gu, "$1$2").split("\n");
    for (const bruta of linhas) {
      const linha = bruta.trim();
      if (!linha) {
        aberto = null;
        continue;
      }
      if (LINHA_SUMARIO.test(linha)) continue;
      const nivel = nivelTitulo(linha);
      if (nivel !== null) {
        const texto = linha.replace(/^#{1,6}\s+/, "");
        const anterior = saida[saida.length - 1];
        // Título quebrado em duas linhas ("…APRENDIZADO DA ÉTICA EM" + "SUA FORMAÇÃO").
        if (!aberto && anterior?.tipo === "titulo" && anterior.pagina === pagina && anterior.nivel === nivel && TERMINA_EM_CONECTIVO.test(anterior.texto)) {
          anterior.texto += ` ${texto}`;
        } else {
          saida.push({ tipo: "titulo", nivel, texto, pagina });
        }
        aberto = null;
        continue;
      }
      const continua = aberto && !ITEM_LISTA.test(linha) && (!FIM_DE_FRASE.test(aberto.texto) || /^\p{Ll}/u.test(linha));
      if (aberto && continua) {
        aberto.texto += ` ${linha}`;
      } else {
        aberto = { tipo: "paragrafo", nivel: 0, texto: linha, pagina };
        saida.push(aberto);
      }
    }
  }
  return saida;
}

/** Quebra um parágrafo longo em pedaços de até `max` caracteres, preferindo fim de frase. */
export function partirParagrafo(texto: string, max = TAMANHO_TRECHO.alvo): string[] {
  if (texto.length <= TAMANHO_TRECHO.maximo) return [texto];
  const frases = texto.match(/[^.!?]+[.!?]+["'”)]?\s*|[^.!?]+$/g) ?? [texto];
  const partes: string[] = [];
  let atual = "";
  for (const f of frases) {
    if (atual && atual.length + f.length > max) {
      partes.push(atual.trim());
      atual = "";
    }
    if (f.length > TAMANHO_TRECHO.maximo) {
      for (let i = 0; i < f.length; i += max) partes.push(f.slice(i, i + max).trim());
      continue;
    }
    atual += f;
  }
  if (atual.trim()) partes.push(atual.trim());
  return partes.filter(Boolean);
}

// ─────────────────────────── Montagem dos trechos ───────────────────────────

interface Pedaco {
  texto: string;
  pagina: number;
}

/**
 * Agrupa pedaços de texto em trechos de ~TAMANHO_TRECHO.alvo. Um título fecha o trecho em andamento
 * (se ele já tem corpo) e passa a fazer parte do caminho dos seguintes; o texto do título também fica
 * no trecho, porque ajuda a busca e a leitura.
 */
function agrupar(unidades: Unidade[], raiz: string): { caminho: string; texto: string; ini: number; fim: number }[] {
  const trechos: { caminho: string; texto: string; ini: number; fim: number }[] = [];
  const pilha: { nivel: number; texto: string }[] = [];
  const caminhoAtual = () => [raiz, ...pilha.slice(-3).map((p) => p.texto)];
  // Trecho que atravessa títulos (seções curtas juntas) fica com o caminho comum a eles: a citação
  // não aponta só para a primeira seção.
  const comum = (a: string[], b: string[]) => {
    const i = a.findIndex((x, k) => x !== b[k]);
    return i === -1 ? a : a.slice(0, i);
  };
  let atual: { caminho: string[]; partes: Pedaco[] } | null = null;
  const tamanho = () => (atual ? atual.partes.reduce((s, p) => s + p.texto.length + 1, 0) : 0);
  const fechar = () => {
    if (atual?.partes.length) {
      trechos.push({
        caminho: atual.caminho.join(" › "),
        texto: atual.partes.map((p) => p.texto).join("\n"),
        ini: atual.partes[0].pagina,
        fim: atual.partes[atual.partes.length - 1].pagina,
      });
    }
    atual = null;
  };
  const so_titulos = () => atual?.partes.every((p) => p.texto.startsWith("\u0000"));
  // Referências bibliográficas só poluem a busca: pula até o próximo capítulo, anexo ou apêndice.
  let nasReferencias = false;

  for (const u of unidades) {
    if (u.tipo === "titulo" && REFERENCIAS.test(u.texto)) {
      fechar();
      nasReferencias = true;
      continue;
    }
    if (nasReferencias) {
      if (u.tipo === "titulo" && (PALAVRA_SECAO.test(u.texto) || /^\d/.test(u.texto))) nasReferencias = false;
      else continue;
    }
    if (u.tipo === "titulo") {
      if (atual && tamanho() >= TAMANHO_TRECHO.minimo && !so_titulos()) fechar();
      while (pilha.length && pilha[pilha.length - 1].nivel >= u.nivel) pilha.pop();
      pilha.push({ nivel: u.nivel, texto: u.texto });
      if (!atual) atual = { caminho: caminhoAtual(), partes: [] };
      else if (so_titulos()) atual.caminho = caminhoAtual();
      else atual.caminho = comum(atual.caminho, caminhoAtual());
      atual.partes.push({ texto: `\u0000${u.texto}`, pagina: u.pagina });
      continue;
    }
    for (const parte of partirParagrafo(u.texto)) {
      if (atual && tamanho() + parte.length > TAMANHO_TRECHO.alvo && tamanho() >= TAMANHO_TRECHO.minimo && !so_titulos()) fechar();
      if (!atual) atual = { caminho: caminhoAtual(), partes: [] };
      atual.partes.push({ texto: parte, pagina: u.pagina });
    }
  }
  fechar();

  // O último trecho curto demais se junta ao anterior do mesmo caminho.
  const ult = trechos[trechos.length - 1];
  const pen = trechos[trechos.length - 2];
  if (ult && pen && ult.texto.length < TAMANHO_TRECHO.minimo && pen.caminho === ult.caminho && pen.texto.length + ult.texto.length <= TAMANHO_TRECHO.maximo) {
    pen.texto += `\n${ult.texto}`;
    pen.fim = ult.fim;
    trechos.pop();
  }
  // biome-ignore lint/suspicious/noControlCharactersInRegex: o NUL marca títulos de seção e não pode chegar ao banco.
  return trechos.map((t) => ({ ...t, texto: t.texto.replace(/\u0000/g, "") }));
}

/** Divide trechos consecutivos em seções de até MAX_TOKENS_SECAO. */
function emSecoes(chaveBase: string, trechos: TrechoTutor[]): { chave: string; trechos: TrechoTutor[] }[] {
  const secoes: { chave: string; trechos: TrechoTutor[] }[] = [];
  let atual: TrechoTutor[] = [];
  let tokens = 0;
  for (const t of trechos) {
    if (atual.length && tokens + t.tokens > MAX_TOKENS_SECAO) {
      secoes.push({ chave: `${chaveBase}:${secoes.length + 1}`, trechos: atual });
      atual = [];
      tokens = 0;
    }
    atual.push(t);
    tokens += t.tokens;
  }
  if (atual.length) secoes.push({ chave: `${chaveBase}:${secoes.length + 1}`, trechos: atual });
  return secoes;
}

/** Parte do conteúdo gerado veio com acentos escapados literalmente ("você"): decodifica. */
export function decodificarEscapes(t: string) {
  return t.replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

function trecho(p: Partial<TrechoTutor> & Pick<TrechoTutor, "origem" | "caminho" | "texto">): TrechoTutor {
  const caminho = decodificarEscapes(p.caminho);
  const texto = decodificarEscapes(p.texto);
  return {
    material_id: null,
    aula_id: null,
    card_id: null,
    pagina_inicio: null,
    pagina_fim: null,
    avaliativo: false,
    ...p,
    caminho,
    texto,
    tokens: estimarTokens(`${caminho}\n${texto}`),
  };
}

/** "a-vivencia-do-tecnico_v2.pdf" → "A vivencia do tecnico v2". */
export function nomeLegivel(arquivo: string) {
  const base = arquivo
    .replace(/\.(pdf|docx|md|markdown|txt|csv)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base.charAt(0).toLocaleUpperCase("pt-BR") + base.slice(1);
}

export function trechosDeMaterial(m: MaterialTutor): TrechoTutor[] {
  const ordenadas = [...m.paginas].sort((a, b) => a.pagina - b.pagina);
  const limpas = removerCabecalhosRodapes(ordenadas.map((p) => normalizarEspacos(p.texto)));
  const unidades = estruturar(ordenadas.map((p, i) => ({ pagina: p.pagina, texto: limpas[i] })));
  const raiz = nomeLegivel(m.nome);
  const vistos = new Set<string>();
  return agrupar(unidades, raiz)
    .filter((t) => {
      const k = t.texto.toLowerCase().replace(/\s+/g, " ");
      if (k.length < 40 || vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .map((t) => trecho({ origem: "material", material_id: m.id, pagina_inicio: t.ini, pagina_fim: t.fim, caminho: t.caminho, texto: t.texto }));
}

/** Enunciado de um bloco avaliativo, sem nada que entregue a resposta. */
export function enunciadoSemGabarito(b: Bloco): string | null {
  switch (b.tipo) {
    case "texto":
      return null;
    case "quiz":
      return `Quiz: ${b.pergunta}`;
    case "completar":
      return `Completar lacunas: ${b.texto.replace(/\[\[\d+\]\]/g, "____")}`;
    case "ordenar":
      return `Ordenar passos: ${b.instrucao}`;
    case "aberta":
      return `Pergunta aberta: ${b.pergunta}${b.dica ? ` (dica: ${b.dica})` : ""}`;
  }
}

export function trechosDeAula(a: AulaTutor): TrechoTutor[] {
  const caminho = `${a.modulo_titulo ?? "Módulo"} › Aula ${a.ordem}: ${a.titulo}`;
  const textos: string[] = [];
  if (a.objetivo) textos.push(`Objetivo da aula: ${a.objetivo}`);
  const exercicios: string[] = [];
  for (const b of a.blocos) {
    if (b.tipo === "texto") textos.push([b.titulo, b.texto, b.dica ? `Dica: ${b.dica}` : null].filter(Boolean).join("\n"));
    else {
      const e = enunciadoSemGabarito(b);
      if (e) exercicios.push(`- ${e}`);
    }
  }
  const saida: TrechoTutor[] = [];
  let atual = "";
  for (const t of textos) {
    if (atual && atual.length + t.length > TAMANHO_TRECHO.alvo) {
      saida.push(trecho({ origem: "aula", aula_id: a.id, caminho, texto: atual }));
      atual = "";
    }
    atual += (atual ? "\n\n" : "") + t;
  }
  if (atual) saida.push(trecho({ origem: "aula", aula_id: a.id, caminho, texto: atual }));
  if (exercicios.length) {
    saida.push(
      trecho({
        origem: "aula",
        aula_id: a.id,
        avaliativo: true,
        caminho: `${caminho} › Exercícios`,
        texto: `Exercícios propostos nesta aula:\n${exercicios.join("\n")}`,
      }),
    );
  }
  return saida;
}

export function trechoDeCard(c: CardTutor, modulo: string | null): TrechoTutor {
  const texto = [
    c.titulo,
    c.conceito,
    c.pontos_chave.length ? `Pontos-chave:\n${c.pontos_chave.map((p) => `- ${p}`).join("\n")}` : null,
    c.exemplo ? `Exemplo: ${c.exemplo}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return trecho({ origem: "card", card_id: c.id, caminho: `${modulo ?? "Trilha"} › Card: ${c.titulo}`, texto });
}

function moduloDoTopico(ementa: Ementa | null) {
  const mapa = new Map<string, { id: string; titulo: string }>();
  for (const m of ementa?.modulos ?? []) for (const t of m.topicos) mapa.set(t.id, { id: m.id, titulo: m.titulo });
  return mapa;
}

function hashSecao(chave: string, trechos: TrechoTutor[], modelo: string) {
  const h = createHash("sha256").update(`${modelo}\n${chave}\n`);
  for (const t of trechos) h.update(JSON.stringify([t.material_id, t.aula_id, t.card_id, t.pagina_inicio, t.pagina_fim, t.avaliativo, t.caminho, t.texto]));
  return h.digest("hex").slice(0, 32);
}

/**
 * Seções da trilha, em ordem determinística (materiais por id, aulas por ordem, cards por módulo).
 * O `modelo` de embedding entra no hash: trocar de modelo reindexa tudo.
 */
export function montarSecoes(c: ConteudoTrilha, modelo: string): SecaoTutor[] {
  const brutas: { chave: string; trechos: TrechoTutor[] }[] = [];
  for (const m of [...c.materiais].sort((a, b) => a.id.localeCompare(b.id))) {
    brutas.push(...emSecoes(`material:${m.id}`, trechosDeMaterial(m)));
  }
  for (const a of [...c.aulas].sort((x, y) => x.ordem - y.ordem)) {
    const ts = trechosDeAula(a);
    if (ts.length) brutas.push({ chave: `aula:${a.id}`, trechos: ts });
  }
  const modulos = moduloDoTopico(c.ementa);
  const porModulo = new Map<string, { titulo: string | null; cards: TrechoTutor[] }>();
  for (const card of c.cards) {
    const m = card.topico_ids.map((t) => modulos.get(t)).find(Boolean);
    const k = m?.id ?? "_";
    if (!porModulo.has(k)) porModulo.set(k, { titulo: m?.titulo ?? null, cards: [] });
    porModulo.get(k)!.cards.push(trechoDeCard(card, m?.titulo ?? null));
  }
  for (const [k, v] of [...porModulo].sort(([a], [b]) => a.localeCompare(b))) brutas.push(...emSecoes(`cards:${k}`, v.cards));

  return brutas.filter((s) => s.trechos.length).map((s) => ({ ...s, hash: hashSecao(s.chave, s.trechos, modelo) }));
}

/**
 * Mapa da trilha: a visão do todo que vai sempre no prompt (módulos, tópicos, aulas, cards e
 * materiais). Montado sem LLM, a partir do conteúdo publicado, e determinístico (bom para o cache).
 */
export function montarMapa(c: ConteudoTrilha): string {
  const l: string[] = [`# Trilha: ${c.titulo}`];
  if (c.descricao) l.push(c.descricao);
  const e = c.ementa;
  if (e?.objetivo_geral) l.push(`Objetivo geral: ${e.objetivo_geral}`);
  if (e?.publico_alvo) l.push(`Público-alvo: ${e.publico_alvo}`);
  // normalizarCompetencias: a ementa publicada pode ter as competências no formato antigo (texto).
  if (e?.competencias.length)
    l.push(
      `Competências: ${normalizarCompetencias(e.competencias)
        .map((c) => c.texto)
        .join("; ")}`,
    );
  const modulos = moduloDoTopico(e);
  const aulasPorModulo = new Map<string, AulaTutor[]>();
  for (const a of [...c.aulas].sort((x, y) => x.ordem - y.ordem)) {
    if (!aulasPorModulo.has(a.modulo_id)) aulasPorModulo.set(a.modulo_id, []);
    aulasPorModulo.get(a.modulo_id)!.push(a);
  }
  const cardsPorModulo = new Map<string, string[]>();
  for (const card of c.cards) {
    const m = card.topico_ids.map((t) => modulos.get(t)).find(Boolean)?.id ?? "_";
    if (!cardsPorModulo.has(m)) cardsPorModulo.set(m, []);
    cardsPorModulo.get(m)!.push(card.titulo);
  }
  for (const [i, m] of (e?.modulos ?? []).entries()) {
    l.push("", `## Módulo ${i + 1}: ${m.titulo}`);
    if (m.descricao) l.push(m.descricao);
    if (m.topicos.length) l.push(`Tópicos: ${m.topicos.map((t) => t.titulo).join("; ")}`);
    const aulas = aulasPorModulo.get(m.id) ?? [];
    if (aulas.length) l.push("Aulas:", ...aulas.map((a) => `- Aula ${a.ordem}: ${a.titulo}${a.objetivo ? ` — ${a.objetivo}` : ""}`));
    const cards = cardsPorModulo.get(m.id) ?? [];
    if (cards.length) l.push(`Cards de Conhecimento: ${cards.join("; ")}`);
  }
  if (c.materiais.length) {
    l.push("", "## Materiais de apoio do criador");
    for (const m of [...c.materiais].sort((a, b) => a.id.localeCompare(b.id))) l.push(`- ${m.nome} (${m.paginas.length} página(s))`);
  }
  return l.join("\n");
}
