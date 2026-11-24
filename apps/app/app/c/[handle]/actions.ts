"use server";

import { assinar, cadastrarFa, ErroAcesso, vitrinePorHandle } from "@edu/db";
import { type EstadoForm, entrarComSenha, ipDaRequest, sairDaSessao, usuarioDaSessao } from "@edu/db/next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const pagina = (handle: string, origem?: string | null) => `/c/${encodeURIComponent(handle)}${origem ? `?origem=${encodeURIComponent(origem)}` : ""}`;

async function produtoDo(handle: string) {
  const v = await vitrinePorHandle(handle);
  if (!v?.produto.publicado) throw new ErroAcesso("Este conteúdo ainda não está disponível.");
  return v;
}

/** Fã já logado: assina (cortesia) e vai para o início. */
export async function comecar(handle: string, origem: string | null): Promise<EstadoForm> {
  const aluno = await usuarioDaSessao("app");
  if (!aluno) redirect(`/login?next=${encodeURIComponent(pagina(handle, origem))}`);
  try {
    const v = await produtoDo(handle);
    await assinar({ aluno, produtoId: v.produto.id, origem });
  } catch (e) {
    if (e instanceof ErroAcesso) return { erro: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/?bemvindo=1");
}

/** "Não é você?": encerra a sessão aberta no aparelho e volta para a página do criador. */
export async function trocarConta(handle: string, origem: string | null) {
  await sairDaSessao("app");
  redirect(pagina(handle, origem));
}

/** Fã novo: cria a conta, assina e entra. */
export async function criarConta(handle: string, origem: string | null, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const senha = String(form.get("senha") ?? "");
  if (senha !== String(form.get("confirmacao") ?? "")) return { erro: "As senhas não conferem." };
  if (form.get("termos") !== "on") return { erro: "Para continuar, aceite os termos de uso e a política de privacidade." };
  const email = String(form.get("email") ?? "");
  try {
    const v = await produtoDo(handle);
    await cadastrarFa({
      produtoId: v.produto.id,
      nome: String(form.get("nome") ?? ""),
      email,
      senha,
      origem,
      ip: await ipDaRequest(),
    });
  } catch (e) {
    if (e instanceof ErroAcesso) return { erro: e.message };
    throw e;
  }
  const erro = await entrarComSenha("app", email, senha);
  if (erro) return { erro: `Conta criada! Entre com seu e-mail e senha. (${erro})` };
  redirect("/?bemvindo=1");
}
