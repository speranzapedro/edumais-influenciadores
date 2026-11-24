"use server";

import { destinoSeguro, type EstadoForm, entrarComSenha, sairDaSessao } from "@edu/db/next";
import { redirect } from "next/navigation";

export async function entrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const erro = await entrarComSenha("app", String(form.get("email") ?? ""), String(form.get("senha") ?? ""));
  if (erro) return { erro };
  redirect(destinoSeguro(form.get("next")));
}

export async function sair() {
  await sairDaSessao("app");
  redirect("/login");
}
