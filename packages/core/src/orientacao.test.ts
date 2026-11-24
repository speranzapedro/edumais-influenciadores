import { describe, expect, it } from "vitest";
import { erroOrientacao, LIMITES_ORIENTACAO, normalizarOrientacao, objetivoDefinido } from "./orientacao";

describe("orientação da trilha", () => {
  it("normaliza espaços e valores ausentes", () => {
    expect(normalizarOrientacao({ objetivo: "  Instalar circuitos  ", conteudos: null })).toEqual({
      objetivo: "Instalar circuitos",
      conteudos: "",
      complementos: "",
    });
  });

  it("aceita objetivo vazio (rascunho) e recusa objetivo curto demais", () => {
    expect(erroOrientacao({ objetivo: "", conteudos: "", complementos: "" })).toBeNull();
    expect(erroOrientacao({ objetivo: "Curto", conteudos: "", complementos: "" })).toMatch(/pelo menos/);
    expect(erroOrientacao({ objetivo: "Preparar o aluno para instalar circuitos.", conteudos: "Capítulos 3 a 5", complementos: "" })).toBeNull();
  });

  it("respeita os limites máximos", () => {
    expect(erroOrientacao({ objetivo: "x".repeat(LIMITES_ORIENTACAO.objetivoMax + 1), conteudos: "", complementos: "" })).toMatch(/até/);
    expect(
      erroOrientacao({ objetivo: "Preparar o aluno para instalar circuitos.", conteudos: "x".repeat(LIMITES_ORIENTACAO.conteudosMax + 1), complementos: "" }),
    ).toMatch(/até/);
    expect(
      erroOrientacao({
        objetivo: "Preparar o aluno para instalar circuitos.",
        conteudos: "",
        complementos: "x".repeat(LIMITES_ORIENTACAO.complementosMax + 1),
      }),
    ).toMatch(/até/);
  });

  it("só libera a ementa com objetivo suficiente", () => {
    expect(objetivoDefinido(null)).toBe(false);
    expect(objetivoDefinido("   curto   ")).toBe(false);
    expect(objetivoDefinido("Preparar o aluno para instalar circuitos.")).toBe(true);
  });
});
