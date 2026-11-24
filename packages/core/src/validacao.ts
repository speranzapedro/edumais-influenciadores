import {
  type Aula,
  type AulasDraft,
  type Bloco,
  type BlocoAberta,
  type BlocoCompletar,
  type BlocoOrdenar,
  type BlocoQuiz,
  type CardsDraft,
  type Ementa,
  ehCorrigivel,
  type Fonte,
  LIMITES,
  marcadoresLacuna,
  type SkillCard,
  todosTopicos,
  type VisaoGeral,
} from "./conteudo";

/**
 * Validadores determinísticos do conteúdo. São usados como tools pelos agentes
 * (o agente só encerra a etapa com zero erros) e pela UI do estúdio.
 */

export interface Pendencia {
  nivel: "erro" | "aviso";
  alvo: string;
  regra: string;
  mensagem: string;
}

const FRASES_PROIBIDAS = [
  "todas as anteriores",
  "nenhuma das anteriores",
  "todas as alternativas",
  "nenhuma das alternativas",
  "todas estão corretas",
  "nenhuma está correta",
];

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "em", "na", "no", "para", "com", "um", "uma", "por"]);

export function similaridade(a: string, b: string): number {
  const ta = new Set(
    normalizar(a)
      .split(" ")
      .filter((w) => w && !STOPWORDS.has(w)),
  );
  const tb = new Set(
    normalizar(b)
      .split(" ")
      .filter((w) => w && !STOPWORDS.has(w)),
  );
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter++;
  return inter / (ta.size + tb.size - inter);
}

function checarTamanho(
  p: Pendencia[],
  alvo: string,
  campo: string,
  valor: string | null | undefined,
  lim: { min?: number; max?: number },
  nivel: Pendencia["nivel"] = "erro",
) {
  const len = (valor ?? "").trim().length;
  if (len === 0) {
    p.push({ nivel: "erro", alvo, regra: `${campo}_vazio`, mensagem: `${campo} está vazio.` });
    return;
  }
  if (lim.min !== undefined && len < lim.min) {
    p.push({ nivel, alvo, regra: `${campo}_curto`, mensagem: `${campo} tem ${len} caracteres (mínimo ${lim.min}).` });
  }
  if (lim.max !== undefined && len > lim.max) {
    p.push({ nivel, alvo, regra: `${campo}_longo`, mensagem: `${campo} tem ${len} caracteres (máximo ${lim.max}).` });
  }
}

function checarFontes(p: Pendencia[], alvo: string, fontes: Fonte[], materiais: Set<string> | null) {
  if (fontes.length === 0) {
    p.push({ nivel: "aviso", alvo, regra: "sem_fonte", mensagem: "Sem referência ao material de origem." });
    return;
  }
  if (!materiais) return;
  for (const f of fontes) {
    if (!materiais.has(f.material_id)) {
      p.push({ nivel: "erro", alvo, regra: "fonte_inexistente", mensagem: `Fonte aponta para material inexistente (${f.material_id}).` });
    }
  }
}

function checarIdsUnicos(p: Pendencia[], ids: string[], tipo: string) {
  const vistos = new Set<string>();
  for (const id of ids) {
    if (vistos.has(id)) p.push({ nivel: "erro", alvo: id, regra: "id_duplicado", mensagem: `${tipo} com id duplicado: ${id}.` });
    vistos.add(id);
  }
}

// ─────────────────────────── Visão geral ───────────────────────────

export const LIMITES_VISAO = { competencias: { min: 3, max: 6 }, competencia: { min: 10, max: 200 } } as const;

/** Dados gerais da trilha: os mesmos campos na visão e (copiados) na ementa. */
function checarDadosGerais(p: Pendencia[], alvo: string, v: VisaoGeral) {
  checarTamanho(p, alvo, "curso", v.curso, { max: LIMITES.tituloCurto });
  checarTamanho(p, alvo, "objetivo_geral", v.objetivo_geral, { min: 40, max: 600 });
  checarTamanho(p, alvo, "publico_alvo", v.publico_alvo, { min: 10, max: 300 }, "aviso");
  const n = v.competencias.length;
  if (n === 0) p.push({ nivel: "erro", alvo, regra: "sem_competencias", mensagem: "Liste as competências que o aluno vai desenvolver." });
  else if (n < LIMITES_VISAO.competencias.min)
    p.push({ nivel: "aviso", alvo, regra: "poucas_competencias", mensagem: `Liste pelo menos ${LIMITES_VISAO.competencias.min} competências.` });
  else if (n > LIMITES_VISAO.competencias.max)
    p.push({ nivel: "aviso", alvo, regra: "muitas_competencias", mensagem: `${n} competências; o ideal é até ${LIMITES_VISAO.competencias.max}.` });
  checarIdsUnicos(
    p,
    v.competencias.map((c) => c.id),
    "Competência",
  );
  for (const c of v.competencias) checarTamanho(p, c.id, "competencia", c.texto, LIMITES_VISAO.competencia);
}

