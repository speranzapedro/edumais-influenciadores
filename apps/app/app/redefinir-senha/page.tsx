import { usuarioDaSessao } from "@edu/db/next";
import { Marca } from "@edu/ui";
import { redirect } from "next/navigation";
import { FormRedefinir } from "./FormRedefinir";

export const dynamic = "force-dynamic";

/** Aberta pelo link do e-mail (a sessão vem de /auth/confirmar). Sem sessão, pede um link novo. */
export default async function RedefinirSenhaPage() {
  if (!(await usuarioDaSessao("app"))) redirect("/esqueci-senha?erro=link");
  return (
    <main className="mx-auto min-h-dvh max-w-[440px] bg-fundo px-5 pb-10 pt-10">
      <Marca />
      <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Criar nova senha</h1>
      <p className="mb-6 mt-1 text-sm text-suave">Escolha a nova senha da sua conta.</p>
      <FormRedefinir />
    </main>
  );
}
