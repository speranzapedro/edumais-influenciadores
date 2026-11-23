import { describe, expect, it } from "vitest";
import { contextoDeTeste, ementaComTopicos } from "../teste/contexto";
import { resumoEmenta, toolsEmenta } from "./ementa";

const topico = (titulo: string, competencia_ids = ["K1"]) => ({
  titulo,
  descricao: `Descrição do tópico ${titulo}.`,
  fontes: [{ material_id: "m1", pagina: 1 }],
  competencia_ids,
});

describe("tools da ementa", () => {
  it("definir_estrutura cria módulos e tópicos com ids do sistema e marca as mudanças", async () => {
    const { ctx, ws, tools } = contextoDeTeste("ementa", { ementa: ementaComTopicos() });
    const t = tools(toolsEmenta(ctx));
    const r = String(
      await t.definir_estrutura.run({
        modulos: [
          { titulo: "Causas", descricao: "Por que começou.", topicos: [topico("Fome"), topico("Impostos")] },
          { titulo: "Império", descricao: "Napoleão.", topicos: [topico("Golpe", ["K2"])] },
        ],
      }),
    );
    expect(ws.ementa.modulos.map((m) => m.titulo)).toEqual(["Causas", "Império"]);
    expect(ws.ementa.modulos[0].topicos.map((x) => x.id)).toEqual(["T1", "T2"]);
    expect(r).toContain("2 módulo");
    expect(ws.mudancas.M1).toBeDefined();
    expect(ctx.acoes.at(-1)).toMatchObject({ nome: "definir_estrutura", ok: true });
  });

  it("adiciona, edita, move e remove módulos e tópicos", async () => {
    const { ctx, ws, tools } = contextoDeTeste("ementa", { ementa: ementaComTopicos() });
    const t = tools(toolsEmenta(ctx));

    const add = String(await t.adicionar_modulo.run({ titulo: "Depois", descricao: "Consequências.", topicos: [topico("Código Civil")], posicao: 2 }));
    expect(add).toContain("M3");
    expect(ws.ementa.modulos.map((m) => m.id)).toEqual(["M1", "M3", "M2"]);

    await t.editar_modulo.run({ modulo_id: "M3", titulo: "Consequências" });
    expect(ws.modulo("M3")?.titulo).toBe("Consequências");

    const addT = String(await t.adicionar_topico.run({ modulo_id: "M1", posicao: 1, ...topico("Iluminismo") }));
    expect(addT).toContain("posição 1");
    expect(ws.modulo("M1")?.topicos[0].titulo).toBe("Iluminismo");

    await t.editar_topico.run({ topico_id: "T2", titulo: "A Bastilha cai" });
    expect(ws.topico("T2")?.topico.titulo).toBe("A Bastilha cai");

    const mover = String(await t.mover_topico.run({ topico_id: "T2", para_modulo_id: "M2", posicao: null }));
    expect(mover).toContain("M2");
    expect(ws.modulo("M2")?.topicos.map((x) => x.id)).toContain("T2");

    await t.remover_topico.run({ topico_id: "T2" });
    expect(ws.topico("T2")).toBeNull();

    const rem = String(await t.remover_modulo.run({ modulo_id: "M2" }));
    expect(rem).toContain("removido");
    expect(ws.modulo("M2")).toBeUndefined();
    expect(ws.mudancas.T3).toBe("removido");
  });

  it("avisa sobre competências inexistentes sem bloquear o tópico", async () => {
    const { ctx, ws, tools } = contextoDeTeste("ementa", { ementa: ementaComTopicos() });
    const t = tools(toolsEmenta(ctx));
    const r = String(await t.adicionar_topico.run({ modulo_id: "M1", ...topico("Sem vínculo", ["K9"]) }));
    expect(r).toContain("competências inexistentes");
    expect(ws.modulo("M1")?.topicos.at(-1)?.titulo).toBe("Sem vínculo");
  });

  it("recusa ids que não existem com mensagem para o modelo", async () => {
    const { ctx, tools } = contextoDeTeste("ementa", { ementa: ementaComTopicos() });
    const t = tools(toolsEmenta(ctx));
    await expect(t.editar_modulo.run({ modulo_id: "M9", titulo: "x" })).rejects.toThrow("Módulo M9 não existe.");
    await expect(t.remover_modulo.run({ modulo_id: "M9" })).rejects.toThrow("não existe");
    await expect(t.editar_topico.run({ topico_id: "T9" })).rejects.toThrow("Tópico T9 não existe.");
    await expect(t.mover_topico.run({ topico_id: "T1", para_modulo_id: "M9" })).rejects.toThrow("Módulo M9 não existe.");
    expect(ctx.acoes.filter((a) => !a.ok)).toHaveLength(4);
  });

  it("validar_ementa lista pendências e a cobertura das competências", async () => {
    const { ctx, eventos, tools } = contextoDeTeste("ementa", { ementa: ementaComTopicos() });
    const t = tools(toolsEmenta(ctx));
    const r = String(await t.validar_ementa.run({}));
    expect(r).toContain("Competências (100% com tópico)");
    expect(r).toContain("K2 ← T3");
    expect(eventos.some((e) => e.tipo === "validacao")).toBe(true);
  });

  it("resumoEmenta mostra módulos, tópicos e vínculos", () => {
    const r = resumoEmenta(ementaComTopicos());
    expect(r).toContain("M1 Antes da Bastilha");
    expect(r).toContain("T3 18 de Brumário [K2]");
  });
});
