import { trilhasDoAluno } from "@edu/db";
import { Cartao } from "@edu/ui";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { ListaTrilhas } from "@/components/ListaTrilhas";
import { ShellCriador } from "@/components/ShellCriador";
import { exigirAssinante } from "@/lib/criador";

export const dynamic = "force-dynamic";

/** Todas as trilhas do criador que o fã acessa, agrupadas por produto (curso). */
export default async function TrilhasDoCriador({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { aluno, criador, produtos, base } = await exigirAssinante(handle, `/@${handle}/trilhas`);
  const trilhas = await trilhasDoAluno(aluno, { criadorId: criador.id });
  const grupos = produtos.map((p) => ({ produto: p, trilhas: trilhas.filter((t) => t.produto.id === p.id) })).filter((g) => g.trilhas.length);
  return (
    <ShellCriador base={base} marca={produtos[0]}>
      <main className="px-5 pt-7">
        <h1 className="text-[22px] font-extrabold tracking-tight">Trilhas</h1>
        <p className="text-sm text-suave">Os cursos de {criador.nome} liberados para você.</p>
        {grupos.length === 0 ? (
          <Cartao className="mt-6 p-8 text-center">
            <Sparkles className="mx-auto size-10 text-marca-300" />
            <div className="mt-3 font-bold">Sua primeira trilha está a caminho</div>
            <p className="mt-1 text-sm text-suave">Você recebe um aviso quando {criador.nome} publicar.</p>
          </Cartao>
        ) : (
          grupos.map((g) => (
            <section key={g.produto.id} className="mt-6">
              <Link href={`${base}/${g.produto.slug}`} className="mb-3 block text-base font-bold hover:text-marca-700">
                {g.produto.nome}
              </Link>
              <ListaTrilhas trilhas={g.trilhas} />
            </section>
          ))
        )}
      </main>
    </ShellCriador>
  );
}
