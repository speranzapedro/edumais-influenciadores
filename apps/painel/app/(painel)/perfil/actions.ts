"use server";

import { lerPrecoEmCentavos } from "@edu/core";
import { produtoPadrao, publicarPagina, publicarProduto, salvarPerfilCriador, salvarPrecoAssinatura, salvarProduto, trocarSenha } from "@edu/db";
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
  // Até a tela de Produtos (fase 3): o formulário edita o primeiro produto, e o preço é do criador.
  const r = await tentar(async () => {
    const produto = await produtoPadrao(e);
    await salvarProduto(e, produto.id, { nome: texto(form, "nome"), slug: produto.slug, descricao: texto(form, "descricao") });
    await salvarPrecoAssinatura(e, preco);
  });
  revalidatePath("/", "layout");
  return r;
}

/** Abre a página publicando também o primeiro produto (até a tela de Produtos); fechar só fecha a página. */
export async function alternarPublicacao(publicar: boolean) {
  const e = await exigirCriador();
  const r = await tentar(async () => {
    if (publicar) await publicarProduto(e, (await produtoPadrao(e)).id, true);
    await publicarPagina(e, publicar);
  });
  revalidatePath("/", "layout");
  return r;
}

export async function alterarSenha(form: FormData) {
  const e = await exigirCriador();
  if (texto(form, "senha") !== texto(form, "confirmacao")) return { erro: "As senhas não conferem." };
  return tentar(() => trocarSenha({ authUserId: e.usuario.auth_user_id!, senha: texto(form, "senha") }));
}
