import { Marca } from "@edu/ui";
import { FormEsqueci } from "./FormEsqueci";

export const dynamic = "force-dynamic";

export default async function EsqueciSenhaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Marca />
        <h1 className="mt-8 text-2xl font-extrabold">Esqueci minha senha</h1>
        <p className="mb-6 mt-1 text-sm text-suave">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
        <FormEsqueci erroLink={erro === "link"} />
      </div>
    </main>
  );
}
