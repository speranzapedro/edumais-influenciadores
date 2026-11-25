import { describe, expect, it } from "vitest";
import { CAMINHO_MARCA, erroArquivoMarca, MIME_DA_EXTENSAO, MIMES_MARCA, TAMANHO_MAX_MARCA, tipoDaImagem } from "./marca";

const bytes = (...b: (number | string)[]) => new Uint8Array(b.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])));

describe("imagens de marca", () => {
  it("reconhece PNG, JPEG e WEBP pelos bytes iniciais", () => {
    expect(tipoDaImagem(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0, 0))).toBe("png");
    expect(tipoDaImagem(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpg");
    expect(tipoDaImagem(bytes("RIFF", 1, 2, 3, 4, "WEBPVP8 "))).toBe("webp");
  });

  it("recusa SVG, HTML, GIF, texto e arquivo curto", () => {
    expect(tipoDaImagem(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(tipoDaImagem(bytes("<html><script>"))).toBeNull();
    expect(tipoDaImagem(bytes("GIF89a"))).toBeNull();
    expect(tipoDaImagem(bytes("RIFF", 1, 2, 3, 4, "WAVE"))).toBeNull();
    expect(tipoDaImagem(bytes(0x89, "PN"))).toBeNull();
    expect(tipoDaImagem(new Uint8Array())).toBeNull();
  });

  it("valida tipo e tamanho antes de enviar", () => {
    expect(erroArquivoMarca({ mime: "image/png", tamanho: 1000 })).toBeNull();
    expect(erroArquivoMarca({ mime: "image/svg+xml", tamanho: 1000 })).toMatch("PNG, JPG ou WEBP");
    expect(erroArquivoMarca({ mime: "image/webp", tamanho: TAMANHO_MAX_MARCA + 1 })).toMatch("2 MB");
    expect(erroArquivoMarca({ mime: "image/jpeg", tamanho: 0 })).toMatch("vazio");
  });

  it("caminho no bucket só com uuid do criador e extensões aceitas", () => {
    const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
    expect(CAMINHO_MARCA.exec(`criadores/${id}/${id}.png`)?.[1]).toBe(id);
    expect(CAMINHO_MARCA.test(`criadores/${id}/${id}.svg`)).toBe(false);
    expect(CAMINHO_MARCA.test(`criadores/../${id}.png`)).toBe(false);
    for (const [mime, ext] of Object.entries(MIMES_MARCA)) expect(MIME_DA_EXTENSAO[ext]).toBe(mime);
  });
});
