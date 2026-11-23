import { describe, expect, it } from "vitest";
import type { AvaliacaoQualidade } from "../eventos";
import { contextoDeTeste, ementaComTopicos } from "../teste/contexto";
import { toolsComuns } from "./comuns";

describe("tools comuns", () => {
  it("lista materiais, busca trechos e lê páginas", async () => {
    const { ctx, tools } = contextoDeTeste("ementa");
    const t = tools(toolsComuns(ctx));
    expect(String(await t.listar_materiais.run({}))).toContain("m1 · roteiro.md · 2 página(s)");
    expect(String(await t.buscar_nos_materiais.run({ consulta: "Bastilha" }))).toContain("p. 1");
    expect(String(await t.buscar_nos_materiais.run({ consulta: "dinossauros" }))).toContain("Nenhum trecho encontrado");
    const lido = String(await t.ler_paginas.run({ material_id: "m1", pagina_inicio: 1, pagina_fim: 2 }));
    expect(lido).toContain("[[página 2]]");
    await expect(t.ler_paginas.run({ material_id: "m1", pagina_inicio: 2, pagina_fim: 1 })).rejects.toThrow("pagina_fim");
    await expect(t.ler_paginas.run({ material_id: "m9", pagina_inicio: 1, pagina_fim: 1 })).rejects.toThrow("Nada encontrado");
  });

  it("ver_rascunho mostra o rascunho inteiro ou um item", async () => {
    const { ctx, tools } = contextoDeTeste("ementa", { ementa: ementaComTopicos() });
    const t = tools(toolsComuns(ctx));
    expect(String(await t.ver_rascunho.run({}))).toContain('"Antes da Bastilha"');
    expect(String(await t.ver_rascunho.run({ item_id: "T3" }))).toContain("18 de Brumário");
    await expect(t.ver_rascunho.run({ item_id: "X1" })).rejects.toThrow("Item X1 não encontrado.");
  });

  it("revisar_qualidade chama o revisor até o limite e devolve as correções", async () => {
    const avaliacao: AvaliacaoQualidade = {
      nota_geral: 4,
      criterios: [{ criterio: "clareza", nota: 4, comentario: "Boa." }],
      problemas: [{ alvo: "T1", gravidade: "media", problema: "Vago.", sugestao: "Detalhar." }],
      pontos_fortes: ["Sequência clara."],
    };
    const { ctx, eventos, tools } = contextoDeTeste("ementa", { ementa: ementaComTopicos() }, { revisar: async () => avaliacao, limiteRevisoes: 1 });
    const t = tools(toolsComuns(ctx));
    const r = String(await t.revisar_qualidade.run({ foco: null }));
    expect(r).toContain("Nota geral 4/5.");
    expect(r).toContain("(media) T1: Vago. → Detalhar.");
    expect(eventos.some((e) => e.tipo === "qualidade")).toBe(true);
    expect(String(await t.revisar_qualidade.run({}))).toContain("Limite de revisões");
  });
});
