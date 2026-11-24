import { destinoSeguro } from "@edu/db/next";
import { Marca } from "@edu/ui";
import { redirect } from "next/navigation";
import { ContatoWhatsApp } from "@/components/ContatoWhatsApp";
import { LadoMarca } from "@/components/LadoMarca";
import { criadorAtual } from "@/lib/sessao";
import { FormLogin } from "./FormLogin";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await criadorAtual()) redirect(destinoSeguro(next));
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <LadoMarca />
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Marca />
          </div>
          <h2 className="mt-8 text-2xl font-extrabold lg:mt-0">Entrar</h2>
          <p className="mb-6 mt-1 text-sm text-suave">Acesse o painel com seu e-mail e senha.</p>
          <FormLogin next={next} />
          <ContatoWhatsApp className="mt-8 flex justify-center lg:hidden" />
        </div>
      </section>
    </main>
  );
}
