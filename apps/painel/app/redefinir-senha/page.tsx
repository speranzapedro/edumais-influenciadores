import { usuarioDaSessao } from "@edu/db/next";
import { Marca } from "@edu/ui";
import { redirect } from "next/navigation";
import { FormRedefinir } from "./FormRedefinir";

export const dynamic = "force-dynamic";

/** Aberta pelo link do e-mail (a sessão vem de /auth/confirmar). Sem sessão, pede um link novo. */
export default async function RedefinirSenhaPage() {
  if (!(await usuarioDaSessao("painel"))) redirect("/esqueci-senha?erro=link");
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Marca />
        <h1 className="mt-8 text-2xl font-extrabold">Criar nova senha</h1>
        <p className="mb-6 mt-1 text-sm text-suave">Escolha a nova senha da sua conta.</p>
        <FormRedefinir />
      </div>
    </main>
  );
}
