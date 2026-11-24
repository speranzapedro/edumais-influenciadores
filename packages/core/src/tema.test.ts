import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COR_FUNDO,
  COR_MARCA,
  contraste,
  cssDoTema,
  estiloDoTema,
  gerarTema,
  hexValido,
  luminancia,
  normalizarHex,
  PRESETS_TEMA,
  TEMA_EDU,
  TONS_MARCA,
  VARIAVEIS_TEMA,
  type VarsTema,
} from "./tema";

/** HSL → hex, só para varrer o espaço de cores nos testes. */
function hsl(h: number, s: number, l: number) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const CINZAS = ["#000000", "#ffffff", "#808080", "#333333", "#cccccc", "#f5f5fb"];
const AMOSTRAS = [...CINZAS];
for (let h = 0; h < 360; h += 1) for (const l of [12, 30, 45, 60, 75, 92]) AMOSTRAS.push(hsl(h, h % 2 ? 100 : 55, l));

function conferirGarantias(vars: VarsTema) {
  for (const k of VARIAVEIS_TEMA) expect(hexValido(vars[k]), k).toBe(true);
  const m = (t: number) => vars[`--color-marca-${t}` as keyof VarsTema];
  expect(contraste(m(600), "#ffffff")).toBeGreaterThanOrEqual(4.5);
  expect(contraste(m(600), COR_FUNDO)).toBeGreaterThanOrEqual(4.45);
  expect(contraste(m(700), m(100))).toBeGreaterThanOrEqual(4.5);
  expect(contraste(vars["--marca-gradiente-de"], "#ffffff")).toBeGreaterThanOrEqual(3);
  expect(contraste(vars["--color-destaque"], vars["--color-destaque-contraste"])).toBeGreaterThanOrEqual(4.5);
  expect(contraste(vars["--color-destaque-escuro"], vars["--color-destaque-claro"])).toBeGreaterThanOrEqual(4.5);
  // Tons do mais claro para o mais escuro.
  const lums = TONS_MARCA.map((t) => luminancia(m(t)));
  for (let i = 1; i < lums.length; i++) expect(lums[i]).toBeLessThanOrEqual(lums[i - 1] + 1e-3);
}

describe("gerarTema", () => {
  it("sem personalização devolve exatamente o Edu+", () => {
    expect(gerarTema({ primaria: COR_MARCA })).toEqual({ vars: TEMA_EDU, ajustes: [], corTema: COR_MARCA });
    expect(gerarTema({ primaria: "#6C5CE7", destaque: null }).vars).toEqual(TEMA_EDU);
    expect(gerarTema({ primaria: "azul", destaque: "x" }).vars).toEqual(TEMA_EDU);
    expect(gerarTema({}).vars).toEqual(TEMA_EDU);
  });

  it("o Edu+ cumpre as próprias garantias", () => {
    conferirGarantias(TEMA_EDU);
  });

  it("mantém a cor do criador quando ela já é legível", () => {
    const t = gerarTema({ primaria: "#1D4ED8" });
    expect(t.vars["--color-marca-600"]).toBe("#1d4ed8");
    expect(t.corTema).toBe("#1d4ed8");
    expect(t.ajustes).toEqual([]);
    expect(t.vars["--color-destaque"]).toBe("#1d4ed8");
    expect(t.vars["--color-destaque-contraste"]).toBe("#ffffff");
  });

  it("escurece uma cor principal clara demais e avisa", () => {
    const t = gerarTema({ primaria: "#ffe14d" });
    expect(t.ajustes).toHaveLength(1);
    expect(t.ajustes[0]).toMatchObject({ cor: "primaria", de: "#ffe14d" });
    expect(t.vars["--color-marca-600"]).toBe(t.ajustes[0].para);
    expect(t.corTema).toBe(t.ajustes[0].para);
    conferirGarantias(t.vars);
  });

  it("personaliza só o destaque mantendo a marca do Edu+", () => {
    const t = gerarTema({ primaria: COR_MARCA, destaque: "#facc15" });
    for (const tom of TONS_MARCA) expect(t.vars[`--color-marca-${tom}`]).toBe(TEMA_EDU[`--color-marca-${tom}`]);
    expect(t.vars["--color-destaque"]).toBe("#facc15");
    expect(t.vars["--color-destaque-contraste"]).toBe("#1d1a3a");
    expect(t.ajustes).toEqual([]);
  });

  it("ajusta um destaque de meio-termo (nem branco nem tinta leem bem)", () => {
    // #8a8a8a: ~3,4 com branco e ~4,6 com a tinta… e o vizinho #7a7a7a fica abaixo de 4,5 com os dois.
    const t = gerarTema({ primaria: "#1d4ed8", destaque: "#7a7a7a" });
    expect(t.ajustes.map((a) => a.cor)).toEqual(["destaque"]);
    conferirGarantias(t.vars);
  });

  it("garante contraste e ordem dos tons em todo o espaço de cores", () => {
    for (const primaria of AMOSTRAS) conferirGarantias(gerarTema({ primaria }).vars);
  });

  it("garante o texto sobre qualquer cor de destaque", () => {
    for (const destaque of AMOSTRAS.filter((_, i) => i % 3 === 0)) conferirGarantias(gerarTema({ primaria: "#0f766e", destaque }).vars);
  });

  it("as predefinições não precisam de ajuste na cor principal", () => {
    for (const p of PRESETS_TEMA) {
      const t = gerarTema(p);
      expect(
        t.ajustes.filter((a) => a.cor === "primaria"),
        p.nome,
      ).toEqual([]);
      conferirGarantias(t.vars);
    }
  });
});

describe("saída do tema", () => {
  it("monta o :root só com variáveis conhecidas e valores hex", () => {
    const vars = { ...TEMA_EDU, "--color-marca-600": "red;}body{display:none" } as VarsTema;
    const css = cssDoTema({ ...vars, ["--outra" as keyof VarsTema]: "#000000" });
    expect(css.startsWith(":root{--color-marca-50:#f4f2ff;")).toBe(true);
    expect(css).not.toContain("red");
    expect(css).not.toContain("--outra");
    expect(css.endsWith("}")).toBe(true);
    expect(cssDoTema({})).toBe("");
  });

  it("gera o style da prévia", () => {
    const s = estiloDoTema({ "--color-marca-600": "#1d4ed8", "--color-marca-100": "não" });
    expect(s).toEqual({ "--color-marca-600": "#1d4ed8" });
  });

  it("normaliza hex", () => {
    expect(normalizarHex(" #ABCDEF ")).toBe("#abcdef");
    expect(normalizarHex("#abc")).toBeNull();
    expect(normalizarHex(null)).toBeNull();
  });
});

describe("tokens do Edu+ em styles.css", () => {
  it("são os mesmos de TEMA_EDU", () => {
    const css = readFileSync(new URL("../../ui/src/styles.css", import.meta.url), "utf8");
    for (const [k, v] of Object.entries(TEMA_EDU)) {
      const m = css.match(new RegExp(`${k}:\\s*(#[0-9a-f]{6})\\s*;`, "i"));
      expect(m?.[1]?.toLowerCase(), k).toBe(v);
    }
  });
});
