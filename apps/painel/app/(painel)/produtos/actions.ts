"use server";

import { erroOrientacao, normalizarOrientacao, objetivoDefinido } from "@edu/core";
import {
  atualizarTrilha,
  criarProduto,
  criarTrilha,
  excluirProduto,
  exigirProdutoDoCriador,
  listarProdutos,
  publicarProduto,
  registrarAuditoria,
  reordenarProdutos,
  salvarProduto,
} from "@edu/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirCriador, tentar } from "@/lib/sessao";

const texto = (form: FormData, k: string) => String(form.get(k) ?? "");
const atualizar = () => revalidatePath("/", "layout");

export type EstadoProduto = { erro?: string; ok?: string } | null;

/** Novo produto: cria em rascunho e abre a página dele. */
export async function novoProduto(_: EstadoProduto, form: FormData): Promise<EstadoProduto> {
  const e = await exigirCriador();
  const r = await tentar(() => criarProduto(e, { nome: texto(form, "nome"), slug: texto(form, "slug"), descricao: texto(form, "descricao") }));
  if ("erro" in r) return { erro: r.erro };
  atualizar();
  redirect(`/produtos/${r.dados.id}`);
}

export async function salvarDetalhes(produtoId: string, _: EstadoProduto, form: FormData): Promise<EstadoProduto> {
  const e = await exigirCriador();
  const r = await tentar(() => salvarProduto(e, produtoId, { nome: texto(form, "nome"), slug: texto(form, "slug"), descricao: texto(form, "descricao") }));
  if ("erro" in r) return { erro: r.erro };
  atualizar();
  return { ok: "Produto salvo." };
}

export async function alternarProduto(produtoId: string, publicar: boolean) {
  const e = await exigirCriador();
  const r = await tentar(() => publicarProduto(e, produtoId, publicar));
  atualizar();
  return r;
}

/** Sobe ou desce o produto uma posição na página. */
export async function moverProduto(produtoId: string, direcao: -1 | 1) {
  const e = await exigirCriador();
  const ids = (await listarProdutos(e)).map((p) => p.id);
  const i = ids.indexOf(produtoId);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await reordenarProdutos(e, ids);
  atualizar();
}

export async function apagarProduto(produtoId: string) {
  const e = await exigirCriador();
  const r = await tentar(() => excluirProduto(e, produtoId));
  if ("erro" in r) return r;
  atualizar();
  redirect("/produtos");
}

/** Cria a trilha dentro do produto e abre o estúdio. */
export async function novaTrilha(produtoId: string, form: FormData) {
  const e = await exigirCriador();
  await exigirProdutoDoCriador(e, produtoId);
  const titulo = texto(form, "titulo").trim();
  const objetivo = normalizarOrientacao({ objetivo: texto(form, "objetivo") }).objetivo;
  const voltar = (erro: string): never => redirect(`/produtos/${produtoId}/trilhas/nova?${new URLSearchParams({ titulo, objetivo, erro })}`);
  if (titulo.length < 3) voltar("Dê um título à trilha.");
  if (!objetivoDefinido(objetivo)) voltar("Descreva o objetivo da trilha.");
  const erroObjetivo = erroOrientacao({ objetivo, conteudos: "", complementos: "" });
  if (erroObjetivo) voltar(erroObjetivo);

  const trilha = await criarTrilha({
    produtoId,
    criadorId: e.usuario.id,
    titulo: titulo.slice(0, 120),
    descricao: texto(form, "descricao").trim().slice(0, 500) || undefined,
    cor: texto(form, "cor") || "lilas",
    icone: texto(form, "icone") || "book-open",
  });
  await atualizarTrilha(trilha.id, { orientacao_objetivo: objetivo });
  await registrarAuditoria({ ator: e.usuario.id, acao: "trilha.criada", entidade: "trilhas", entidadeId: trilha.id, dados: { produtoId } });
  redirect(`/trilhas/${trilha.id}/editar`);
}
