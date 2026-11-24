"use server";

import { type EstadoForm, pedirRedefinicao } from "@edu/db/next";
import { urlApp } from "@/lib/sessao";

/** Manda o link de redefinição. A resposta é a mesma com ou sem conta, para não revelar e-mails. */
export async function pedirLink(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const erro = await pedirRedefinicao("app", String(form.get("email") ?? ""), urlApp());
  if (erro) return { erro };
  return { ok: "Se houver uma conta com este e-mail, você vai receber um link para criar uma nova senha. Confira também o spam." };
}
