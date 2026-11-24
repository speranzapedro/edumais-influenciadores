import { describe, expect, it } from "vitest";
import { contextoDeTeste, ementaComTopicos } from "../teste/contexto";
import { toolsCards } from "./cards";

const card = (titulo: string, topico_ids: string[]) => ({
  titulo,
  conceito: `${titulo}: ${"um conceito explicado com calma para o fã entender sem pressa. ".repeat(4)}`,
  pontos_chave: ["Primeiro ponto verificável.", "Segundo ponto verificável.", "Terceiro ponto verificável."],
  exemplo: "Um exemplo concreto do cotidiano que ilustra o conceito.",
  topico_ids,
  fontes: [{ material_id: "m1", pagina: 1 }],
});

describe("tools dos cards", () => {
  it("cria cards em lote, respeitando a posição pedida, e informa a cobertura", async () => {
    const { ctx, ws, tools } = contextoDeTeste("cards", { ementa: ementaComTopicos() });
    const t = tools(toolsCards(ctx));
    const r1 = String(await t.criar_skill_cards.run({ cards: [card("Fome", ["T1"]), card("Golpe", ["T3"])] }));
    expect(r1).toContain("2 card(s) criado(s)");
    expect(r1).toContain("Cobertura atual: 67%");
    await t.criar_skill_cards.run({ cards: [card("Bastilha", ["T2"])], apos_card_id: "C1" });
    expect(ws.cards.cards.map((c) => c.titulo)).toEqual(["Fome", "Bastilha", "Golpe"]);
    await expect(t.criar_skill_cards.run({ cards: [card("X", ["T1"])], apos_card_id: "C99" })).rejects.toThrow("C99");
  });

  it("recusa tópicos fora da ementa (ou fora do módulo do worker)", async () => {
    const { ctx, tools } = contextoDeTeste("cards", { ementa: ementaComTopicos() }, { escopoModulo: "M1", prefixoIds: "M1-" });
    const t = tools(toolsCards(ctx));
    await expect(t.criar_skill_cards.run({ cards: [card("Golpe", ["T3"])] })).rejects.toThrow("Tópicos inexistentes na ementa: T3.");
    const r = String(await t.criar_skill_cards.run({ cards: [card("Fome", ["T1"])] }));
    expect(r).toContain("M1-C1");
  });

  it("edita, divide, funde e remove cards", async () => {
    const { ctx, ws, tools } = contextoDeTeste("cards", { ementa: ementaComTopicos() });
    const t = tools(toolsCards(ctx));
    await t.criar_skill_cards.run({ cards: [card("Fome", ["T1"]), card("Bastilha", ["T2"]), card("Golpe", ["T3"])] });

    await t.editar_skill_card.run({ card_id: "C1", titulo: "Fome e pão caro" });
    expect(ws.card("C1")?.titulo).toBe("Fome e pão caro");

    const div = String(await t.dividir_skill_card.run({ card_id: "C2", novos: [card("Prisão", ["T2"]), card("Símbolo", ["T2"])] }));
    expect(div).toContain("dividido em C4, C5");
    expect(ws.cards.cards.map((c) => c.id)).toEqual(["C1", "C4", "C5", "C3"]);

    const mes = String(await t.mesclar_skill_cards.run({ card_ids: ["C4", "C5"], novo: card("A Bastilha", ["T2"]) }));
    expect(mes).toContain("fundidos em C6");
    expect(ws.cards.cards.map((c) => c.id)).toEqual(["C1", "C6", "C3"]);

    const rem = String(await t.remover_skill_cards.run({ card_ids: ["C3"] }));
    expect(rem).toContain("Removido(s): C3");
    // Criado e removido na mesma execução: some das mudanças (não aparece como "removido" na tela).
    expect(ws.mudancas.C3).toBeUndefined();
    await expect(t.editar_skill_card.run({ card_id: "C3", titulo: "x" })).rejects.toThrow("Card C3 não existe.");
  });

  it("verificar_cobertura aponta tópicos sem card e validar lista pendências", async () => {
    const { ctx, eventos, tools } = contextoDeTeste("cards", { ementa: ementaComTopicos() });
    const t = tools(toolsCards(ctx));
    await t.criar_skill_cards.run({ cards: [card("Fome", ["T1"])] });
    const cob = String(await t.verificar_cobertura.run({}));
    expect(cob).toContain("Cobertura: 33%");
    expect(cob).toContain("Tópicos SEM card");
    expect(cob).toContain("T3 [M2] 18 de Brumário");
    const val = String(await t.validar_skill_cards.run({}));
    expect(val).toContain("1 cards · cobertura 33%");
    expect(eventos.filter((e) => e.tipo === "validacao")).toHaveLength(2);
  });
});
