"use server";

import { lerPrecoEmCentavos } from "@edu/core";
import { publicarPagina, salvarPerfilCriador, salvarPrecoAssinatura, trocarSenha } from "@edu/db";
import { revalidatePath } from "next/cache";
import { exigirCriador, tentar } from "@/lib/sessao";

const texto = (form: FormData, k: string) => String(form.get(k) ?? "");

export async function salvarPerfil(form: FormData) {
  const e = await exigirCriador();
  const r = await tentar(() =>
    salvarPerfilCriador(e, {
      nomePublico: texto(form, "nome"),
      handle: texto(form, "handle"),
      bio: texto(form, "bio"),
      redes: { instagram: texto(form, "instagram"), tiktok: texto(form, "tiktok"), youtube: texto(form, "youtube") },
    }),
  );
  revalidatePath("/", "layout");
  return r;
}

/** Preço mensal da assinatura da página (vale para todos os produtos). */
export async function salvarPreco(form: FormData) {
  const e = await exigirCriador();
  let preco: number | null;
  try {
    preco = lerPrecoEmCentavos(texto(form, "preco"));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  const r = await tentar(() => salvarPrecoAssinatura(e, preco));
  revalidatePath("/", "layout");
  return r;
}

/** Abre a página para novos fãs (exige um produto publicado) ou fecha. */
export async function alternarPagina(publicar: boolean) {
  const e = await exigirCriador();
  const r = await tentar(() => publicarPagina(e, publicar));
  revalidatePath("/", "layout");
  return r;
}

export async function alterarSenha(form: FormData) {
  const e = await exigirCriador();
  if (texto(form, "senha") !== texto(form, "confirmacao")) return { erro: "As senhas não conferem." };
  return tentar(() => trocarSenha({ authUserId: e.usuario.auth_user_id!, senha: texto(form, "senha") }));
}
