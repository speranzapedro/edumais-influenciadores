import Anthropic from "@anthropic-ai/sdk";

/** Modelo rápido e barato: workers de cards/aulas, Edu e feedback. */
export const MODELO_PADRAO = "claude-haiku-5-5";
/** Modelo mais capaz: decisões de estrutura da trilha (visão geral e ementa) e o revisor pedagógico. */
export const MODELO_FORTE = "claude-sonnet-5-5";

/** Modelo da geração de cards e aulas (e dos ajustes pelo chat nessas etapas). */
export function modeloAtual(): string {
  return process.env.ANTHROPIC_MODEL || MODELO_PADRAO;
}

/** Modelo da visão geral e da ementa: poucas chamadas, mas definem a trilha inteira. No modo econômico, o padrão. */
export function modeloPlanejamento(): string {
  return process.env.ANTHROPIC_MODEL_PLANEJAMENTO || (modoEconomico() ? modeloAtual() : MODELO_FORTE);
}

/** Modelo do revisor pedagógico: quem avalia deve ser ao menos tão capaz quanto quem gera. */
export function modeloRevisor(): string {
  return process.env.ANTHROPIC_MODEL_REVISOR || MODELO_FORTE;
}

/** Modelo do feedback em tempo real da pergunta aberta (latência importa mais que profundidade). */
export function modeloFeedback(): string {
  return process.env.ANTHROPIC_MODEL_FEEDBACK || MODELO_PADRAO;
}

/**
 * Feature flag MODO_ECONOMICO=true: corta o custo do estúdio para testes — sem revisor pedagógico,
 * esforço baixo (ou sem raciocínio estendido nos modelos sem `effort`) e no máximo 1 rodada de correção.
 */
export const modoEconomico = () => process.env.MODO_ECONOMICO === "true";

/**
 * Revisor pedagógico ligado? Desligado no modo econômico, a menos que REVISOR_PEDAGOGICO=true: assim dá
 * para manter o resto econômico (esforço baixo, ementa no modelo padrão) e ainda revisar o conteúdo.
 */
export const revisorLigado = () => !modoEconomico() || process.env.REVISOR_PEDAGOGICO === "true";

export type Esforco = "low" | "medium" | "high";

/**
 * O que cada modelo aceita na requisição. Haiku 4.5 (e a geração 4.5) não aceita `output_config.effort`
 * nem thinking adaptativo (usa `budget_tokens`) e tem 200K de contexto.
 */
export function capacidades(modelo: string) {
  const geracaoAntiga = /^claude-(haiku-4-5|sonnet-4-5|opus-4-5|opus-4-1)/.test(modelo);
  return {
    effort: !/^claude-(haiku-4-5|sonnet-4-5)/.test(modelo),
    thinkingAdaptativo: !geracaoAntiga,
    contextoTokens: /^claude-haiku-4-5/.test(modelo) ? 200_000 : 1_000_000,
  };
}

/** Parâmetros de raciocínio (thinking + effort) no formato que o modelo aceita. */
export function paramsRaciocinio(modelo: string, esforco: Esforco, maxTokens = 32_000) {
  const c = capacidades(modelo);
  const economico = modoEconomico();
  const nivel: Esforco = economico ? "low" : esforco;
  if (c.thinkingAdaptativo) {
    return { thinking: { type: "adaptive" as const, display: "summarized" as const }, ...(c.effort ? { output_config: { effort: nivel } } : {}) };
  }
  // Modelos com budget_tokens: no modo econômico, sem raciocínio estendido.
  if (economico) return c.effort ? { output_config: { effort: nivel } } : {};
  return {
    // budget_tokens precisa ser menor que max_tokens (mínimo 1024).
    thinking: { type: "enabled" as const, budget_tokens: Math.max(1024, Math.min(nivel === "high" ? 8000 : 4000, Math.floor(maxTokens / 2))) },
    ...(c.effort ? { output_config: { effort: nivel } } : {}),
  };
}

let cliente: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!cliente) cliente = new Anthropic({ maxRetries: 3 });
  return cliente;
}

/**
 * Troca o cliente da API (só para testes: um cliente falso que responde sem rede). `null` volta ao
 * cliente real na próxima chamada. Em produção, use ANTHROPIC_BASE_URL para apontar o SDK a outro host.
 */
export function definirClienteAnthropic(novo: Anthropic | null) {
  cliente = novo;
}

interface Preco {
  entrada: number;
  saida: number;
  /** Preço maior quando o prompt da chamada passa do limite (em tokens). */
  longo?: { limite: number; entrada: number; saida: number };
}

/** Preço por milhão de tokens (entrada, saída) — usado só para exibir custo estimado. */
const PRECOS: Record<string, Preco> = {
  "claude-sonnet-5": { entrada: 2, saida: 10 },
  "claude-sonnet-5-5": { entrada: 2, saida: 10 },
  "claude-opus-5": { entrada: 5, saida: 25 },
  "claude-opus-5-5": { entrada: 4, saida: 20 },
  "claude-haiku-4-5": { entrada: 1, saida: 5 },
  "claude-haiku-5-5": { entrada: 0.1, saida: 0.5, longo: { limite: 100_000, entrada: 0.5, saida: 2.5 } },
};

export interface Uso {
  iteracoes: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}

export function usoVazio(): Uso {
  return { iteracoes: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 };
}

export function somarUso(total: Uso, u: Anthropic.Beta.BetaUsage | Anthropic.Usage) {
  total.iteracoes++;
  total.input_tokens += u.input_tokens ?? 0;
  total.output_tokens += u.output_tokens ?? 0;
  total.cache_read_tokens += u.cache_read_input_tokens ?? 0;
  total.cache_write_tokens += u.cache_creation_input_tokens ?? 0;
}

export function juntarUso(a: Uso, b: Uso): Uso {
  return {
    iteracoes: a.iteracoes + b.iteracoes,
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_read_tokens: a.cache_read_tokens + b.cache_read_tokens,
    cache_write_tokens: a.cache_write_tokens + b.cache_write_tokens,
  };
}

export function custoUsd(uso: Uso, modelo = modeloAtual()): number {
  const base = PRECOS[modelo] ?? PRECOS[MODELO_PADRAO];
  // A faixa de preço é por chamada; com o uso somado, vale o tamanho médio do prompt (aproximação).
  const promptMedio = (uso.input_tokens + uso.cache_read_tokens + uso.cache_write_tokens) / Math.max(1, uso.iteracoes);
  const p = base.longo && promptMedio > base.longo.limite ? base.longo : base;
  const entrada = uso.input_tokens + uso.cache_read_tokens * 0.1 + uso.cache_write_tokens * 1.25;
  return (entrada * p.entrada + uso.output_tokens * p.saida) / 1_000_000;
}
