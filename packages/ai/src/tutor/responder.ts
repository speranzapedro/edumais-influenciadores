import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, capacidades, custoUsd, MODELO_PADRAO, somarUso, type Uso, usoVazio } from "../modelo";
import { buscarNaTrilha, type ConsultorTutor, RELEVANCIA_MINIMA, type TrechoRecuperado } from "./busca";
import { FiltroMarcaGeral, fonteDoTrecho, INSTRUCOES_REESCRITA, instrucoesTutor, montarMensagens, type TrocaHistorico } from "./prompt";

/** Modelo das respostas do tutor (decidido pela avaliação em eval-reports/tutor-respostas-*). */
export const modeloTutor = () => process.env.ANTHROPIC_MODEL_TUTOR || MODELO_PADRAO;
/** A reescrita da pergunta é uma tarefa simples e fica sempre no modelo mais rápido. */
const MODELO_REESCRITA = MODELO_PADRAO;
/** Trocas anteriores enviadas ao modelo (o resto da conversa fica só no banco). */
export const MAX_TROCAS_HISTORICO = 6;
const RESPOSTA_RECUSADA = "Não consigo ajudar com isso por aqui.";

export interface CitacaoTutor {
  trecho_id: number;
  origem: TrechoRecuperado["origem"];
  caminho: string;
  aula_id: string | null;
  material_id: string | null;
  card_id: string | null;
  pagina_inicio: number | null;
  pagina_fim: number | null;
  texto_citado: string;
  /** Trecho da resposta (posições em caracteres) que se apoia nesta fonte. */
  inicio: number;
  fim: number;
}

export interface FimTutor {
  resposta: string;
  citacoes: CitacaoTutor[];
  /** Pergunta usada na busca (reescrita quando há histórico). */
  consulta: string;
  trechos: { id: number; caminho: string; relevancia: number | null; avaliativo: boolean }[];
  confiancaBaixa: boolean;
  /** A resposta usa conhecimento geral (fora do material da trilha) em alguma parte. */
  conhecimentoGeral: boolean;
  recusada: boolean;
  modelo: string;
  uso: { geracao: Uso; reescrita: Uso; voyageTokens: number };
  custo_usd: number;
  ms: { reescrita: number; busca: number; primeiraPalavra: number; total: number };
}

export type EventoTutor = { tipo: "texto"; delta: string } | { tipo: "citacao"; citacao: CitacaoTutor } | ({ tipo: "fim" } & FimTutor);

/** Parâmetros de raciocínio: o Haiku 4.5 responde direto; modelos com thinking adaptativo pensam pouco. */
function paramsModelo(modelo: string) {
  return capacidades(modelo).thinkingAdaptativo ? { thinking: { type: "adaptive" as const }, output_config: { effort: "low" as const } } : {};
}

async function reescrever(historico: TrocaHistorico[], pergunta: string, uso: Uso, signal?: AbortSignal) {
  const conversa = historico
    .slice(-3)
    .map((h) => `Aluno: ${h.pergunta}\nTutor: ${h.resposta.length > 600 ? `${h.resposta.slice(0, 600)}…` : h.resposta}`)
    .join("\n\n");
  try {
    const r = await anthropic().messages.create(
      {
        model: MODELO_REESCRITA,
        // O raciocínio conta no max_tokens: folga para ele, mesmo com a resposta curta.
        max_tokens: 2000,
        ...paramsModelo(MODELO_REESCRITA),
        system: INSTRUCOES_REESCRITA,
        messages: [{ role: "user", content: `${conversa}\n\nÚltima mensagem do aluno: ${pergunta}` }],
      },
      { signal },
    );
    somarUso(uso, r.usage);
    const texto = r.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text.trim();
    return texto && texto.length < 1000 ? texto : pergunta;
  } catch {
    // Sem reescrita a busca ainda funciona com a pergunta original.
    return pergunta;
  }
}

/**
 * Responde a uma pergunta do aluno sobre a trilha: reescreve (se for continuação), busca os trechos,
 * e gera a resposta em streaming com citações nativas (search_result). Não grava nada — quem chama
 * registra a troca (ver registrarTrocaTutor em @edu/db).
 */