export function validarVisao(v: VisaoGeral): Pendencia[] {
  const p: Pendencia[] = [];
  checarDadosGerais(p, "visao", v);
  return p;
}

export interface CoberturaCompetencias {
  percentual: number;
  /** competência → tópicos que a desenvolvem */
  matriz: Record<string, string[]>;
  competenciasSemTopico: string[];
  topicosSemCompetencia: string[];
  referenciasInvalidas: { topico_id: string; competencia_id: string }[];
}

export function verificarCoberturaCompetencias(ementa: Ementa): CoberturaCompetencias {
  const ids = new Set(ementa.competencias.map((c) => c.id));
  const matriz: Record<string, string[]> = Object.fromEntries(ementa.competencias.map((c) => [c.id, []]));
  const topicosSemCompetencia: string[] = [];
  const referenciasInvalidas: CoberturaCompetencias["referenciasInvalidas"] = [];
  for (const t of todosTopicos(ementa)) {
    const vinculos = t.competencia_ids ?? [];
    if (!vinculos.some((k) => ids.has(k))) topicosSemCompetencia.push(t.id);
    for (const k of vinculos) {
      if (ids.has(k)) matriz[k].push(t.id);
      else referenciasInvalidas.push({ topico_id: t.id, competencia_id: k });
    }
  }
  const competenciasSemTopico = ementa.competencias.filter((c) => matriz[c.id].length === 0).map((c) => c.id);
  const n = ementa.competencias.length;
  return {
    percentual: n ? Math.round(((n - competenciasSemTopico.length) / n) * 100) : 0,
    matriz,
    competenciasSemTopico,
    topicosSemCompetencia,
    referenciasInvalidas,
  };
}

/** A ementa liga tópicos a competências? (As anteriores à etapa de visão geral não ligam.) */
export const ementaComVinculos = (ementa: Ementa) => todosTopicos(ementa).some((t) => t.competencia_ids !== undefined);

// ───────────────────────────── Ementa ─────────────────────────────

export function validarEmenta(ementa: Ementa, materiaisIds?: string[]): Pendencia[] {
  const p: Pendencia[] = [];
  const materiais = materiaisIds ? new Set(materiaisIds) : null;

  checarDadosGerais(p, "ementa", ementa);

  if (ementa.modulos.length === 0) {
    p.push({ nivel: "erro", alvo: "ementa", regra: "sem_modulos", mensagem: "A ementa não tem módulos." });
    return p;
  }
  if (ementa.modulos.length === 1) {
    p.push({ nivel: "aviso", alvo: "ementa", regra: "um_modulo", mensagem: "Só há um módulo; considere dividir o conteúdo." });
  }

  checarIdsUnicos(
    p,
    ementa.modulos.map((m) => m.id),
    "Módulo",
  );
  checarIdsUnicos(
    p,
    todosTopicos(ementa).map((t) => t.id),
    "Tópico",
  );

  for (const m of ementa.modulos) {
    checarTamanho(p, m.id, "titulo", m.titulo, { max: LIMITES.tituloCurto });
    checarTamanho(p, m.id, "descricao", m.descricao, { min: 20, max: 400 }, "aviso");
    if (m.topicos.length === 0) {
      p.push({ nivel: "erro", alvo: m.id, regra: "modulo_vazio", mensagem: `Módulo "${m.titulo}" não tem tópicos.` });
    } else if (m.topicos.length === 1) {
      p.push({ nivel: "aviso", alvo: m.id, regra: "modulo_um_topico", mensagem: `Módulo "${m.titulo}" tem só 1 tópico.` });
    } else if (m.topicos.length > 10) {
      p.push({ nivel: "aviso", alvo: m.id, regra: "modulo_grande", mensagem: `Módulo "${m.titulo}" tem ${m.topicos.length} tópicos; considere dividir.` });
    }
    for (const t of m.topicos) {
      checarTamanho(p, t.id, "titulo", t.titulo, { max: LIMITES.tituloCurto });
      checarTamanho(p, t.id, "descricao", t.descricao, LIMITES.descricaoTopico);
      checarFontes(p, t.id, t.fontes, materiais);
    }
  }

  const topicos = todosTopicos(ementa);
  for (let i = 0; i < topicos.length; i++) {
    for (let j = i + 1; j < topicos.length; j++) {
      if (similaridade(topicos[i].titulo, topicos[j].titulo) >= 0.8) {
        p.push({
          nivel: "aviso",
          alvo: topicos[j].id,
          regra: "topico_duplicado",
          mensagem: `"${topicos[j].titulo}" parece repetir "${topicos[i].titulo}" (${topicos[i].id}).`,
        });
      }
    }
  }

  const tamanhos = ementa.modulos.map((m) => m.topicos.length).filter((n) => n > 0);
  if (tamanhos.length > 1 && Math.max(...tamanhos) / Math.min(...tamanhos) > 4) {
    p.push({ nivel: "aviso", alvo: "ementa", regra: "desbalanceada", mensagem: "Módulos muito desbalanceados em número de tópicos." });
  }

  if (ementaComVinculos(ementa)) {
    const cob = verificarCoberturaCompetencias(ementa);
    for (const r of cob.referenciasInvalidas) {
      p.push({
        nivel: "erro",
        alvo: r.topico_id,
        regra: "competencia_inexistente",
        mensagem: `Aponta para a competência ${r.competencia_id}, que não existe na visão geral.`,
      });
    }
    for (const k of cob.competenciasSemTopico) {
      const c = ementa.competencias.find((x) => x.id === k)!;
      p.push({ nivel: "erro", alvo: k, regra: "competencia_sem_topico", mensagem: `Nenhum tópico desenvolve a competência ${k} "${c.texto}".` });
    }
    for (const t of cob.topicosSemCompetencia) {
      p.push({ nivel: "aviso", alvo: t, regra: "topico_sem_competencia", mensagem: "Tópico não está ligado a nenhuma competência." });
    }
  }
  return p;
}

