import { type AulasDraft, type CardsDraft, contarPendencias, type Ementa, TOUR_ESTUDIO, validarAulas, validarCards, validarEmenta } from "@edu/core";
import { describe, expect, it } from "vitest";
import { estadoDemo, ID_TRILHA_DEMO } from "./demo";

describe("tour do estúdio com a trilha de exemplo", () => {
  const estado = estadoDemo({ id: "produto-demo", nome: "Trilhas de exemplo" });

  it("passa pelas seis telas, na ordem do fluxo", () => {
    const telas = [...new Set(TOUR_ESTUDIO.map((p) => p.etapa))];
    expect(telas).toEqual(["materiais", "visao", "ementa", "cards", "aulas", "publicar"]);
  });

  it("monta a trilha de exemplo no produto informado, com todas as etapas aprovadas", () => {
    expect(estado.trilha).toMatchObject({ id: ID_TRILHA_DEMO, produto_id: "produto-demo", status: "publicada" });
    expect(estado.produto).toEqual({ id: "produto-demo", nome: "Trilhas de exemplo" });
    expect(Object.values(estado.etapas).every((e) => e.status === "aprovada")).toBe(true);
    expect(estado.materiais.length).toBeGreaterThan(0);
    expect(estado.mensagens.some((m) => m.role === "assistant")).toBe(true);
  });

  it("a trilha de exemplo é válida (sem erros em nenhuma etapa)", () => {
    const ementa = estado.rascunhos.ementa as Ementa;
    const cards = estado.rascunhos.cards as CardsDraft;
    const aulas = estado.rascunhos.aulas as AulasDraft;
    const materiais = estado.materiais.map((m) => m.id);
    expect(contarPendencias(validarEmenta(ementa, materiais)).erros).toBe(0);
    expect(contarPendencias(validarCards(ementa, cards, materiais)).erros).toBe(0);
    expect(contarPendencias(validarAulas(ementa, cards, aulas)).erros).toBe(0);
  });
});
