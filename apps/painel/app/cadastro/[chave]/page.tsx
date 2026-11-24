import { Marca } from "@edu/ui";
import { notFound, redirect } from "next/navigation";
import { ContatoWhatsApp } from "@/components/ContatoWhatsApp";
import { LadoMarca } from "@/components/LadoMarca";
import { PassosCriador } from "@/components/PassosCriador";
import { chaveDeCadastroValida } from "@/lib/cadastro";
import { criadorAtual } from "@/lib/sessao";
import { FormCadastro } from "./FormCadastro";

export const dynamic = "force-dynamic";

/** Cadastro só pelo link secreto que a Edu+ envia ao criador (chave errada = página inexistente). */
export default async function CadastroPage({ params }: { params: Promise<{ chave: string }> }) {
  const { chave } = await params;
  if (!chaveDeCadastroValida(chave)) notFound();
  if (await criadorAtual()) redirect("/");
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <LadoMarca />
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Marca />
          </div>
          <div className="mt-6 rounded-card border border-linha bg-superficie p-5 lg:hidden">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-marca-600">Como funciona</p>
            <PassosCriador compacto />
          </div>
          <h2 className="mt-8 text-2xl font-extrabold lg:mt-0">Crie sua conta de criador</h2>
          <p className="mb-6 mt-1 text-sm text-suave">Em poucos minutos você monta seu perfil e começa a primeira trilha com o Edu.</p>
          <FormCadastro chave={chave} />
          <ContatoWhatsApp className="mt-8 flex justify-center lg:hidden" />
        </div>
      </section>
    </main>
  );
}
