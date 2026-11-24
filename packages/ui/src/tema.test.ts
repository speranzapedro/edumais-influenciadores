import { describe, expect, it } from "vitest";
import { COR_MARCA, paletaMarca } from "./tema";

describe("escala da cor da marca", () => {
  it("usa a cor primária como 600 e clareia/escurece nos extremos", () => {
    const p = paletaMarca("#6C5CE7");
    expect(p[600]).toBe("#6c5ce7");
    expect(p[50]).toBe("#f6f5fe");
    expect(p[900]).toBe("#383078");
    const claridade = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    const ordem = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((t) => claridade(p[t]));
    expect([...ordem].sort((a, b) => b - a)).toEqual(ordem);
  });

  it("cai na cor do Edu+ com cor inválida", () => {
    expect(paletaMarca("azul")[600]).toBe(COR_MARCA);
    expect(paletaMarca(COR_MARCA)[600]).toBe("#6c5ce7");
  });
});
