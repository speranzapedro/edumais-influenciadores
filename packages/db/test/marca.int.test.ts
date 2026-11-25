import { randomUUID } from "node:crypto";
import { limparBanco, novoCriador, recarregar } from "@edu/testing";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/client";
import { ErroAcesso, ErroPermissao } from "../src/erros";
import { caminhoDaUrlMarca, confirmarEnvioMarca, prepararEnvioMarca, removerMarca, salvarFotoCriador, urlDaMarca } from "../src/marca";
import { exigirProdutoDoCriador, salvarIdentidadeProduto } from "../src/produtos";

beforeAll(limparBanco);

/** PNG 1×1 de verdade. */
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

async function enviar(url: string, corpo: Uint8Array | string, mime = "image/png") {
  const r = await fetch(url, { method: "PUT", body: corpo as BodyInit, headers: { "Content-Type": mime } });
  expect(r.ok, await r.clone().text()).toBe(true);
}

const existe = async (caminho: string) => {
  const pasta = caminho.slice(0, caminho.lastIndexOf("/"));
  const { data } = await db().storage.from("marcas").list(pasta);
  return (data ?? []).some((f) => `${pasta}/${f.name}` === caminho);
};

async function logoEnviado(c: Awaited<ReturnType<typeof novoCriador>>) {
  const { caminho, url } = await prepararEnvioMarca(c.escopo, { mime: "image/png", tamanho: PNG.length });
  await enviar(url, PNG);
  return (await confirmarEnvioMarca(c.escopo, caminho)).caminho;
}

describe("imagens de marca", () => {
  it("prepara o envio só de PNG/JPG/WEBP até 2 MB, no espaço do criador", async () => {
    const c = await novoCriador();
    const p = await prepararEnvioMarca(c.escopo, { mime: "image/webp", tamanho: 1000 });
    expect(p.caminho).toMatch(new RegExp(`^criadores/${c.usuario.id}/[0-9a-f-]{36}\\.webp$`));
    expect(p.url).toContain("/storage/v1/object/upload/sign/marcas/");
    await expect(prepararEnvioMarca(c.escopo, { mime: "image/svg+xml", tamanho: 1000 })).rejects.toThrow(ErroAcesso);
    await expect(prepararEnvioMarca(c.escopo, { mime: "image/png", tamanho: 3 * 1024 * 1024 })).rejects.toThrow("2 MB");
  });

  it("confirma uma imagem de verdade e a deixa pública", async () => {
    const c = await novoCriador();
    const caminho = await logoEnviado(c);
    const url = urlDaMarca(caminho);
    expect(caminhoDaUrlMarca(url)).toBe(caminho);
    const r = await fetch(url);
    expect(r.status).toBe(200);
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(PNG);
  });

  it("recusa e apaga arquivo que finge ser imagem; recusa caminho de outro criador", async () => {
    const c = await novoCriador();
    const { caminho, url } = await prepararEnvioMarca(c.escopo, { mime: "image/png", tamanho: 40 });
    await enviar(url, '<svg onload="alert(1)"></svg>');
    await expect(confirmarEnvioMarca(c.escopo, caminho)).rejects.toThrow("não é uma imagem");
    expect(await existe(caminho)).toBe(false);

    const outro = await novoCriador();
    await expect(confirmarEnvioMarca(outro.escopo, caminho)).rejects.toThrow(ErroPermissao);
    await expect(confirmarEnvioMarca(c.escopo, `criadores/${c.usuario.id}/${randomUUID()}.png`)).rejects.toThrow("Não encontramos");
    await expect(confirmarEnvioMarca(c.escopo, "criadores/../segredo.png")).rejects.toThrow(ErroPermissao);
  });

  it("trocar o logo do produto apaga o arquivo antigo", async () => {
    const c = await novoCriador();
    const primeiro = await logoEnviado(c);
    await salvarIdentidadeProduto(c.escopo, c.produto.id, { corPrimaria: "#1d4ed8", corDestaque: null, logoPath: primeiro });
    expect((await exigirProdutoDoCriador(c.escopo, c.produto.id)).logo_path).toBe(primeiro);

    const segundo = await logoEnviado(c);
    await salvarIdentidadeProduto(c.escopo, c.produto.id, { corPrimaria: "#1d4ed8", corDestaque: null, logoPath: segundo });
    expect(await existe(primeiro)).toBe(false);
    expect(await existe(segundo)).toBe(true);

    await salvarIdentidadeProduto(c.escopo, c.produto.id, { corPrimaria: "#1d4ed8", corDestaque: null, logoPath: null });
    expect(await existe(segundo)).toBe(false);
  });

  it("foto do perfil: salva a URL pública no perfil e no usuário; trocar apaga a anterior", async () => {
    const c = await novoCriador();
    const foto = await logoEnviado(c);
    await salvarFotoCriador(c.escopo, foto);
    let r = await recarregar(c);
    expect(r.escopo.perfil.foto_url).toBe(urlDaMarca(foto));
    expect(r.usuario.avatar_url).toBe(urlDaMarca(foto));

    const nova = await logoEnviado(c);
    await salvarFotoCriador(r.escopo, nova);
    expect(await existe(foto)).toBe(false);
    await salvarFotoCriador((await recarregar(c)).escopo, null);
    r = await recarregar(c);
    expect(r.escopo.perfil.foto_url).toBeNull();
    expect(await existe(nova)).toBe(false);

    const outro = await novoCriador();
    await expect(salvarFotoCriador(outro.escopo, nova)).rejects.toThrow(ErroPermissao);
    // Caminho alheio é ignorado ao remover.
    await removerMarca(outro.escopo, foto);
  });
});
