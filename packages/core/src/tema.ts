/**
 * Motor de tema do white-label: a partir da cor principal (e da cor de destaque, opcional) de um
 * Produto, gera as variáveis CSS que recolorem o app do fã. Funções puras, sem DOM.
 *
 * Garantias (cobertas por testes com todos os matizes, cinzas, branco e preto):
 *   - marca-600 (botões com texto branco, texto de destaque sobre cartões) tem contraste ≥ 4,5 com o
 *     branco e o mesmo nível do Edu+ sobre o fundo (≥ 4,45);
 *   - marca-700 sobre marca-100 (selos, pílulas) tem contraste ≥ 4,5;
 *   - o início do gradiente da marca tem contraste ≥ 3 com o branco (texto grande sobre o gradiente);
 *   - o texto sobre a cor de destaque (branco ou tinta, o que contrastar mais) tem contraste ≥ 4,5.
 * Quando a cor do criador não atinge isso, ela é ajustada (só a claridade, o matiz fica) e o ajuste
 * vai em `ajustes`, para o painel mostrar o antes e o depois.
 *
 * Sem personalização (cor do Edu+ e sem destaque), devolve exatamente os tokens de hoje (`TEMA_EDU`),
 * que também estão em packages/ui/src/styles.css (um teste confere que os dois não divergem).
 */

export type Hex = `#${string}`;

/** Cor principal do Edu+ (a mesma de `--color-marca-600`). */
export const COR_MARCA = "#6c5ce7";
/** Fundo das telas (`--color-fundo`) e cor do texto (`--color-tinta`). */
export const COR_FUNDO = "#f5f5fb";
export const COR_TINTA = "#1d1a3a";
const BRANCO = "#ffffff";

export const TONS_MARCA = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type TomMarca = (typeof TONS_MARCA)[number];

/** Variáveis CSS que o tema define (todas com valor hex). */
export const VARIAVEIS_TEMA = [
  ...TONS_MARCA.map((t) => `--color-marca-${t}` as const),
  "--color-destaque",
  "--color-destaque-claro",
  "--color-destaque-escuro",
  "--color-destaque-contraste",
  "--color-moldura",
  "--marca-gradiente-de",
  "--marca-gradiente-ate",
  "--marca-noite-1",
  "--marca-noite-2",
  "--marca-noite-3",
  "--marca-sombra",
  "--marca-confete",
] as const;
export type VariavelTema = (typeof VARIAVEIS_TEMA)[number];
export type VarsTema = Record<VariavelTema, string>;

/** Os valores de hoje do Edu+ (styles.css). */
export const TEMA_EDU: VarsTema = {
  "--color-marca-50": "#f4f2ff",
  "--color-marca-100": "#ebe7ff",
  "--color-marca-200": "#d8d0ff",
  "--color-marca-300": "#bbaeff",
  "--color-marca-400": "#9b87fb",
  "--color-marca-500": "#7f6cf3",
  "--color-marca-600": "#6c5ce7",
  "--color-marca-700": "#5a48d1",
  "--color-marca-800": "#4434a8",
  "--color-marca-900": "#2b2680",
  "--color-destaque": "#6c5ce7",
  "--color-destaque-claro": "#ebe7ff",
  "--color-destaque-escuro": "#5a48d1",
  "--color-destaque-contraste": "#ffffff",
  "--color-moldura": "#e9e8f3",
  "--marca-gradiente-de": "#7d6cf5",
  "--marca-gradiente-ate": "#5847d6",
  "--marca-noite-1": "#5a4ae0",
  "--marca-noite-2": "#33289a",
  "--marca-noite-3": "#221b6e",
  "--marca-sombra": "#4c3bcf",
  "--marca-confete": "#c9bfff",
};