// ─────────────────────────── Skill cards ───────────────────────────

export interface CoberturaCards {
  percentual: number;
  totalTopicos: number;
  matriz: Record<string, string[]>;
  topicosSemCard: { id: string; titulo: string; modulo_id: string }[];
  cardsSemTopico: string[];
  referenciasInvalidas: { card_id: string; topico_id: string }[];
  topicosSobrecobertos: { id: string; cards: string[] }[];
}

export function verificarCoberturaCards(ementa: Ementa, draft: CardsDraft): CoberturaCards {
  const topicos = todosTopicos(ementa);
  const ids = new Set(topicos.map((t) => t.id));
  const matriz: Record<string, string[]> = Object.fromEntries(topicos.map((t) => [t.id, []]));
  const cardsSemTopico: string[] = [];
  const referenciasInvalidas: CoberturaCards["referenciasInvalidas"] = [];

  for (const c of draft.cards) {
    const validos = c.topico_ids.filter((tid) => ids.has(tid));
    if (validos.length === 0) cardsSemTopico.push(c.id);
    for (const tid of c.topico_ids) {
      if (ids.has(tid)) matriz[tid].push(c.id);
      else referenciasInvalidas.push({ card_id: c.id, topico_id: tid });
    }
  }
  const topicosSemCard = topicos.filter((t) => matriz[t.id].length === 0).map(({ id, titulo, modulo_id }) => ({ id, titulo, modulo_id }));
  const topicosSobrecobertos = topicos.filter((t) => matriz[t.id].length > 4).map((t) => ({ id: t.id, cards: matriz[t.id] }));
  const cobertos = topicos.length - topicosSemCard.length;
  return {
    percentual: topicos.length ? Math.round((cobertos / topicos.length) * 100) : 0,
    totalTopicos: topicos.length,
    matriz,
    topicosSemCard,
    cardsSemTopico,
    referenciasInvalidas,
    topicosSobrecobertos,
  };
}

export function validarCard(card: SkillCard, materiais: Set<string> | null): Pendencia[] {
  const p: Pendencia[] = [];
  checarTamanho(p, card.id, "titulo", card.titulo, { max: LIMITES.tituloCurto });
  checarTamanho(p, card.id, "conceito", card.conceito, LIMITES.conceitoCard);
  checarTamanho(p, card.id, "exemplo", card.exemplo, LIMITES.exemploCard);
  const pk = card.pontos_chave.filter((x) => x.trim());
  if (pk.length < LIMITES.pontosChave.min || pk.length > LIMITES.pontosChave.max) {
    p.push({
      nivel: "erro",
      alvo: card.id,
      regra: "pontos_chave_qtd",
      mensagem: `Card precisa de ${LIMITES.pontosChave.min} a ${LIMITES.pontosChave.max} pontos-chave (tem ${pk.length}).`,
    });
  }
  for (const ponto of pk) {
    if (ponto.length > 160) {
      p.push({ nivel: "aviso", alvo: card.id, regra: "ponto_chave_longo", mensagem: `Ponto-chave longo demais: "${ponto.slice(0, 40)}…".` });
    }
  }
  if (card.topico_ids.length === 0) {
    p.push({ nivel: "erro", alvo: card.id, regra: "card_sem_topico", mensagem: "Card não está ligado a nenhum tópico da ementa." });
  }
  checarFontes(p, card.id, card.fontes, materiais);
  return p;
}

