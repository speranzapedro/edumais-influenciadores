import { usuarioDaSessao } from "@edu/db/next";
import { redirect } from "next/navigation";

/** Fã logado (Supabase Auth). Redireciona para /login se não houver sessão válida. */
export async function exigirAluno() {
  const usuario = await usuarioDaSessao("app");
  if (!usuario) redirect("/login");
  return usuario;
}

/** Endereço público deste app (links de e-mail). */
export const urlApp = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3007").replace(/\/$/, "");
