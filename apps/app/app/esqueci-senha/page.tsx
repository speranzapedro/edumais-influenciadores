import { Marca } from "@edu/ui";
import { FormEsqueci } from "./FormEsqueci";

export const dynamic = "force-dynamic";

export default async function EsqueciSenhaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="mx-auto min-h-dvh max-w-[440px] bg-fundo px-5 pb-10 pt-10">
      <Marca />
      <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Esqueci minha senha</h1>
      <p className="mb-6 mt-1 text-sm text-suave">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
      <FormEsqueci erroLink={erro === "link"} />
    </main>
  );
}
