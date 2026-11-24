import { type ArmazemTutor, type ResultadoIndexacao, reindexarTrilha } from "./indexacao";
import { type ArmazemSugestoes, atualizarSugestoes } from "./sugestoes";

/** Feature flag: com TUTOR_HABILITADO diferente de "true", nenhum gatilho do painel indexa nada. */
export const tutorHabilitado = () => process.env.TUTOR_HABILITADO === "true";

/** Trava de indexação: expira sozinha se o processo morrer no meio. */
export const LOCK_INDEXACAO_MS = 10 * 60_000;
/** Rodadas extras por chamada quando chegam pedidos durante a indexação. */
const MAX_RODADAS = 3;

/** Controle de concorrência da indexação. Implementado sobre o Postgres em @edu/db (ArmazemTutorDb). */
export interface TravaTutor {
  /** O tutor só atende (e só indexa) trilhas publicadas. */
  trilhaPublicada(trilhaId: string): Promise<boolean>;
  /** Registra que a trilha precisa ser (re)indexada. */
  solicitar(trilhaId: string): Promise<void>;
  /** Pega a trava (e consome o pedido pendente). false = outra execução está em andamento. */
  travar(trilhaId: string, expiraMs: number): Promise<boolean>;
  /** Houve novo pedido desde que a trava foi pega? */
  pedidoPendente(trilhaId: string): Promise<boolean>;
  /** Solta a trava sem mexer no resto do estado (usado quando nada foi indexado). */
  destravar(trilhaId: string): Promise<void>;
}

export type ResultadoSincronizacao = { status: "indexada"; rodadas: ResultadoIndexacao[] } | { status: "na_fila" } | { status: "ignorada"; motivo: string };

/**
 * Ponto de entrada dos gatilhos (publicar, material processado/excluído, renomear, botão "reindexar").
 * Garante uma execução por trilha: se outra já está rodando, só deixa o pedido registrado e quem está
 * rodando faz mais uma rodada ao terminar. Erros ficam gravados no índice (status "erro").
 */
export async function sincronizarIndice(
  armazem: ArmazemTutor & TravaTutor & ArmazemSugestoes,
  trilhaId: string,
  opts: { log?: (msg: string) => void; signal?: AbortSignal } = {},
): Promise<ResultadoSincronizacao> {
  if (!(await armazem.trilhaPublicada(trilhaId))) return { status: "ignorada", motivo: "trilha não publicada" };
  await armazem.solicitar(trilhaId);
  if (!(await armazem.travar(trilhaId, LOCK_INDEXACAO_MS))) return { status: "na_fila" };

  const rodadas: ResultadoIndexacao[] = [];
  try {
    do {
      // reindexarTrilha grava "pronto" (ou "erro") ao terminar, o que libera a trava; se houver
      // pedido novo, retrava antes da rodada seguinte.
      if (rodadas.length > 0 && !(await armazem.travar(trilhaId, LOCK_INDEXACAO_MS))) break;
      rodadas.push(await reindexarTrilha(armazem, trilhaId, { log: opts.log, signal: opts.signal }));
    } while (rodadas.length < MAX_RODADAS && (await armazem.pedidoPendente(trilhaId)));
  } catch (e) {
    // reindexarTrilha já gravou status "erro"; só garante que a trava não fica presa.
    await armazem.destravar(trilhaId);
    throw e;
  }
  // Sugestões de perguntas do Edu: falhar aqui não invalida o índice (o chat abre sem sugestões).
  try {
    await atualizarSugestoes(armazem, trilhaId, { signal: opts.signal });
  } catch (e) {
    opts.log?.(`sugestões não atualizadas: ${e instanceof Error ? e.message : String(e)}`);
  }
  return { status: "indexada", rodadas };
}
