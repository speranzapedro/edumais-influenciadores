/**
 * Extração de texto por página dos materiais enviados (PDF, DOCX, TXT/MD).
 * O texto por página alimenta a busca do agente e as citações de fonte.
 */

const TAMANHO_PAGINA_VIRTUAL = 3200;

export function tipoSuportado(mime: string, nome: string): "pdf" | "docx" | "texto" | null {
  const ext = nome.toLowerCase().split(".").pop() ?? "";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.includes("wordprocessingml") || ext === "docx") return "docx";
  if (mime.startsWith("text/") || ["txt", "md", "markdown", "csv"].includes(ext)) return "texto";
  return null;
}

/** Quebra um texto corrido em "páginas" virtuais respeitando parágrafos. */
export function paginarTexto(texto: string, tamanho = TAMANHO_PAGINA_VIRTUAL): string[] {
  const paragrafos = texto.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const paginas: string[] = [];
  let atual = "";
  for (const p of paragrafos) {
    if (atual && atual.length + p.length > tamanho) {
      paginas.push(atual.trim());
      atual = "";
    }
    atual += `${p}\n\n`;
  }
  if (atual.trim()) paginas.push(atual.trim());
  return paginas.length ? paginas : [""];
}

export async function extrairPaginas(bytes: Uint8Array, mime: string, nome: string): Promise<string[]> {
  const tipo = tipoSuportado(mime, nome);
  if (tipo === "pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: false });
    return (text as string[]).map((t) => t.replace(/[ \t]+\n/g, "\n").trim());
  }
  if (tipo === "docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return paginarTexto(value);
  }
  if (tipo === "texto") {
    return paginarTexto(new TextDecoder("utf-8").decode(bytes));
  }
  throw new Error(`Formato não suportado: ${nome}. Envie PDF, DOCX, TXT ou MD.`);
}
