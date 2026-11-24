import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import type { TrechoRecuperado } from "./busca";
import { FiltroMarcaGeral, montarMensagens, resultadoDeBusca } from "./prompt";

const trecho = (id: number, p: Partial<TrechoRecuperado> = {}): TrechoRecuperado => ({
  id,
  origem: "aula",
  material_id: null,
  aula_id: "a1",
  card_id: null,
  pagina_inicio: null,
  pagina_fim: null,
  avaliativo: false,
  caminho: "Módulo 1 › Aula 2: Lei de Ohm",
  texto: "A tensão é o produto da resistência pela corrente.\nDica: lembre do triângulo.",
  tokens: 30,
  pos_lexica: 1,
  pos_semantica: 1,
  score: 0.03,
  relevancia: 0.9,
  ...p,
});

describe("prompt do tutor", () => {
  it("cada trecho vira search_result com citações, um bloco por parágrafo; desafios ficam marcados", () => {
    const r = resultadoDeBusca(trecho(7));
    expect(r).toMatchObject({ type: "search_result", source: "trecho:7", title: "Módulo 1 › Aula 2: Lei de Ohm", citations: { enabled: true } });
    expect(r.content).toHaveLength(2);
    expect(resultadoDeBusca(trecho(8, { avaliativo: true })).title).toBe("Desafio da aula — Módulo 1 › Aula 2: Lei de Ohm");
  });

  it("histórico só com texto e cache no fim do histórico; pergunta delimitada no fim", () => {
    const msgs = montarMensagens({
      historico: [{ pergunta: "o que é tensão?", resposta: "É a diferença de potencial." }],
      trechos: [trecho(1), trecho(2)],
      pergunta: "e a corrente?",
      confiancaBaixa: false,
    });
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    const fimHistorico = (msgs[1].content as Anthropic.TextBlockParam[]).at(-1)!;
    expect(fimHistorico.cache_control).toEqual({ type: "ephemeral" });
    const atual = msgs[2].content as Anthropic.ContentBlockParam[];
    expect(atual.filter((b) => b.type === "search_result")).toHaveLength(2);
    const texto = atual.at(-1) as Anthropic.TextBlockParam;
    expect(texto.text).toContain("<pergunta_do_aluno>\ne a corrente?\n</pergunta_do_aluno>");
    expect(texto.text).not.toContain("confiança");
  });

  it("avisa confiança baixa, busca vazia e a aula atual", () => {
    const baixa = montarMensagens({ historico: [], trechos: [trecho(1)], pergunta: "x", confiancaBaixa: true, aulaAtual: "Aula 3: Potência" });
    const t = (baixa[0].content as Anthropic.ContentBlockParam[]).at(-1) as Anthropic.TextBlockParam;
    expect(t.text).toContain("confiança da busca é baixa");
    expect(t.text).toContain("O aluno está estudando agora: Aula 3: Potência.");
    const vazia = montarMensagens({ historico: [], trechos: [], pergunta: "x", confiancaBaixa: true });
    expect(((vazia[0].content as Anthropic.ContentBlockParam[]).at(-1) as Anthropic.TextBlockParam).text).toContain("não encontrou nada");
  });
});

describe("fontes da resposta", () => {
  it("transforma citações em fontes do aluno, sem repetir", async () => {
    const { fontesDaResposta } = await import("./responder");
    const base = { trecho_id: 1, card_id: null, material_id: null, aula_id: null, pagina_inicio: null, pagina_fim: null, texto_citado: "", inicio: 0, fim: 1 };
    const f = fontesDaResposta([
      { ...base, origem: "aula", aula_id: "a4", caminho: "Lei de Ohm e circuitos › Aula 4: Lei de Ohm" },
      { ...base, origem: "aula", aula_id: "a4", caminho: "Lei de Ohm e circuitos › Aula 4: Lei de Ohm › Exercícios" },
      { ...base, origem: "card", card_id: "c1", caminho: "Grandezas elétricas › Card: Efeito Joule" },
      { ...base, origem: "material", material_id: "m1", pagina_inicio: 3, caminho: "Apostila eletricidade › Capítulo 5 › 5.3 NR-10" },
    ]);
    expect(f).toEqual([
      { tipo: "aula", rotulo: "Aula 4: Lei de Ohm", aulaId: "a4" },
      { tipo: "card", rotulo: "Efeito Joule", aulaId: null },
      { tipo: "material", rotulo: "Apostila eletricidade · p. 3", aulaId: null },
    ]);
  });
});

describe("FiltroMarcaGeral", () => {
  const passar = (pedacos: string[]) => {
    const f = new FiltroMarcaGeral();
    const texto = pedacos.map((p) => f.push(p)).join("") + f.fim();
    return { texto, geral: f.apareceu };
  };

  it("retira a marca mesmo quebrada entre pedaços do streaming", () => {
    expect(passar(["Plantão é um turno.\n\n[conhe", "cimento ge", "ral]"])).toEqual({ texto: "Plantão é um turno.\n\n", geral: true });
  });

  it("não segura texto que só parece o começo da marca", () => {
    expect(passar(["Veja a lista [", "1] da aula."])).toEqual({ texto: "Veja a lista [1] da aula.", geral: false });
    expect(passar(["Termina com ["])).toEqual({ texto: "Termina com [", geral: false });
  });
});