export async function* responderTutor(p: {
  consultor: ConsultorTutor;
  trilha: { id: string; titulo: string; mapa: string };
  historico: TrocaHistorico[];
  pergunta: string;
  aulaAtual?: string | null;
  modelo?: string;
  signal?: AbortSignal;
}): AsyncGenerator<EventoTutor> {
  const t0 = Date.now();
  const modelo = p.modelo ?? modeloTutor();
  const historico = p.historico.slice(-MAX_TROCAS_HISTORICO);
  const usoReescrita = usoVazio();
  const consulta = historico.length ? await reescrever(historico, p.pergunta, usoReescrita, p.signal) : p.pergunta;
  const t1 = Date.now();

  const busca = await buscarNaTrilha(p.consultor, p.trilha.id, consulta, { signal: p.signal });
  const melhor = Math.max(0, ...busca.trechos.map((t) => t.relevancia ?? 0));
  const confiancaBaixa = melhor < RELEVANCIA_MINIMA;
  const t2 = Date.now();

  const stream = anthropic().messages.stream(
    {
      model: modelo,
      max_tokens: 4000,
      // Primeiro ponto de cache: instruções + mapa, iguais para todos os alunos da trilha.
      system: [{ type: "text", text: `${instrucoesTutor(p.trilha.titulo)}\n\n# Mapa da trilha\n${p.trilha.mapa}`, cache_control: { type: "ephemeral" } }],
      messages: montarMensagens({ historico, trechos: busca.trechos, pergunta: p.pergunta, confiancaBaixa, aulaAtual: p.aulaAtual }),
      ...paramsModelo(modelo),
    },
    { signal: p.signal },
  );

  const porFonte = new Map(busca.trechos.map((t) => [fonteDoTrecho(t), t]));
  let resposta = "";
  let primeiraPalavra = 0;
  let inicioBloco = 0;
  let pendentes: Anthropic.CitationsSearchResultLocation[] = [];
  const citacoes: CitacaoTutor[] = [];
  const filtro = new FiltroMarcaGeral();

  for await (const ev of stream) {
    if (ev.type === "content_block_start" && ev.content_block.type === "text") {
      inicioBloco = resposta.length;
      pendentes = [];
    } else if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
      const delta = filtro.push(ev.delta.text);
      if (!delta) continue;
      if (!primeiraPalavra) primeiraPalavra = Date.now();
      resposta += delta;
      yield { tipo: "texto", delta };
    } else if (ev.type === "content_block_delta" && ev.delta.type === "citations_delta" && ev.delta.citation.type === "search_result_location") {
      pendentes.push(ev.delta.citation);
    } else if (ev.type === "content_block_stop" && pendentes.length) {
      // A citação vale para o bloco de texto inteiro: emite quando o bloco fecha, com as posições.
      for (const c of pendentes) {
        const t = porFonte.get(c.source) ?? busca.trechos[c.search_result_index];
        if (!t) continue;
        const citacao: CitacaoTutor = {
          trecho_id: t.id,
          origem: t.origem,
          caminho: t.caminho,
          aula_id: t.aula_id,
          material_id: t.material_id,
          card_id: t.card_id,
          pagina_inicio: t.pagina_inicio,
          pagina_fim: t.pagina_fim,
          texto_citado: c.cited_text,
          inicio: inicioBloco,
          fim: resposta.length,
        };
        citacoes.push(citacao);
        yield { tipo: "citacao", citacao };
      }
      pendentes = [];
    }
  }

  const resto = filtro.fim();
  if (resto) {
    resposta += resto;
    yield { tipo: "texto", delta: resto };
  }

  const final = await stream.finalMessage();
  const usoGeracao = usoVazio();
  somarUso(usoGeracao, final.usage);
  const recusada = final.stop_reason === "refusal" || !resposta.trim();
  if (recusada) {
    const extra = resposta ? `\n\n${RESPOSTA_RECUSADA}` : RESPOSTA_RECUSADA;
    resposta += extra;
    yield { tipo: "texto", delta: extra };
  }

  const fim = Date.now();
  yield {
    tipo: "fim",
    resposta: resposta.trim(),
    citacoes,
    consulta,
    trechos: busca.trechos.map((t) => ({ id: t.id, caminho: t.caminho, relevancia: t.relevancia, avaliativo: t.avaliativo })),
    confiancaBaixa,
    conhecimentoGeral: filtro.apareceu,
    recusada,
    modelo,
    uso: { geracao: usoGeracao, reescrita: usoReescrita, voyageTokens: busca.uso.tokensEmbedding + busca.uso.tokensRerank },
    custo_usd: custoUsd(usoGeracao, modelo) + custoUsd(usoReescrita, MODELO_REESCRITA) + busca.uso.custoUsd,
    ms: { reescrita: t1 - t0, busca: t2 - t1, primeiraPalavra: primeiraPalavra ? primeiraPalavra - t0 : fim - t0, total: fim - t0 },
  };
}

/** Fonte como o aluno vê: aula (abre a aula), card ou material do criador (só identificação). */
export interface FonteResposta {
  tipo: "aula" | "card" | "material";
  rotulo: string;
  aulaId: string | null;
}

/** Fontes distintas de uma resposta, na ordem em que foram citadas (no máximo 4). */
export function fontesDaResposta(citacoes: CitacaoTutor[]): FonteResposta[] {
  const fontes = new Map<string, FonteResposta>();
  for (const c of citacoes) {
    const partes = c.caminho.split(" › ");
    let f: FonteResposta;
    if (c.origem === "aula") {
      f = { tipo: "aula", rotulo: partes.find((p) => /^Aula \d+:/.test(p)) ?? partes[partes.length - 1], aulaId: c.aula_id };
    } else if (c.origem === "card") {
      f = { tipo: "card", rotulo: (partes.find((p) => p.startsWith("Card: ")) ?? partes[partes.length - 1]).replace(/^Card: /, ""), aulaId: null };
    } else {
      f = { tipo: "material", rotulo: c.pagina_inicio ? `${partes[0]} · p. ${c.pagina_inicio}` : partes[0], aulaId: null };
    }
    const chave = `${f.tipo}|${f.rotulo}`;
    if (!fontes.has(chave)) fontes.set(chave, f);
  }
  return [...fontes.values()].slice(0, 4);
}