export function validarCards(ementa: Ementa, draft: CardsDraft, materiaisIds?: string[]): Pendencia[] {
  const materiais = materiaisIds ? new Set(materiaisIds) : null;
  const p: Pendencia[] = [];
  checarIdsUnicos(
    p,
    draft.cards.map((c) => c.id),
    "Card",
  );
  for (const c of draft.cards) p.push(...validarCard(c, materiais));

  const cob = verificarCoberturaCards(ementa, draft);
  for (const t of cob.topicosSemCard) {
    p.push({ nivel: "erro", alvo: t.id, regra: "topico_sem_card", mensagem: `Tópico "${t.titulo}" não é coberto por nenhum card.` });
  }
  for (const r of cob.referenciasInvalidas) {
    p.push({ nivel: "erro", alvo: r.card_id, regra: "topico_inexistente", mensagem: `Card referencia tópico inexistente ${r.topico_id}.` });
  }
  for (let i = 0; i < draft.cards.length; i++) {
    for (let j = i + 1; j < draft.cards.length; j++) {
      if (similaridade(draft.cards[i].titulo, draft.cards[j].titulo) >= 0.8) {
        p.push({
          nivel: "aviso",
          alvo: draft.cards[j].id,
          regra: "card_duplicado",
          mensagem: `"${draft.cards[j].titulo}" parece repetir o card ${draft.cards[i].id}.`,
        });
      }
    }
  }
  return p;
}

// ────────────────────────────── Aulas ──────────────────────────────

export function validarQuiz(q: BlocoQuiz, alvo = q.id): Pendencia[] {
  const p: Pendencia[] = [];
  checarTamanho(p, alvo, "pergunta", q.pergunta, LIMITES.pergunta);
  if (q.opcoes.length !== 4) {
    p.push({ nivel: "erro", alvo, regra: "quiz_4_opcoes", mensagem: `Quiz precisa de exatamente 4 opções (tem ${q.opcoes.length}).` });
  }
  const corretas = q.opcoes.filter((o) => o.correta).length;
  if (corretas !== 1) {
    p.push({ nivel: "erro", alvo, regra: "quiz_1_correta", mensagem: `Quiz precisa de exatamente 1 opção correta (tem ${corretas}).` });
  }
  const textos = new Set<string>();
  for (const [i, o] of q.opcoes.entries()) {
    checarTamanho(p, alvo, `opcao_${i + 1}`, o.texto, { max: LIMITES.opcao.max });
    checarTamanho(p, alvo, `feedback_${i + 1}`, o.feedback, LIMITES.feedback);
    const n = normalizar(o.texto);
    if (textos.has(n)) p.push({ nivel: "erro", alvo, regra: "opcao_repetida", mensagem: "Há opções repetidas." });
    textos.add(n);
    if (FRASES_PROIBIDAS.some((f) => n.includes(normalizar(f)))) {
      p.push({ nivel: "erro", alvo, regra: "opcao_proibida", mensagem: `Evite opções como "${o.texto}".` });
    }
  }
  const correta = q.opcoes.find((o) => o.correta);
  const erradas = q.opcoes.filter((o) => !o.correta);
  if (correta && erradas.length) {
    const media = erradas.reduce((s, o) => s + o.texto.length, 0) / erradas.length;
    if (media > 0 && correta.texto.length > media * 1.8 && correta.texto.length - media > 25) {
      p.push({
        nivel: "aviso",
        alvo,
        regra: "correta_destoa",
        mensagem: "A opção correta é bem mais longa que as outras — isso entrega a resposta.",
      });
    }
  }
  return p;
}

// ─────────────────────────── Desafio óbvio ───────────────────────────

