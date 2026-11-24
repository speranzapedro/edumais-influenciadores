/**
 * Cliente mínimo da API do Voyage AI (embeddings contextuais e reordenação).
 * A Anthropic não tem modelo de embeddings; o Voyage é o recomendado por ela.
 * Docs: https://docs.voyageai.com/reference/contextualized-embeddings-api
 */

/** Base da API; VOYAGE_API_URL aponta para um servidor falso nos testes de ponta a ponta. */
const api = () => (process.env.VOYAGE_API_URL || "https://api.voyageai.com/v1").replace(/\/$/, "");
export const DIMENSOES = 1024;

export const modeloEmbedding = () => process.env.VOYAGE_MODELO_EMBEDDING || "voyage-context-4";
/** rerank-3-lite: mesmo recall do rerank-3 na avaliação (eval-reports/tutor-busca-hibrida-v1) a 40% do custo. */
export const modeloRerank = () => process.env.VOYAGE_MODELO_RERANK || "rerank-3-lite";

/** US$ por milhão de tokens (docs.voyageai.com/docs/pricing) — só para estimar custo. */
const PRECOS: Record<string, number> = {
  "voyage-context-4": 0.12,
  "voyage-context-3": 0.18,
  "rerank-3": 0.05,
  "rerank-3-lite": 0.02,
  "rerank-2.5": 0.05,
  "rerank-2.5-lite": 0.02,
};
export const custoVoyageUsd = (modelo: string, tokens: number) => ((PRECOS[modelo] ?? 0.12) * tokens) / 1_000_000;

/** Limites por requisição do endpoint contextual (com folga sobre 120K tokens / 16K trechos). */
const LIMITE_LOTE = { tokens: 90_000, trechos: 12_000, entradas: 1_000 };

function chave() {
  const k = process.env.VOYAGE_API_KEY;
  if (!k) throw new Error("Defina VOYAGE_API_KEY no .env.local da raiz do monorepo.");
  return k;
}

async function chamar<T>(rota: string, corpo: unknown, signal?: AbortSignal): Promise<T> {
  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch(`${api()}/${rota}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave()}`, "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      signal,
    });
    if (r.ok) return (await r.json()) as T;
    const texto = await r.text().catch(() => "");
    if ((r.status === 429 || r.status >= 500) && tentativa < 4) {
      const espera = Number(r.headers.get("retry-after")) * 1000 || 1000 * 2 ** tentativa;
      await new Promise((ok) => setTimeout(ok, espera));
      continue;
    }
    throw new Error(`[voyage] ${rota} ${r.status}: ${texto.slice(0, 300)}`);
  }
}

interface RespostaContextual {
  data: { index: number; data: { index: number; embedding: number[] }[] }[];
  usage: { total_tokens: number };
}

/**
 * Embeddings contextuais: cada seção é uma lista de trechos e cada trecho é codificado "enxergando"
 * a seção inteira. Divide em lotes dentro dos limites da API. `tokensEstimados[i]` é da seção i.
 */
export async function embedSecoes(
  secoes: string[][],
  tokensEstimados: number[],
  opts: { signal?: AbortSignal } = {},
): Promise<{ vetores: number[][][]; tokens: number; modelo: string }> {
  const modelo = modeloEmbedding();
  const vetores: number[][][] = new Array(secoes.length);
  let tokens = 0;
  let i = 0;
  while (i < secoes.length) {
    const lote: number[] = [];
    let t = 0;
    let n = 0;
    while (
      i < secoes.length &&
      lote.length < LIMITE_LOTE.entradas &&
      (lote.length === 0 || (t + tokensEstimados[i] <= LIMITE_LOTE.tokens && n + secoes[i].length <= LIMITE_LOTE.trechos))
    ) {
      lote.push(i);
      t += tokensEstimados[i];
      n += secoes[i].length;
      i++;
    }
    const r = await chamar<RespostaContextual>(
      "contextualizedembeddings",
      { model: modelo, inputs: lote.map((k) => secoes[k]), input_type: "document", output_dimension: DIMENSOES },
      opts.signal,
    );
    for (const doc of r.data) {
      const destino = lote[doc.index];
      vetores[destino] = [...doc.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
    }
    tokens += r.usage.total_tokens;
  }
  return { vetores, tokens, modelo };
}

/** Embedding da pergunta do aluno (mesmo modelo, como consulta). */
export async function embedConsulta(texto: string, opts: { signal?: AbortSignal } = {}) {
  const modelo = modeloEmbedding();
  const r = await chamar<RespostaContextual>(
    "contextualizedembeddings",
    { model: modelo, inputs: [[texto]], input_type: "query", output_dimension: DIMENSOES },
    opts.signal,
  );
  return { vetor: r.data[0].data[0].embedding, tokens: r.usage.total_tokens, modelo };
}

/** Reordena candidatos pela relevância para a pergunta (cross-encoder). */
export async function reordenar(
  consulta: string,
  documentos: string[],
  topK: number,
  opts: { modelo?: string; signal?: AbortSignal } = {},
): Promise<{ resultados: { indice: number; score: number }[]; tokens: number; modelo: string }> {
  const modelo = opts.modelo ?? modeloRerank();
  if (documentos.length === 0) return { resultados: [], tokens: 0, modelo };
  const r = await chamar<{ data: { index: number; relevance_score: number }[]; usage: { total_tokens: number } }>(
    "rerank",
    { model: modelo, query: consulta, documents: documentos, top_k: topK, truncation: true },
    opts.signal,
  );
  return { resultados: r.data.map((d) => ({ indice: d.index, score: d.relevance_score })), tokens: r.usage.total_tokens, modelo };
}

/** Formato aceito pelo pgvector via PostgREST ("[0.1,0.2,…]"). halfvec guarda ~3 casas; 5 sobram. */
export function vetorParaTexto(v: number[]) {
  return `[${v.map((x) => Number(x.toFixed(5))).join(",")}]`;
}
