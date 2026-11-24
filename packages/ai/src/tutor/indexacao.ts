import { type ConteudoTrilha, estimarTokens, montarMapa, montarSecoes, type TrechoTutor } from "./trechos";
import { custoVoyageUsd, embedSecoes, modeloEmbedding, vetorParaTexto } from "./voyage";

export interface LinhaTrecho extends TrechoTutor {
  secao_hash: string;
  ordem: number;
  embedding: string | null;
  modelo_embedding: string | null;
}

export interface EstadoIndice {
  status: "pendente" | "indexando" | "pronto" | "erro";
  mapa?: string | null;
  mapa_tokens?: number | null;
  modelo_embedding?: string | null;
  trechos?: number;
  tokens?: number;
  tokens_embedding?: number;
  erro?: string | null;
  indexado_em?: string | null;
}

/** Persistência do índice do tutor. Implementado sobre o Postgres em @edu/db (ArmazemTutorDb). */
export interface ArmazemTutor {
  carregarConteudo(trilhaId: string): Promise<ConteudoTrilha>;
  /** Hashes das seções já indexadas (com embedding) na trilha. */
  hashesIndexados(trilhaId: string): Promise<Set<string>>;
  /** Hashes de todas as seções da trilha, com ou sem embedding. */
  hashesTodos(trilhaId: string): Promise<Set<string>>;
  inserirTrechos(trilhaId: string, linhas: LinhaTrecho[]): Promise<void>;
  removerSecoes(trilhaId: string, hashes: string[]): Promise<number>;
  /** Remove as seções da trilha cujo hash não está em `manter`. Devolve quantos trechos saíram. */
  removerSecoesExceto(trilhaId: string, manter: string[]): Promise<number>;
  marcarIndice(trilhaId: string, estado: EstadoIndice): Promise<void>;
}

export interface ResultadoIndexacao {
  secoes: number;
  secoesNovas: number;
  trechos: number;
  trechosNovos: number;
  trechosRemovidos: number;
  tokensConteudo: number;
  tokensEmbedding: number;
  custoUsd: number;
  ms: number;
}

/**
 * Reindexa a trilha de forma incremental e idempotente: recalcula as seções, gera embedding só das
 * seções novas ou alteradas (pelo hash), insere e então apaga as obsoletas — a busca nunca fica vazia
 * no meio do processo. Pode ser chamada a qualquer momento (material novo, publicação, botão).
 */
export async function reindexarTrilha(
  armazem: ArmazemTutor,
  trilhaId: string,
  /** semEmbedding: indexa só o texto (busca por palavras). Uma reindexação normal depois completa os vetores. */
  opts: { signal?: AbortSignal; log?: (msg: string) => void; semEmbedding?: boolean } = {},
): Promise<ResultadoIndexacao> {
  const inicio = Date.now();
  const log = opts.log ?? (() => {});
  await armazem.marcarIndice(trilhaId, { status: "indexando", erro: null });
  try {
    const modelo = modeloEmbedding();
    const conteudo = await armazem.carregarConteudo(trilhaId);
    const secoes = montarSecoes(conteudo, modelo);
    const mapa = montarMapa(conteudo);
    const todos = await armazem.hashesTodos(trilhaId);
    const existentes = opts.semEmbedding ? todos : await armazem.hashesIndexados(trilhaId);
    const novas = secoes.filter((s) => !existentes.has(s.hash));
    log(`${secoes.length} seções (${novas.length} novas, alteradas ou sem vetor)`);

    let tokensEmbedding = 0;
    if (novas.length && opts.semEmbedding) {
      await armazem.inserirTrechos(
        trilhaId,
        novas.flatMap((s) => s.trechos.map((t, j) => ({ ...t, secao_hash: s.hash, ordem: j, embedding: null, modelo_embedding: null }))),
      );
    } else if (novas.length) {
      const { vetores, tokens } = await embedSecoes(
        novas.map((s) => s.trechos.map((t) => `${t.caminho}\n${t.texto}`)),
        novas.map((s) => s.trechos.reduce((n, t) => n + t.tokens, 0)),
        { signal: opts.signal },
      );
      tokensEmbedding = tokens;
      const linhas = novas.flatMap((s, i) =>
        s.trechos.map((t, j) => ({ ...t, secao_hash: s.hash, ordem: j, embedding: vetorParaTexto(vetores[i][j]), modelo_embedding: modelo })),
      );
      // Seções já gravadas só com texto são substituídas pela versão com vetor (depois do embedding:
      // se o Voyage falhar, a busca por palavras continua funcionando).
      const semVetor = novas.map((s) => s.hash).filter((h) => todos.has(h));
      if (semVetor.length) await armazem.removerSecoes(trilhaId, semVetor);
      await armazem.inserirTrechos(trilhaId, linhas);
      log(`${linhas.length} trechos inseridos (${tokens} tokens de embedding)`);
    }
    const removidos = await armazem.removerSecoesExceto(
      trilhaId,
      secoes.map((s) => s.hash),
    );

    const trechos = secoes.flatMap((s) => s.trechos);
    const tokensConteudo = trechos.reduce((n, t) => n + t.tokens, 0);
    await armazem.marcarIndice(trilhaId, {
      status: "pronto",
      mapa,
      mapa_tokens: estimarTokens(mapa),
      modelo_embedding: opts.semEmbedding ? null : modelo,
      trechos: trechos.length,
      tokens: tokensConteudo,
      tokens_embedding: tokensEmbedding,
      erro: null,
      indexado_em: new Date().toISOString(),
    });
    return {
      secoes: secoes.length,
      secoesNovas: novas.length,
      trechos: trechos.length,
      trechosNovos: novas.reduce((n, s) => n + s.trechos.length, 0),
      trechosRemovidos: removidos,
      tokensConteudo,
      tokensEmbedding,
      custoUsd: custoVoyageUsd(modelo, tokensEmbedding),
      ms: Date.now() - inicio,
    };
  } catch (e) {
    await armazem.marcarIndice(trilhaId, { status: "erro", erro: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}
