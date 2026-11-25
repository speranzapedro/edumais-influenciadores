"use server";

import { ErroAcesso, trocarSenha } from "@edu/db";
import { conferirSenha, type EstadoForm } from "@edu/db/next";
import { exigirAluno } from "@/lib/sessao";

export async function alterarSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const aluno = await exigirAluno();
  const atual = String(form.get("atual") ?? "");
  const nova = String(form.get("nova") ?? "");
  if (nova !== String(form.get("confirmacao") ?? "")) return { erro: "As senhas novas não conferem." };
  if (!(await conferirSenha("app", aluno, atual))) return { erro: "Senha atual incorreta." };
  try {
    await trocarSenha({ authUserId: aluno.auth_user_id, senha: nova });
  } catch (e) {
    if (e instanceof ErroAcesso) return { erro: e.message };
    throw e;
  }
  return { ok: "Senha alterada." };
}
