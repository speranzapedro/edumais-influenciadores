"use server";

import { assinar, cadastrarFa, ErroAcesso, vitrinePorHandle } from "@edu/db";
import { type EstadoForm, entrarComSenha, ipDaRequest, sairDaSessao, usuarioDaSessao } from "@edu/db/next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Onde o fã estava: a página do criador (/@criador) ou a de um produto (/@criador/<produto>). */
export interface Entrada {
  handle: string;
  origem: string | null;
  /** Produto pelo qual o fã chegou (fica no relatório "entrou por"). */
  produto?: { id: string; slug: string } | null;
}

const paginaDe = (e: Entrada) =>
  `/@${encodeURIComponent(e.handle)}${e.produto ? `/${e.produto.slug}` : ""}${e.origem ? `?origem=${encodeURIComponent(e.origem)}` : ""}`;

/** Página aberta para novos fãs (a assinatura é do criador e libera todos os produtos publicados). */
async function paginaDo(handle: string) {
  const v = await vitrinePorHandle(handle);
  if (!v?.publicada) throw new ErroAcesso("Este conteúdo ainda não está disponível.");
  return v;
}

/** Fã já logado: assina (cortesia) e vai para o início. */
export async function comecar(e: Entrada): Promise<EstadoForm> {
  const aluno = await usuarioDaSessao("app");
  if (!aluno) redirect(`/login?next=${encodeURIComponent(paginaDe(e))}`);
  try {
    const v = await paginaDo(e.handle);
    await assinar({ aluno, criadorId: v.criador.id, produtoEntradaId: e.produto?.id, origem: e.origem });
  } catch (err) {
    if (err instanceof ErroAcesso) return { erro: err.message };
    throw err;
  }
  revalidatePath("/", "layout");
  redirect("/?bemvindo=1");
}

/** "Não é você?": encerra a sessão aberta no aparelho e volta para a mesma página. */
export async function trocarConta(e: Entrada) {
  await sairDaSessao("app");
  redirect(paginaDe(e));
}

/** Fã novo: cria a conta, assina e entra. */
export async function criarConta(e: Entrada, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const senha = String(form.get("senha") ?? "");
  if (senha !== String(form.get("confirmacao") ?? "")) return { erro: "As senhas não conferem." };
  if (form.get("termos") !== "on") return { erro: "Para continuar, aceite os termos de uso e a política de privacidade." };
  const email = String(form.get("email") ?? "");
  try {
    const v = await paginaDo(e.handle);
    await cadastrarFa({
      criadorId: v.criador.id,
      produtoEntradaId: e.produto?.id,
      nome: String(form.get("nome") ?? ""),
      email,
      senha,
      origem: e.origem,
      ip: await ipDaRequest(),
    });
  } catch (err) {
    if (err instanceof ErroAcesso) return { erro: err.message };
    throw err;
  }
  const erro = await entrarComSenha("app", email, senha);
  if (erro) return { erro: `Conta criada! Entre com seu e-mail e senha. (${erro})` };
  redirect("/?bemvindo=1");
}