/** Pares prontos para o criador escolher (principal, destaque). */
export const PRESETS_TEMA: { nome: string; primaria: string; destaque: string | null }[] = [
  { nome: "Edu+", primaria: COR_MARCA, destaque: null },
  { nome: "Oceano", primaria: "#1d4ed8", destaque: "#06b6d4" },
  { nome: "Floresta", primaria: "#15803d", destaque: "#f59e0b" },
  { nome: "Coral", primaria: "#be123c", destaque: "#fb923c" },
  { nome: "Pôr do sol", primaria: "#c2410c", destaque: "#facc15" },
  { nome: "Grafite", primaria: "#334155", destaque: "#22c55e" },
  { nome: "Uva", primaria: "#7e22ce", destaque: "#ec4899" },
  { nome: "Petróleo", primaria: "#0f766e", destaque: "#a3e635" },
];

export interface AjusteTema {
  cor: "primaria" | "destaque";
  de: string;
  para: string;
  motivo: string;
}

export interface Tema {
  vars: VarsTema;
  /** Cores do criador que precisaram mudar para manter a leitura. */
  ajustes: AjusteTema[];
  /** Cor da barra do navegador (`theme-color`). */
  corTema: string;
}

/* ───────────── cor: hex, sRGB, luminância (WCAG) e OKLCH ───────────── */

export function hexValido(hex: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(hex);
}

/** Hex em minúsculas, ou null se inválido. */
export function normalizarHex(hex: string | null | undefined): string | null {
  const h = (hex ?? "").trim().toLowerCase();
  return hexValido(h) ? h : null;
}

type Rgb = [number, number, number];

function paraRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function paraHex(rgb: Rgb): string {
  return `#${rgb
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

const linear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gama = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

/** Luminância relativa (WCAG 2). */
export function luminancia(hex: string): number {
  const [r, g, b] = paraRgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre duas cores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

interface Oklch {
  l: number;
  c: number;
  h: number;
}

function rgbLinearParaOklch([r, g, b]: Rgb): Oklch {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  const h = c < 1e-6 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

function oklchParaRgbLinear({ l: L, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function paraOklch(hex: string): Oklch {
  return rgbLinearParaOklch(paraRgb(hex).map(linear) as Rgb);
}

const dentroDoGamut = (rgb: Rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** OKLCH → hex, reduzindo o croma (mantendo claridade e matiz) até a cor caber no sRGB. */
function deOklch(cor: Oklch): string {
  const alvo = { ...cor, l: Math.min(1, Math.max(0, cor.l)), c: Math.max(0, cor.c) };
  let rgb = oklchParaRgbLinear(alvo);
  if (!dentroDoGamut(rgb)) {
    let [lo, hi] = [0, alvo.c];
    for (let i = 0; i < 24; i++) {
      const meio = (lo + hi) / 2;
      if (dentroDoGamut(oklchParaRgbLinear({ ...alvo, c: meio }))) lo = meio;
      else hi = meio;
    }
    rgb = oklchParaRgbLinear({ ...alvo, c: lo });
  }
  return paraHex(rgb.map((v) => gama(Math.min(1, Math.max(0, v)))) as Rgb);
}

/**
 * Busca, mexendo só na claridade, a cor mais próxima da original que satisfaz `ok`. `sentido` diz
 * para onde andar (-1 escurece, +1 clareia). Devolve a original se ela já satisfaz.
 */
function ajustarClaridade(hex: string, ok: (h: string) => boolean, sentido: -1 | 1): string {
  if (ok(hex)) return hex;
  const base = paraOklch(hex);
  let [perto, longe] = [base.l, sentido < 0 ? 0 : 1];
  if (!ok(deOklch({ ...base, l: longe }))) return deOklch({ ...base, l: longe });
  for (let i = 0; i < 30; i++) {
    const meio = (perto + longe) / 2;
    if (ok(deOklch({ ...base, l: meio }))) longe = meio;
    else perto = meio;
  }
  return deOklch({ ...base, l: longe });
}

/* ───────────── geração do tema ───────────── */

const REF = Object.fromEntries(Object.entries(TEMA_EDU).map(([k, v]) => [k, paraOklch(v)])) as Record<VariavelTema, Oklch>;
const ref = (t: TomMarca) => REF[`--color-marca-${t}`];

const MIN_BRANCO = 4.5;
const MIN_FUNDO = 4.45; // o nível do Edu+ (#6c5ce7 sobre #f5f5fb ≈ 4,48)
const MIN_TEXTO = 4.5;
const MIN_GRADIENTE = 3;

const legivelComBranco = (h: string) => contraste(h, BRANCO) >= MIN_BRANCO && contraste(h, COR_FUNDO) >= MIN_FUNDO;

/** Deriva uma cor a partir da 600 do criador, com o mesmo deslocamento que ela tem no Edu+. */
function derivar(base: Oklch, chave: VariavelTema, limitesL: [number, number] = [0.08, 0.985]): string {
  const r = REF[chave];
  const r600 = ref(600);
  const l = Math.min(limitesL[1], Math.max(limitesL[0], base.l + (r.l - r600.l)));
  const c = r600.c > 0 ? base.c * (r.c / r600.c) : r.c;
  return deOklch({ l, c, h: base.h + (r.h - r600.h) });
}

function escala(p600: string): Record<TomMarca, string> {
  const base = paraOklch(p600);
  const r600 = ref(600);
  // Croma relativo ao do Edu+, com teto: cores muito saturadas não estouram os tons claros.
  const fatorC = r600.c > 0 ? Math.min(1.6, base.c / r600.c) : 0;
  const l50 = ref(50).l;
  // Tons escuros: até o 900 do Edu+, mas sempre abaixo da 600 do criador (cores muito escuras chegam ao preto).
  const l900 = Math.max(0, Math.min(ref(900).l, base.l - 0.16));
  const out = {} as Record<TomMarca, string>;
  for (const t of TONS_MARCA) {
    if (t === 600) {
      out[t] = p600;
      continue;
    }
    const r = ref(t);
    const l =
      t < 600
        ? base.l + ((r.l - r600.l) / (l50 - r600.l)) * (Math.max(l50, base.l + 0.05) - base.l)
        : base.l - ((r600.l - r.l) / (r600.l - ref(900).l)) * (base.l - l900);
    out[t] = deOklch({ l, c: r.c * fatorC, h: base.h });
  }
  return out;
}

/** Escala, gradientes, noite, sombra, confete e moldura a partir da 600 (já legível) do criador. */
function varsDaMarca(p600: string): VarsTema {
  const base = paraOklch(p600);
  const tons = escala(p600);
  tons[700] = ajustarClaridade(tons[700], (h) => contraste(h, tons[100]) >= MIN_TEXTO, -1);
  const vars = { ...TEMA_EDU };
  for (const t of TONS_MARCA) vars[`--color-marca-${t}`] = tons[t];
  vars["--marca-gradiente-de"] = ajustarClaridade(derivar(base, "--marca-gradiente-de"), (h) => contraste(h, BRANCO) >= MIN_GRADIENTE, -1);
  vars["--marca-gradiente-ate"] = derivar(base, "--marca-gradiente-ate");
  vars["--marca-noite-1"] = derivar(base, "--marca-noite-1");
  vars["--marca-noite-2"] = derivar(base, "--marca-noite-2", [0.08, 0.42]);
  vars["--marca-noite-3"] = derivar(base, "--marca-noite-3", [0.06, 0.32]);
  vars["--marca-sombra"] = derivar(base, "--marca-sombra");
  vars["--marca-confete"] = derivar(base, "--marca-confete", [0.75, 0.92]);
  vars["--color-moldura"] = deOklch({ l: REF["--color-moldura"].l, c: Math.min(0.02, base.c * 0.12), h: base.h });
  return vars;
}

/**
 * Tema do produto. `primaria` inválida cai na cor do Edu+; `destaque` nulo ou inválido usa a própria
 * marca. Sem personalização, devolve exatamente `TEMA_EDU`.
 */
export function gerarTema({ primaria, destaque }: { primaria?: string | null; destaque?: string | null }): Tema {
  const p = normalizarHex(primaria) ?? COR_MARCA;
  const d = normalizarHex(destaque);
  if (p === COR_MARCA && (d === null || d === COR_MARCA)) return { vars: { ...TEMA_EDU }, ajustes: [], corTema: COR_MARCA };

  const ajustes: AjusteTema[] = [];
  let p600 = p;
  if (!legivelComBranco(p600)) {
    // Cor clara demais para texto branco: escurece até ler bem (o matiz fica).
    p600 = ajustarClaridade(p600, legivelComBranco, -1);
    ajustes.push({ cor: "primaria", de: p, para: p600, motivo: "Escurecemos um pouco a cor principal para o texto dos botões ficar legível." });
  }
  // Só o destaque é personalizado: a marca continua exatamente a do Edu+.
  const vars = p600 === COR_MARCA ? { ...TEMA_EDU } : varsDaMarca(p600);
  const tons = Object.fromEntries(TONS_MARCA.map((t) => [t, vars[`--color-marca-${t}`]])) as Record<TomMarca, string>;

  if (d === null) {
    vars["--color-destaque"] = tons[600];
    vars["--color-destaque-claro"] = tons[100];
    vars["--color-destaque-escuro"] = tons[700];
    vars["--color-destaque-contraste"] = BRANCO;
  } else {
    const comBranco = contraste(d, BRANCO);
    const comTinta = contraste(d, COR_TINTA);
    let cor = d;
    let texto = comBranco >= comTinta ? BRANCO : COR_TINTA;
    if (Math.max(comBranco, comTinta) < MIN_TEXTO) {
      // Meio-termo: nem branco nem tinta leem bem. Afasta a claridade para o lado que já ganhava.
      cor =
        texto === BRANCO
          ? ajustarClaridade(d, (h) => contraste(h, BRANCO) >= MIN_TEXTO, -1)
          : ajustarClaridade(d, (h) => contraste(h, COR_TINTA) >= MIN_TEXTO, 1);
      texto = contraste(cor, BRANCO) >= contraste(cor, COR_TINTA) ? BRANCO : COR_TINTA;
      ajustes.push({ cor: "destaque", de: d, para: cor, motivo: "Ajustamos a cor de destaque para o texto em cima dela ficar legível." });
    }
    const od = paraOklch(cor);
    vars["--color-destaque"] = cor;
    vars["--color-destaque-claro"] = deOklch({ l: ref(100).l, c: Math.min(od.c, ref(100).c * 1.4), h: od.h });
    vars["--color-destaque-escuro"] = ajustarClaridade(
      deOklch({ ...od, l: od.l - 0.08 }),
      (h) => contraste(h, vars["--color-destaque-claro"]) >= MIN_TEXTO,
      -1,
    );
    vars["--color-destaque-contraste"] = texto;
  }

  return { vars, ajustes, corTema: tons[600] };
}

/** Bloco `:root{…}` para injetar no app do fã. Só passa variáveis conhecidas com valor hex. */
export function cssDoTema(vars: Partial<VarsTema>): string {
  const linhas = VARIAVEIS_TEMA.filter((k) => vars[k] && hexValido(vars[k] as string)).map((k) => `${k}:${vars[k]}`);
  return linhas.length ? `:root{${linhas.join(";")}}` : "";
}

/** As mesmas variáveis como `style` de um elemento (prévia do painel, sem recolorir a página toda). */
export function estiloDoTema(vars: Partial<VarsTema>): Record<string, string> {
  return Object.fromEntries(VARIAVEIS_TEMA.filter((k) => vars[k] && hexValido(vars[k] as string)).map((k) => [k, vars[k] as string]));
}
