"use server";

import { confirmarEnvioMarca, prepararEnvioMarca, salvarFotoCriador, salvarIdentidadeProduto } from "@edu/db";
import { revalidatePath } from "next/cache";
import { exigirCriador, tentar } from "@/lib/sessao";

/** 1º passo do envio de imagem: valida tipo/tamanho e devolve a URL assinada do Storage. */
export async function prepararEnvio(mime: string, tamanho: number) {
  const e = await exigirCriador();
  return tentar(() => prepararEnvioMarca(e, { mime, tamanho }));
}

/** 2º passo: confere os bytes do arquivo enviado (apaga se não for imagem) e devolve a URL pública. */
export async function confirmarEnvio(caminho: string) {
  const e = await exigirCriador();
  return tentar(() => confirmarEnvioMarca(e, caminho));
}

/** Cores e logo do produto (o logo já enviado e conferido; null tira o logo). */
export async function salvarIdentidade(produtoId: string, d: { corPrimaria: string; corDestaque: string | null; logoPath: string | null }) {
  const e = await exigirCriador();
  const r = await tentar(() => salvarIdentidadeProduto(e, produtoId, d));
  revalidatePath("/", "layout");
  return r;
}

/** Foto do perfil (já enviada e conferida; null tira a foto). */
export async function salvarFoto(caminho: string | null) {
  const e = await exigirCriador();
  const r = await tentar(() => salvarFotoCriador(e, caminho));
  revalidatePath("/", "layout");
  return r;
}
