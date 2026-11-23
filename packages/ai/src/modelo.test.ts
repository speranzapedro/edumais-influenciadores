import { afterEach, describe, expect, it, vi } from "vitest";
import { capacidades, custoUsd, modeloAtual, modeloPlanejamento, modeloRevisor, paramsRaciocinio, revisorLigado, usoVazio } from "./modelo";

afterEach(() => {
  delete process.env.MODO_ECONOMICO;
  delete process.env.ANTHROPIC_MODEL;
  delete process.env.ANTHROPIC_MODEL_PLANEJAMENTO;
});

describe("parâmetros por modelo", () => {
  it("Haiku 4.5: sem effort, thinking por budget_tokens e 200K de contexto", () => {
    expect(capacidades("claude-haiku-4-5")).toEqual({ effort: false, thinkingAdaptativo: false, contextoTokens: 200_000 });
    expect(paramsRaciocinio("claude-haiku-4-5", "high")).toEqual({ thinking: { type: "enabled", budget_tokens: 8000 } });
    expect(paramsRaciocinio("claude-haiku-4-5", "high", 6000)).toEqual({ thinking: { type: "enabled", budget_tokens: 3000 } });
  });

  it("Haiku 5.5: thinking adaptativo, effort e 1M de contexto", () => {
    expect(capacidades("claude-haiku-5-5")).toEqual({ effort: true, thinkingAdaptativo: true, contextoTokens: 1_000_000 });
    expect(paramsRaciocinio("claude-haiku-5-5", "high")).toEqual({
      thinking: { type: "adaptive", display: "summarized" },
      output_config: { effort: "high" },
    });
  });

  it("modelos atuais: thinking adaptativo + effort", () => {
    expect(paramsRaciocinio("claude-sonnet-5-5", "high")).toEqual({
      thinking: { type: "adaptive", display: "summarized" },
      output_config: { effort: "high" },
    });
  });

  it("modo econômico: esforço baixo; no Haiku 4.5, sem raciocínio estendido", () => {
    process.env.MODO_ECONOMICO = "true";
    expect(paramsRaciocinio("claude-haiku-5-5", "high")).toMatchObject({ output_config: { effort: "low" } });
    expect(paramsRaciocinio("claude-haiku-4-5", "high")).toEqual({});
  });
});

describe("modelo por processo", () => {
  it("padrões: Haiku 5.5 na geração, Sonnet 5.5 no planejamento e no revisor", () => {
    expect(modeloAtual()).toBe("claude-haiku-5-5");
    expect(modeloPlanejamento()).toBe("claude-sonnet-5-5");
    expect(modeloRevisor()).toBe("claude-sonnet-5-5");
  });

  it("modo econômico: planejamento no modelo padrão, salvo env explícita", () => {
    process.env.MODO_ECONOMICO = "true";
    expect(modeloPlanejamento()).toBe("claude-haiku-5-5");
    process.env.ANTHROPIC_MODEL_PLANEJAMENTO = "claude-opus-5-5";
    expect(modeloPlanejamento()).toBe("claude-opus-5-5");
  });
});

describe("custo estimado", () => {
  it("Haiku 5.5: faixa barata até 100K tokens de prompt por chamada, faixa longa acima", () => {
    const curto = { ...usoVazio(), iteracoes: 1, input_tokens: 50_000, output_tokens: 1_000 };
    expect(custoUsd(curto, "claude-haiku-5-5")).toBeCloseTo((50_000 * 0.1 + 1_000 * 0.5) / 1e6);
    const longo = { ...usoVazio(), iteracoes: 1, input_tokens: 150_000, output_tokens: 1_000 };
    expect(custoUsd(longo, "claude-haiku-5-5")).toBeCloseTo((150_000 * 0.5 + 1_000 * 2.5) / 1e6);
  });
});

describe("revisor pedagógico", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("desligado no modo econômico, a menos que REVISOR_PEDAGOGICO=true", () => {
    vi.stubEnv("MODO_ECONOMICO", "true");
    vi.stubEnv("REVISOR_PEDAGOGICO", "");
    expect(revisorLigado()).toBe(false);
    vi.stubEnv("REVISOR_PEDAGOGICO", "true");
    expect(revisorLigado()).toBe(true);
    vi.stubEnv("MODO_ECONOMICO", "");
    vi.stubEnv("REVISOR_PEDAGOGICO", "");
    expect(revisorLigado()).toBe(true);
  });
});
