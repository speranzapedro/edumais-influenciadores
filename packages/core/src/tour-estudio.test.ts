import { describe, expect, it } from "vitest";
import { TOUR_ESTUDIO } from "./tour-estudio";

describe("tour do estúdio", () => {
  it("passa pelas seis telas, na ordem do fluxo", () => {
    const telas = [...new Set(TOUR_ESTUDIO.map((p) => p.etapa))];
    expect(telas).toEqual(["materiais", "visao", "ementa", "cards", "aulas", "publicar"]);
  });

  it("fala com o criador e seus assinantes, não com escola ou turma", () => {
    const textos = TOUR_ESTUDIO.map((p) => `${p.titulo} ${p.texto}`)
      .join(" ")
      .toLowerCase();
    expect(textos).toContain("assinantes");
    expect(textos).not.toMatch(/turma|escola|apostila|edital/);
  });

  it("todo passo tem alvo e texto", () => {
    for (const p of TOUR_ESTUDIO) {
      expect(p.alvo.length).toBeGreaterThan(0);
      expect(p.texto.length).toBeGreaterThan(20);
    }
  });
});
