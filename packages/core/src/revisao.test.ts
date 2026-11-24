import { describe, expect, it } from "vitest";
import type { Ementa, Modulo } from "./conteudo";
import { assinaturaCards, assinaturaModulo, cardsDoModulo, lerRevisoes, moduloRevisado, modulosPendentes, modulosPendentesCards } from "./revisao";

const modulo = (id: string, titulo: string): Modulo => ({
  id,
  titulo,
  descricao: "Descrição do módulo.",
  topicos: [{ id: `T-${id}`, titulo: "Tópico", descricao: "Descrição do tópico.", fontes: [], competencia_ids: ["K1"] }],
});
const ementa = (...modulos: Modulo[]): Ementa => ({ curso: "Curso", objetivo_geral: "", publico_alvo: "", competencias: [], modulos });

describe("revisão dos módulos", () => {
  it("assinatura é estável e muda quando o conteúdo muda", () => {
    const m = modulo("M1", "Fundamentos");
    expect(assinaturaModulo(m)).toBe(assinaturaModulo(structuredClone(m)));
    expect(assinaturaModulo({ ...m, titulo: "Outro título" })).not.toBe(assinaturaModulo(m));
    const semFonte = structuredClone(m);
    semFonte.topicos[0].fontes = [{ material_id: "x", pagina: 2 }];
    expect(assinaturaModulo(semFonte)).toBe(assinaturaModulo(m));
  });

  it("só o módulo alterado volta a pedir revisão", () => {
    const m1 = modulo("M1", "Fundamentos");
    const m2 = modulo("M2", "Prática");
    const revisoes = { M1: assinaturaModulo(m1), M2: assinaturaModulo(m2) };
    expect(modulosPendentes(ementa(m1, m2), revisoes)).toEqual([]);
    const m2Alterado = { ...m2, descricao: "Nova descrição." };
    expect(modulosPendentes(ementa(m1, m2Alterado), revisoes).map((m) => m.id)).toEqual(["M2"]);
    expect(moduloRevisado(m1, null)).toBe(false);
  });

  it("lê a coluna jsonb sem confiar no formato", () => {
    expect(lerRevisoes(null)).toEqual({});
    expect(lerRevisoes(["x"])).toEqual({});
    expect(lerRevisoes({ M1: "abc", M2: 3 })).toEqual({ M1: "abc" });
  });

  it("cards: pendência por módulo, e só o módulo cujo card mudou volta a pedir revisão", () => {
    const e = ementa(modulo("M1", "Fundamentos"), modulo("M2", "Prática"));
    const card = (id: string, topico: string) => ({ id, titulo: id, conceito: "c", pontos_chave: ["p"], exemplo: "e", topico_ids: [topico], fontes: [] });
    const cards = { cards: [card("C1", "T-M1"), card("C2", "T-M2"), card("C3", "T-M2")] };
    expect(cardsDoModulo(e, cards, "M2").map((c) => c.id)).toEqual(["C2", "C3"]);
    const revisoes = { M1: assinaturaCards(cardsDoModulo(e, cards, "M1")), M2: assinaturaCards(cardsDoModulo(e, cards, "M2")) };
    expect(modulosPendentesCards(e, cards, revisoes)).toEqual([]);
    const semC3 = { cards: cards.cards.filter((c) => c.id !== "C3") };
    expect(modulosPendentesCards(e, semC3, revisoes).map((m) => m.id)).toEqual(["M2"]);
  });
});
