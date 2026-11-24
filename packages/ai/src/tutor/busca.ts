import type { OrigemTrecho } from "./trechos";
import { custoVoyageUsd, embedConsulta, reordenar, vetorParaTexto } from "./voyage";

export type ModoBusca = "hibrida" | "lexica" | "semantica";

/**
 * Relevância (reordenação) abaixo da qual a base provavelmente não responde a pergunta. Preliminar:
 * com rerank-3-lite, perguntas com resposta ficaram com p10 ≈ 0,76–0,80 e perguntas fora da base com
 * p90 ≈ 0,69–0,71 (eval-reports/tutor-busca-hibrida-v1 e -estresse-1411). Recalibrar com perguntas reais.
 */
export const RELEVANCIA_MINIMA = 0.72;

export interface CandidatoTrecho {
  id: number;
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
  pos_lexica: number | null;
  pos_semantica: number | null;
  score: number;
}

export interface TrechoRecuperado extends CandidatoTrecho {
  /** Relevância dada pela reordenação (null quando não houve reordenação). */
  relevancia: number | null;
}

/** Busca no índice. Implementado sobre o Postgres em @edu/db (função tutor_buscar). */
export interface ConsultorTutor {
  buscar(p: { trilhaId: string; consulta: string; embedding: string | null; limite: number; modo: ModoBusca }): Promise<CandidatoTrecho[]>;
}

export interface OpcoesBusca {
  modo?: ModoBusca;
  /** Quantos candidatos a busca híbrida traz para a reordenação. */
  candidatos?: number;
  /** Quantos trechos saem no final. */
  final?: number;
  /** Modelo de reordenação, ou false para usar a ordem da fusão (RRF). */
  reordenar?: string | false;
  /** Embedding da pergunta já calculado (a avaliação reaproveita entre configurações). */
  embedding?: number[];
  signal?: AbortSignal;
}

export interface ResultadoBusca {
  trechos: TrechoRecuperado[];
  uso: { tokensEmbedding: number; tokensRerank: number; custoUsd: number };
  ms: { embedding: number; busca: number; rerank: number; total: number };
}

/**
 * Recupera os trechos da trilha mais úteis para a pergunta: busca híbrida (palavras + significado,
 * fundidas por RRF no banco) seguida de reordenação por relevância.
 */
export async function buscarNaTrilha(consultor: ConsultorTutor, trilhaId: string, pergunta: string, opts: OpcoesBusca = {}): Promise<ResultadoBusca> {
  const modo = opts.modo ?? "hibrida";
  const candidatos = opts.candidatos ?? 30;
  const final = opts.final ?? 6;
  const usarRerank = opts.reordenar !== false;
  const t0 = Date.now();

  let embedding: string | null = null;
  let tokensEmbedding = 0;
  let modeloEmb = "";
  if (modo !== "lexica" && opts.embedding) {
    embedding = vetorParaTexto(opts.embedding);
  } else if (modo !== "lexica") {
    const e = await embedConsulta(pergunta, { signal: opts.signal });
    embedding = vetorParaTexto(e.vetor);
    tokensEmbedding = e.tokens;
    modeloEmb = e.modelo;
  }
  const t1 = Date.now();
  const achados = await consultor.buscar({ trilhaId, consulta: pergunta, embedding, limite: usarRerank ? candidatos : final, modo });
  const t2 = Date.now();

  let trechos: TrechoRecuperado[] = achados.slice(0, final).map((c) => ({ ...c, relevancia: null }));
  let tokensRerank = 0;
  let modeloRr = "";
  if (usarRerank && achados.length > 0) {
    const r = await reordenar(
      pergunta,
      achados.map((c) => `${c.caminho}\n${c.texto}`),
      final,
      { modelo: typeof opts.reordenar === "string" ? opts.reordenar : undefined, signal: opts.signal },
    );
    trechos = r.resultados.map((x) => ({ ...achados[x.indice], relevancia: x.score }));
    tokensRerank = r.tokens;
    modeloRr = r.modelo;
  }
  const t3 = Date.now();

  return {
    trechos,
    uso: {
      tokensEmbedding,
      tokensRerank,
      custoUsd: (modeloEmb ? custoVoyageUsd(modeloEmb, tokensEmbedding) : 0) + (modeloRr ? custoVoyageUsd(modeloRr, tokensRerank) : 0),
    },
    ms: { embedding: t1 - t0, busca: t2 - t1, rerank: t3 - t2, total: t3 - t0 },
  };
}
