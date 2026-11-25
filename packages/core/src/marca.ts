/**
 * Imagens de marca do criador (logo do produto e foto do perfil): PNG, JPEG ou WEBP de até 2 MB.
 * O tipo declarado pelo navegador não basta: o servidor confere os bytes iniciais do arquivo.
 */

export const TAMANHO_MAX_MARCA = 2 * 1024 * 1024;

export type ExtensaoMarca = "png" | "jpg" | "webp";

/** Tipos aceitos (MIME → extensão no Storage). SVG fica de fora: pode carregar script. */
export const MIMES_MARCA: Readonly<Record<string, ExtensaoMarca>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const MIME_DA_EXTENSAO: Readonly<Record<ExtensaoMarca, string>> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/** Caminho de um arquivo de marca no bucket: criadores/<criador>/<arquivo>.<ext>. */
export const CAMINHO_MARCA = /^criadores\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.(png|jpg|webp)$/;

const comeca = (b: Uint8Array, assinatura: number[], de = 0) => assinatura.every((x, i) => b[de + i] === x);

/** Tipo real da imagem pelos bytes iniciais (null se não for PNG, JPEG nem WEBP). */
export function tipoDaImagem(bytes: Uint8Array): ExtensaoMarca | null {
  if (comeca(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (comeca(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  // RIFF....WEBP
  if (comeca(bytes, [0x52, 0x49, 0x46, 0x46]) && comeca(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

/** Mensagem de erro do arquivo escolhido (null = pode enviar). Vale no navegador e no servidor. */
export function erroArquivoMarca(p: { mime: string; tamanho: number }): string | null {
  if (!MIMES_MARCA[p.mime]) return "Envie uma imagem PNG, JPG ou WEBP.";
  if (p.tamanho <= 0) return "O arquivo está vazio.";
  if (p.tamanho > TAMANHO_MAX_MARCA) return "A imagem pode ter no máximo 2 MB.";
  return null;
}
