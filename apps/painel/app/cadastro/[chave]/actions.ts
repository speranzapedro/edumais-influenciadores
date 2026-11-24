"use server";

import { cadastrarCriador, ErroAcesso } from "@edu/db";
import { type EstadoForm, entrarComSenha, ipDaRequest } from "@edu/db/next";
import { redirect } from "next/navigation";
import { chaveDeCadastroValida } from "@/lib/cadastro";

/** Cadastro do criador pelo link secreto: cria a conta, o perfil e o produto, e já abre a sessão. */
export async function cadastrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  if (!chaveDeCadastroValida(String(form.get("chave") ?? ""))) return { erro: "Este link de cadastro não é mais válido. Fale com a equipe da Edu+." };
  const senha = String(form.get("senha") ?? "");
  if (senha !== String(form.get("confirmacao") ?? "")) return { erro: "As senhas não conferem." };
  if (form.get("termos") !== "on") return { erro: "Para continuar, aceite os termos de uso e a política de privacidade." };
  const email = String(form.get("email") ?? "");
  try {
    await cadastrarCriador({
      nome: String(form.get("nome") ?? ""),
      handle: String(form.get("handle") ?? ""),
      email,
      senha,
      ip: await ipDaRequest(),
    });
  } catch (e) {
    if (e instanceof ErroAcesso) return { erro: e.message };
    throw e;
  }
  const erro = await entrarComSenha("painel", email, senha);
  if (erro) return { erro };
  redirect("/perfil?bem-vindo=1");
}
