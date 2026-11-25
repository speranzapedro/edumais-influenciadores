import { criadoresDoFa, trilhasDoAluno } from "@edu/db";
import { Avatar, Cartao } from "@edu/ui";
import { Map as IconeMapa } from "lucide-react";
import Link from "next/link";
import { ListaTrilhas } from "@/components/ListaTrilhas";
import { exigirAluno } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function TrilhasPage() {
  const aluno = await exigirAluno();
  const [trilhas, criadores] = await Promise.all([trilhasDoAluno(aluno), criadoresDoFa(aluno.id)]);
  // Agrupa por criador (na ordem das assinaturas).
  const grupos = criadores.map((c) => ({ criador: c, trilhas: trilhas.filter((t) => t.criador?.id === c.id) })).filter((g) => g.trilhas.length);
  const outras = trilhas.filter((t) => !criadores.some((c) => c.id === t.criador?.id));

  return (
    <main className="px-5 pt-7">
      <h1 className="text-[22px] font-extrabold tracking-tight">Trilhas</h1>
      <p className="text-sm text-suave">Dos criadores que você acompanha.</p>

      {trilhas.length === 0 && (
        <Cartao className="mt-6 p-8 text-center">
          <IconeMapa className="mx-auto size-10 text-marca-300" />
          <div className="mt-3 font-bold">Nenhuma trilha por aqui ainda</div>
          <p className="mt-1 text-sm text-suave">Quando um criador que você assina publicar uma trilha, ela aparece aqui.</p>
        </Cartao>
      )}

      {grupos.map((g) => (
        <section key={g.criador.id} className="mt-6">
          <Link href={`/c/${g.criador.handle}`} className="mb-3 flex items-center gap-2.5">
            <Avatar nome={g.criador.nome} semente={g.criador.id} tamanho={32} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{g.criador.nome}</div>
              <div className="truncate text-[11px] text-suave">{g.criador.produtos.join(", ")}</div>
            </div>
          </Link>
          <ListaTrilhas trilhas={g.trilhas} />
        </section>
      ))}
      {outras.length > 0 && (
        <section className="mt-6">
          <ListaTrilhas trilhas={outras} />
        </section>
      )}
    </main>
  );
}
