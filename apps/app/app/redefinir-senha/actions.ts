"use server";

import { type EstadoForm, redefinirSenha } from "@edu/db/next";
import { redirect } from "next/navigation";

/** Nova senha na sessão aberta pelo link do e-mail. */
export async function redefinir(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const senha = String(form.get("senha") ?? "");
  if (senha !== String(form.get("confirmacao") ?? "")) return { erro: "As senhas não conferem." };
  const erro = await redefinirSenha("app", senha);
  if (erro) return { erro };
  redirect("/");
}
