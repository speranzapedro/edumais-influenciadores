import { randomUUID } from "node:crypto";
import { CAMINHO_MARCA, erroArquivoMarca, MIMES_MARCA, TAMANHO_MAX_MARCA, tipoDaImagem } from "@edu/core";
import { db, ok } from "./client";
import type { EscopoCriador } from "./criador";
import { ErroAcesso, ErroPermissao } from "./erros";

/**
 * Imagens de marca do criador no bucket público `marcas` (logo dos produtos e foto do perfil).
 * O navegador envia direto ao Storage com uma URL assinada; depois o servidor confere os bytes do
 * arquivo e apaga o que não for PNG, JPEG ou WEBP de verdade.
 */

const BUCKET = "marcas";

/** URL pública de um arquivo de marca. */
export function urlDaMarca(caminho: string): string {
  return db().storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

/** Caminho no bucket a partir da URL pública (null se a URL não é de uma marca). */
export function caminhoDaUrlMarca(url: string | null | undefined): string | null {
  const m = url?.match(/\/storage\/v1\/object\/public\/marcas\/(criadores\/[^?#]+)$/);
  return m && CAMINHO_MARCA.test(m[1]) ? m[1] : null;
}

function exigirCaminhoDoCriador(e: EscopoCriador, caminho: string) {
  const m = CAMINHO_MARCA.exec(caminho);
  if (!m || m[1] !== e.usuario.id) throw new ErroPermissao("Arquivo inválido.");
}

/** Prepara o envio de uma imagem: valida tipo e tamanho e devolve o caminho e a URL assinada. */
export async function prepararEnvioMarca(e: EscopoCriador, p: { mime: string; tamanho: number }): Promise<{ caminho: string; url: string }> {
  const erro = erroArquivoMarca(p);
  if (erro) throw new ErroAcesso(erro);
  const caminho = `criadores/${e.usuario.id}/${randomUUID()}.${MIMES_MARCA[p.mime]}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(caminho);
  if (error || !data) throw new Error(`[storage] preparar envio: ${error?.message ?? "sem URL"}`);
  return { caminho, url: data.signedUrl };
}

/**
 * Confere o arquivo enviado: tem de existir, caber em 2 MB e ser de fato a imagem que a extensão diz.
 * Se não for, apaga e recusa. Devolve a URL pública.
 */
export async function confirmarEnvioMarca(e: EscopoCriador, caminho: string): Promise<{ caminho: string; url: string }> {
  exigirCaminhoDoCriador(e, caminho);
  const { data, error } = await db().storage.from(BUCKET).download(caminho);
  if (error || !data) throw new ErroAcesso("Não encontramos a imagem enviada. Tente de novo.");
  const bytes = new Uint8Array(await data.arrayBuffer());
  const extensao = caminho.slice(caminho.lastIndexOf(".") + 1);
  if (bytes.length > TAMANHO_MAX_MARCA || tipoDaImagem(bytes.subarray(0, 16)) !== extensao) {
    await db().storage.from(BUCKET).remove([caminho]);
    throw new ErroAcesso("O arquivo não é uma imagem PNG, JPG ou WEBP válida.");
  }
  return { caminho, url: urlDaMarca(caminho) };
}

/** Apaga um arquivo de marca do próprio criador (melhor esforço: usado ao trocar ou tirar a imagem). */
export async function removerMarca(e: EscopoCriador, caminho: string | null | undefined) {
  if (!caminho) return;
  const m = CAMINHO_MARCA.exec(caminho);
  if (!m || m[1] !== e.usuario.id) return;
  await db().storage.from(BUCKET).remove([caminho]);
}

/** Foto do perfil do criador (caminho já conferido por confirmarEnvioMarca; null tira a foto). */
export async function salvarFotoCriador(e: EscopoCriador, caminho: string | null) {
  if (caminho) exigirCaminhoDoCriador(e, caminho);
  const url = caminho ? urlDaMarca(caminho) : null;
  const agora = new Date().toISOString();
  ok(await db().from("criador_perfis").update({ foto_url: url, updated_at: agora }).eq("user_id", e.usuario.id), "foto do criador");
  ok(await db().from("users").update({ avatar_url: url, updated_at: agora }).eq("id", e.usuario.id), "avatar");
  const anterior = caminhoDaUrlMarca(e.perfil.foto_url);
  if (anterior && anterior !== caminho) await removerMarca(e, anterior);
}
