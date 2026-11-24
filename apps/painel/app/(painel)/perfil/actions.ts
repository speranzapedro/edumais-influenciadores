"use server";

import { lerPrecoEmCentavos } from "@edu/core";
import { publicarProduto, salvarPerfilCriador, salvarProduto, trocarSenha } from "@edu/db";
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

export async function salvarDadosProduto(form: FormData) {
  const e = await exigirCriador();
  let preco: number | null;
  try {
    preco = lerPrecoEmCentavos(texto(form, "preco"));
  } catch (err) {
    return { erro: (err as Error).message };
  }
  const r = await tentar(() => salvarProduto(e, { nome: texto(form, "nome"), descricao: texto(form, "descricao"), precoCentavos: preco }));
  revalidatePath("/", "layout");
  return r;
}

export async function alternarPublicacao(publicar: boolean) {
  const e = await exigirCriador();
  const r = await tentar(() => publicarProduto(e, publicar));
  revalidatePath("/", "layout");
  return r;
}

export async function alterarSenha(form: FormData) {
  const e = await exigirCriador();
  if (texto(form, "senha") !== texto(form, "confirmacao")) return { erro: "As senhas não conferem." };
  return tentar(() => trocarSenha({ authUserId: e.usuario.auth_user_id!, senha: texto(form, "senha") }));
}
