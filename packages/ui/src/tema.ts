/**
 * Escala da cor da marca: deriva marca-50…900 de uma cor primária, misturando com branco (tons
 * claros) e preto (tons escuros). A 600 é a própria cor. Usada onde o CSS não chega (ícones, manifest).
 */

/** Cor primária do Edu+ (a mesma de `--color-marca-600` em styles.css). */
export const COR_MARCA = "#6c5ce7";

const ESCALA: [tom: number, mistura: number, com: "branco" | "preto" | null][] = [
  [50, 0.94, "branco"],
  [100, 0.88, "branco"],
  [200, 0.74, "branco"],
  [300, 0.56, "branco"],
  [400, 0.36, "branco"],
  [500, 0.16, "branco"],
  [600, 0, null],
  [700, 0.14, "preto"],
  [800, 0.3, "preto"],
  [900, 0.48, "preto"],
];

export function hexValido(hex: string) {
  return /^#[0-9a-f]{6}$/i.test(hex);
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: number[]) {
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function misturar(base: string, alvo: [number, number, number], t: number) {
  const b = rgb(base);
  return hex(b.map((v, i) => v + (alvo[i] - v) * t));
}

export function paletaMarca(corPrimaria: string): Record<number, string> {
  const base = hexValido(corPrimaria) ? corPrimaria.toLowerCase() : COR_MARCA;
  return Object.fromEntries(ESCALA.map(([tom, t, com]) => [tom, com === null ? base : misturar(base, com === "branco" ? [255, 255, 255] : [0, 0, 0], t)]));
}