/** Minúsculas, sem acentos e sem pontuação: para comparar trechos de texto. */
function normalizarComparacao(t: string): string {
  return ` ${t
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;
}

const palavras = (t: string) => t.trim().split(/\s+/).filter(Boolean);

/**
 * Eco: a correta tem ao menos 60% das palavras na explicação e 40 pontos a mais que os distratores. Só vale
 * para respostas com 2+ palavras de conteúdo: num termo único ("Díclina") a palavra está no texto por
 * natureza, e o que decide se a pergunta é boba é o enunciado — isso fica com o revisor.
 */
const ECO_MIN_CORRETA = 0.6;
const ECO_MIN_DIFERENCA = 0.4;
const ECO_MIN_PALAVRAS = 2;

/** Palavras de conteúdo (4+ letras) de um texto já normalizado. */
const palavrasConteudo = (t: string) => palavras(t).filter((w) => w.length >= 4);

/** Fração das palavras de conteúdo das opções que aparecem no texto (null se não há nenhuma). */
function cobertura(opcoes: string[], texto: Set<string>): number | null {
  const ws = opcoes.flatMap((o) => palavrasConteudo(normalizarComparacao(o)));
  return ws.length ? ws.filter((w) => texto.has(w)).length / ws.length : null;
}

/**
 * O desafio se responde copiando a explicação (todo o texto da aula antes dele)? Quiz: a opção correta (com
 * 2+ palavras) aparece igual no texto, ou é a única que repete as palavras dele (eco: dá para acertar
 * reconhecendo palavras). Completar: a lacuna e as palavras que a antecedem na frase (3+ palavras no total)
 * aparecem iguais no texto. Heurística barata; o revisor pedagógico vai além.
 */
export function desafioObvio(textoAnterior: string, bloco: Bloco): boolean {
  const antes = normalizarComparacao(textoAnterior);
  if (antes.trim().length < 20) return false;
  if (bloco.tipo === "quiz") {
    const correta = bloco.opcoes.find((o) => o.correta);
    if (!correta) return false;
    const c = normalizarComparacao(correta.texto);
    if (palavras(c).length >= 2 && c.trim().length >= 12 && antes.includes(c)) return true;
    if (palavrasConteudo(c).length < ECO_MIN_PALAVRAS) return false;
    const texto = new Set(palavras(antes));
    const cc = cobertura([correta.texto], texto);
    if (cc === null || cc < ECO_MIN_CORRETA) return false;
    const ce =
      cobertura(
        bloco.opcoes.filter((o) => !o.correta).map((o) => o.texto),
        texto,
      ) ?? 0;
    return cc - ce >= ECO_MIN_DIFERENCA;
  }
  if (bloco.tipo === "completar") {
    return bloco.lacunas.some((l, i) => {
      const [anterior] = bloco.texto.split(`[[${i + 1}]]`);
      if (anterior === undefined || anterior === bloco.texto) return false;
      const contexto = palavras(normalizarComparacao(anterior.replace(/\[\[\d+\]\]/g, " "))).slice(-3);
      const trecho = normalizarComparacao([...contexto, l.resposta].join(" "));
      return palavras(trecho).length >= 3 && antes.includes(trecho);
    });
  }
  return false;
}

export function validarAula(aula: Aula, cardsIds: Set<string> | null, modulosIds: Set<string> | null): Pendencia[] {
  const p: Pendencia[] = [];
  const a = aula.id;
  checarTamanho(p, a, "titulo", aula.titulo, { max: LIMITES.tituloCurto });
  checarTamanho(p, a, "objetivo", aula.objetivo, { min: 20, max: 300 }, "aviso");
  if (modulosIds && !modulosIds.has(aula.modulo_id)) {
    p.push({ nivel: "erro", alvo: a, regra: "modulo_inexistente", mensagem: `Aula aponta para módulo inexistente ${aula.modulo_id}.` });
  }
  if (aula.skill_card_ids.length < LIMITES.cardsPorAula.min || aula.skill_card_ids.length > LIMITES.cardsPorAula.max) {
    p.push({
      nivel: "aviso",
      alvo: a,
      regra: "cards_por_aula",
      mensagem: `Aula deve combinar de ${LIMITES.cardsPorAula.min} a ${LIMITES.cardsPorAula.max} Cards de Conhecimento (tem ${aula.skill_card_ids.length}).`,
    });
  }
  if (cardsIds) {
    for (const c of aula.skill_card_ids) {
      if (!cardsIds.has(c)) p.push({ nivel: "erro", alvo: a, regra: "card_inexistente", mensagem: `Aula usa card inexistente ${c}.` });
    }
  }

  const b = aula.blocos;
  checarIdsUnicos(
    p,
    b.map((x) => x.id),
    "Bloco",
  );
  if (b.length === 0) {
    p.push({ nivel: "erro", alvo: a, regra: "aula_sem_blocos", mensagem: "Aula ainda não tem blocos." });
    return p;
  }
  if (b.length < LIMITES.blocosPorAulaAceito.min || b.length > LIMITES.blocosPorAula.max) {
    p.push({
      nivel: "erro",
      alvo: a,
      regra: "blocos_qtd",
      mensagem: `Aula deve ter de ${LIMITES.blocosPorAula.min} a ${LIMITES.blocosPorAula.max} blocos (tem ${b.length}).`,
    });
  } else if (b.length < LIMITES.blocosPorAula.min) {
    p.push({
      nivel: "aviso",
      alvo: a,
      regra: "aula_curta",
      mensagem: `Use de ${LIMITES.blocosPorAula.min} a ${LIMITES.blocosPorAula.max} blocos (tem ${b.length}): dê mais espaço à explicação.`,
    });
  }
  const textosAntes = b.findIndex((x) => x.tipo !== "texto");
  if (textosAntes >= 0 && textosAntes < LIMITES.explicacao.min && b[0].tipo === "texto") {
    p.push({
      nivel: "aviso",
      alvo: b[textosAntes].id,
      regra: "explicacao_curta",
      mensagem: `A explicação tem só ${textosAntes} bloco(s) de texto antes do primeiro desafio — use de ${LIMITES.explicacao.min} a ${LIMITES.explicacao.max}.`,
    });
  }
  if (b[0].tipo !== "texto") {
    p.push({ nivel: "erro", alvo: a, regra: "abre_com_texto", mensagem: "A aula deve abrir com um bloco de texto." });
  }
  const corrigiveis = b.filter(ehCorrigivel);
  if (corrigiveis.length < LIMITES.desafiosPorAula.min) {
    p.push({
      nivel: "erro",
      alvo: a,
      regra: "poucos_desafios",
      mensagem: `A aula precisa de pelo menos ${LIMITES.desafiosPorAula.min} desafios corrigíveis (quiz, completar ou ordenar) — a pergunta aberta não conta.`,
    });
  }
  const abertas = b.filter((x) => x.tipo === "aberta");
  if (abertas.length > LIMITES.abertasPorAula.max) {
    p.push({
      nivel: "erro",
      alvo: a,
      regra: "abertas_demais",
      mensagem: `Use no máximo ${LIMITES.abertasPorAula.max} pergunta aberta por aula (tem ${abertas.length}).`,
    });
  }
  let seqTexto = 0;
  let seqDesafio = 0;
  for (const x of b) {
    seqTexto = x.tipo === "texto" ? seqTexto + 1 : 0;
    seqDesafio = x.tipo !== "texto" ? seqDesafio + 1 : 0;
    if (seqTexto === LIMITES.explicacao.max + 1) {
      p.push({
        nivel: "aviso",
        alvo: x.id,
        regra: "texto_seguido",
        mensagem: `${seqTexto} blocos de texto seguidos — a explicação deve ter no máximo ${LIMITES.explicacao.max}.`,
      });
    }
    if (seqDesafio === LIMITES.desafiosSeguidos.max + 1) {
      p.push({
        nivel: "aviso",
        alvo: x.id,
        regra: "desafio_seguido",
        mensagem: `${seqDesafio} desafios seguidos — a prática deve ter no máximo ${LIMITES.desafiosSeguidos.max}.`,
      });
    }
  }
  // Todo texto da aula até o desafio: o aluno pode rolar para cima, então copiar de qualquer bloco anterior é fácil.
  let explicacao = "";
  for (const x of b) {
    if (x.tipo === "texto") explicacao += ` ${x.titulo ?? ""} ${x.texto} ${x.dica ?? ""}`;
    else if (desafioObvio(explicacao, x)) {
      p.push({
        nivel: "aviso",
        alvo: x.id,
        regra: "desafio_obvio",
        mensagem:
          x.tipo === "quiz"
            ? "A resposta correta está copiada da explicação, ou é a única opção que repete as palavras dela: o aluno acerta sem pensar. Leve a pergunta para um caso novo ou tire os distratores dos conceitos da própria explicação."
            : "A lacuna repete uma frase da explicação: o aluno completa sem pensar. Monte uma frase nova (um caso, uma aplicação).",
      });
    }
  }
  for (const x of b) {
    switch (x.tipo) {
      case "texto":
        checarTamanho(p, x.id, "texto", x.texto, LIMITES.textoBloco);
        if (x.dica && x.dica.length > 160) {
          p.push({ nivel: "aviso", alvo: x.id, regra: "dica_longa", mensagem: "A dica deve ter no máximo 160 caracteres." });
        }
        continue;
      case "quiz":
        p.push(...validarQuiz(x));
        break;
      case "completar":
        p.push(...validarCompletar(x));
        break;
      case "ordenar":
        p.push(...validarOrdenar(x));
        break;
      case "aberta":
        p.push(...validarAberta(x));
        break;
    }
    if (cardsIds && !cardsIds.has(x.skill_card_id)) {
      p.push({ nivel: "erro", alvo: x.id, regra: "desafio_card_inexistente", mensagem: `Desafio ligado a card inexistente ${x.skill_card_id}.` });
    } else if (!aula.skill_card_ids.includes(x.skill_card_id)) {
      p.push({
        nivel: "aviso",
        alvo: x.id,
        regra: "desafio_fora_da_aula",
        mensagem: `Desafio avalia o card ${x.skill_card_id}, que não faz parte desta aula.`,
      });
    }
  }
  for (const c of aula.skill_card_ids) {
    if (!corrigiveis.some((q) => q.skill_card_id === c)) {
      p.push({ nivel: "aviso", alvo: a, regra: "card_sem_desafio", mensagem: `O card ${c} não é avaliado por nenhum desafio corrigível nesta aula.` });
    }
  }
  const quizzes = b.filter((x): x is BlocoQuiz => x.tipo === "quiz");
  if (quizzes.length >= 3) {
    const posicoes = new Set(quizzes.map((q) => q.opcoes.findIndex((o) => o.correta)));
    if (posicoes.size === 1) {
      p.push({ nivel: "aviso", alvo: a, regra: "correta_mesma_posicao", mensagem: "A opção correta está sempre na mesma posição — varie." });
    }
  }
  return p;
}

export function validarCompletar(c: BlocoCompletar, alvo = c.id): Pendencia[] {
  const p: Pendencia[] = [];
  checarTamanho(p, alvo, "texto", c.texto, LIMITES.textoCompletar);
  checarTamanho(p, alvo, "explicacao", c.explicacao, LIMITES.feedback);
  const n = c.lacunas.length;
  if (n < LIMITES.lacunas.min || n > LIMITES.lacunas.max) {
    p.push({ nivel: "erro", alvo, regra: "lacunas_qtd", mensagem: `Use de ${LIMITES.lacunas.min} a ${LIMITES.lacunas.max} lacunas (tem ${n}).` });
  }
  const marcas = marcadoresLacuna(c.texto);
  if (marcas.length !== n || marcas.some((m, i) => m !== i + 1)) {
    const esperado = Array.from({ length: Math.max(n, 1) }, (_, i) => `[[${i + 1}]]`).join(", ");
    p.push({
      nivel: "erro",
      alvo,
      regra: "lacunas_marcadores",
      mensagem: `O texto deve marcar as lacunas como ${esperado}, em ordem e uma vez cada (encontrei ${marcas.length} marcador(es) para ${n} lacuna(s)).`,
    });
  }
  if (c.distratores.length < LIMITES.distratores.min || c.distratores.length > LIMITES.distratores.max) {
    p.push({
      nivel: "erro",
      alvo,
      regra: "distratores_qtd",
      mensagem: `Use de ${LIMITES.distratores.min} a ${LIMITES.distratores.max} distratores (tem ${c.distratores.length}).`,
    });
  }
  const vistas = new Set<string>();
  for (const [i, o] of [...c.lacunas.map((l) => l.resposta), ...c.distratores].entries()) {
    checarTamanho(p, alvo, `opcao_${i + 1}`, o, { min: 1, max: LIMITES.palavraLacuna.max });
    const k = normalizar(o);
    if (vistas.has(k)) p.push({ nivel: "erro", alvo, regra: "opcao_repetida", mensagem: `A opção "${o}" aparece mais de uma vez.` });
    vistas.add(k);
  }
  return p;
}

export function validarOrdenar(o: BlocoOrdenar, alvo = o.id): Pendencia[] {
  const p: Pendencia[] = [];
  checarTamanho(p, alvo, "instrucao", o.instrucao, LIMITES.pergunta);
  checarTamanho(p, alvo, "explicacao", o.explicacao, LIMITES.feedback);
  const n = o.passos.length;
  if (n < LIMITES.passosOrdenar.min || n > LIMITES.passosOrdenar.max) {
    p.push({ nivel: "erro", alvo, regra: "passos_qtd", mensagem: `Use de ${LIMITES.passosOrdenar.min} a ${LIMITES.passosOrdenar.max} passos (tem ${n}).` });
  }
  const vistos = new Set<string>();
  for (const [i, passo] of o.passos.entries()) {
    checarTamanho(p, alvo, `passo_${i + 1}`, passo, { min: 3, max: LIMITES.passo.max });
    const k = normalizar(passo);
    if (vistos.has(k)) p.push({ nivel: "erro", alvo, regra: "passo_repetido", mensagem: "Há passos repetidos." });
    vistos.add(k);
  }
  return p;
}

export function validarAberta(q: BlocoAberta, alvo = q.id): Pendencia[] {
  const p: Pendencia[] = [];
  const g = q.gabarito;
  checarTamanho(p, alvo, "pergunta", q.pergunta, LIMITES.perguntaAberta);
  if (q.dica && q.dica.length > 160) p.push({ nivel: "aviso", alvo, regra: "dica_longa", mensagem: "A dica deve ter no máximo 160 caracteres." });
  checarTamanho(p, alvo, "resposta_modelo", g.resposta_modelo, LIMITES.respostaModelo);
  const n = g.criterios.length;
  if (n < LIMITES.criteriosAberta.min || n > LIMITES.criteriosAberta.max) {
    p.push({
      nivel: "erro",
      alvo,
      regra: "criterios_qtd",
      mensagem: `O gabarito precisa de ${LIMITES.criteriosAberta.min} a ${LIMITES.criteriosAberta.max} critérios (tem ${n}).`,
    });
  }
  if (!g.criterios.some((c) => c.essencial)) {
    p.push({ nivel: "erro", alvo, regra: "criterio_essencial", mensagem: "Marque pelo menos um critério do gabarito como essencial." });
  }
  for (const [i, c] of g.criterios.entries()) checarTamanho(p, alvo, `criterio_${i + 1}`, c.descricao, { min: 10, max: LIMITES.criterio.max });
  if (g.erros_comuns.length > LIMITES.itensGabarito.max) {
    p.push({ nivel: "aviso", alvo, regra: "erros_comuns_qtd", mensagem: `Liste no máximo ${LIMITES.itensGabarito.max} erros comuns.` });
  }
  if (g.alertas_criticos.length > LIMITES.itensGabarito.max) {
    p.push({ nivel: "aviso", alvo, regra: "alertas_qtd", mensagem: `Liste no máximo ${LIMITES.itensGabarito.max} alertas críticos.` });
  }
  return p;
}

export interface CoberturaAulas {
  percentualCards: number;
  percentualAvaliados: number;
  cardsSemAula: string[];
  cardsSemDesafio: string[];
  modulosSemAula: string[];
  cardsEmVariasAulas: { card: string; aulas: string[] }[];
}

export function verificarCoberturaAulas(ementa: Ementa, cards: CardsDraft, draft: AulasDraft): CoberturaAulas {
  const usoCards = new Map<string, string[]>();
  const avaliados = new Set<string>();
  for (const aula of draft.aulas) {
    for (const c of aula.skill_card_ids) usoCards.set(c, [...(usoCards.get(c) ?? []), aula.id]);
    for (const b of aula.blocos) if (ehCorrigivel(b)) avaliados.add(b.skill_card_id);
  }
  const ids = cards.cards.map((c) => c.id);
  const cardsSemAula = ids.filter((c) => !usoCards.has(c));
  const cardsSemDesafio = ids.filter((c) => !avaliados.has(c));
  const modulosComAula = new Set(draft.aulas.map((a) => a.modulo_id));
  return {
    percentualCards: ids.length ? Math.round(((ids.length - cardsSemAula.length) / ids.length) * 100) : 0,
    percentualAvaliados: ids.length ? Math.round(((ids.length - cardsSemDesafio.length) / ids.length) * 100) : 0,
    cardsSemAula,
    cardsSemDesafio,
    modulosSemAula: ementa.modulos.filter((m) => !modulosComAula.has(m.id)).map((m) => m.id),
    cardsEmVariasAulas: [...usoCards.entries()].filter(([, a]) => a.length > 1).map(([card, aulas]) => ({ card, aulas })),
  };
}

export function validarAulas(ementa: Ementa, cards: CardsDraft, draft: AulasDraft, opts: { idsCardsValidos?: Set<string> } = {}): Pendencia[] {
  const p: Pendencia[] = [];
  const cardsIds = opts.idsCardsValidos ?? new Set(cards.cards.map((c) => c.id));
  const modulosIds = new Set(ementa.modulos.map((m) => m.id));
  checarIdsUnicos(
    p,
    draft.aulas.map((a) => a.id),
    "Aula",
  );
  checarIdsUnicos(
    p,
    draft.aulas.flatMap((a) => a.blocos.map((b) => b.id)),
    "Bloco",
  );
  for (const a of draft.aulas) p.push(...validarAula(a, cardsIds, modulosIds));
  const cob = verificarCoberturaAulas(ementa, cards, draft);
  for (const c of cob.cardsSemAula) p.push({ nivel: "erro", alvo: c, regra: "card_sem_aula", mensagem: `O card ${c} não está em nenhuma aula.` });
  for (const c of cob.cardsSemDesafio) {
    if (!cob.cardsSemAula.includes(c)) {
      p.push({
        nivel: "erro",
        alvo: c,
        regra: "card_sem_desafio",
        mensagem: `O card ${c} não é avaliado por nenhum desafio corrigível (quiz, completar ou ordenar).`,
      });
    }
  }
  return p;
}

export function contarPendencias(p: Pendencia[]) {
  return { erros: p.filter((x) => x.nivel === "erro").length, avisos: p.filter((x) => x.nivel === "aviso").length };
}
