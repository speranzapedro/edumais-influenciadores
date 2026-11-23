/**
 * Às vezes o modelo escapa duas vezes os acentos dentro do JSON das tools (`\\u00e7` em vez de `ç`).
 * Depois do parse, o texto fica com a sequência literal `ç`, que aparece assim para o aluno.
 * Estas funções trocam essas sequências pelo caractere real, sem mexer em trechos de código
 * (entre crases), onde um `ç` pode ser intencional.
 */

// Par substituto (emoji etc.) ou uma sequência isolada; não casa se a barra já estiver escapada.
const SEQUENCIA = /(?<!\\)\\u([dD][89abAB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})|(?<!\\)\\u([0-9a-fA-F]{4})/g;
const TEM_SEQUENCIA = /(?<!\\)\\u[0-9a-fA-F]{4}/;
// Blocos ``` … ``` e trechos `…` ficam como estão.
const CODIGO = /(```[\s\S]*?```|`[^`\n]*`)/;

function decodificarTrecho(s: string): string {
  return s.replace(SEQUENCIA, (inteira, alto?: string, baixo?: string, unico?: string) => {
    if (alto && baixo) return String.fromCharCode(parseInt(alto, 16), parseInt(baixo, 16));
    const cp = parseInt(unico!, 16);
    // Metade de par solta ou caractere de controle (fora quebra de linha e tab): mantém o texto.
    if (cp >= 0xd800 && cp <= 0xdfff) return inteira;
    if (cp < 0x20 && cp !== 0x0a && cp !== 0x09) return inteira;
    return String.fromCharCode(cp);
  });
}

const partesForaDeCodigo = (s: string) => s.split(CODIGO).filter((_, i) => i % 2 === 0);

/** O texto tem `\uXXXX` literal fora de trechos de código? */
export function temEscapeUnicode(s: string): boolean {
  return TEM_SEQUENCIA.test(s) && partesForaDeCodigo(s).some((p) => TEM_SEQUENCIA.test(p));
}

/** Troca `\uXXXX` literal pelo caractere, preservando trechos de código. */
export function desescaparUnicode(s: string): string {
  if (!TEM_SEQUENCIA.test(s)) return s;
  return s
    .split(CODIGO)
    .map((p, i) => (i % 2 === 0 ? decodificarTrecho(p) : p))
    .join("");
}

/** Aplica `desescaparUnicode` em todas as strings de um valor (objetos e listas, recursivo). */
export function desescaparProfundo<T>(v: T): T {
  if (typeof v === "string") return desescaparUnicode(v) as T;
  if (Array.isArray(v)) return v.map(desescaparProfundo) as T;
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, desescaparProfundo(x)])) as T;
  }
  return v;
}

/** Caminhos (ex.: `modulos[0].titulo`) das strings que ainda têm `\uXXXX` literal fora de código. */
export function camposComEscapeUnicode(v: unknown, caminho = "", out: string[] = []): string[] {
  if (typeof v === "string") {
    if (temEscapeUnicode(v)) out.push(caminho);
  } else if (Array.isArray(v)) {
    for (const [i, x] of v.entries()) camposComEscapeUnicode(x, `${caminho}[${i}]`, out);
  } else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) camposComEscapeUnicode(x, caminho ? `${caminho}.${k}` : k, out);
  }
  return out;
}
