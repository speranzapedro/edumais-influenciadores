import { AtalhoEduTrilha } from "@edu/aula-ui";
import { type AulaNoCaminho, caminhoDaTrilha, eduDisponivel, produtoDaTrilha, trilhasDoAluno } from "@edu/db";
import { Avatar, BarraProgresso, cn, Icone } from "@edu/ui";
import { Check, ChevronLeft, Lock, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EstiloMarca } from "@/components/EstiloMarca";
import { exigirAluno } from "@/lib/sessao";

export const dynamic = "force-dynamic";

// Deslocamento horizontal em zigue-zague dos nós do caminho (px).
const ZIGUE = [0, 52, 78, 52, 0, -52, -78, -52];

export default async function CaminhoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aluno = await exigirAluno();
  const [dados, edu, resumos, marca] = await Promise.all([caminhoDaTrilha(id, aluno), eduDisponivel(aluno, id), trilhasDoAluno(aluno), produtoDaTrilha(id)]);
  if (!dados) notFound();
  const resumo = resumos.find((t) => t.id === id);
  const criador = resumo?.criador ?? null;
  const autor = criador ? { id: criador.id, nome: criador.nome, href: `/@${criador.handle}` } : null;
  const { trilha, aulas } = dados;
  const feitas = aulas.filter((a) => a.concluida).length;
  const pct = aulas.length ? Math.round((feitas / aulas.length) * 100) : 0;

  const modulos: { id: string; titulo: string; aulas: AulaNoCaminho[] }[] = [];
  for (const a of aulas) {
    const ultimo = modulos[modulos.length - 1];
    if (ultimo && ultimo.id === a.modulo_id) ultimo.aulas.push(a);
    else modulos.push({ id: a.modulo_id, titulo: a.modulo_titulo ?? "Módulo", aulas: [a] });
  }
  let indice = 0;

  return (
    <main>
      {marca && <EstiloMarca primaria={marca.produto.cor_primaria} destaque={marca.produto.cor_destaque} />}
      <div className="gradiente-marca relative overflow-hidden rounded-b-[28px] px-5 pb-6 pt-6 text-white">
        <div className="pointer-events-none absolute -right-12 -top-10 size-44 rounded-full bg-white/10" />
        <Link href="/trilhas" className="inline-flex items-center gap-1 text-sm text-white/80">
          <ChevronLeft className="size-4" /> Trilhas
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/15">
            <Icone nome={trilha.icone} className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight">{trilha.titulo}</h1>
            <div className="text-xs text-white/80">
              {feitas} de {aulas.length} aulas · {pct}%
            </div>
          </div>
        </div>
        <BarraProgresso valor={pct} cor="bg-white" trilho="bg-white/25" className="mt-4" />
      </div>

      {autor && (
        <div className="px-5">
          <div className="-mt-3 rounded-[22px] border border-linha bg-superficie p-4 shadow-card">
            <Link href={autor.href} className="flex items-center gap-3">
              <Avatar nome={autor.nome} semente={autor.id} tamanho={40} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium text-suave">Uma trilha de</div>
                <div className="truncate text-sm font-bold">{autor.nome}</div>
              </div>
            </Link>
          </div>
        </div>
      )}

      <div className="px-5 pb-10">
        {modulos.map((m, mi) => (
          <section key={m.id} className="mt-7">
            <div className="rounded-2xl border border-linha bg-superficie px-4 py-3 shadow-card">
              <div className="text-[11px] font-bold uppercase tracking-wider text-marca-600">Módulo {mi + 1}</div>
              <div className="text-sm font-bold">{m.titulo}</div>
            </div>
            <div className="mt-6 flex flex-col items-center gap-5">
              {m.aulas.map((a) => {
                const x = ZIGUE[indice++ % ZIGUE.length];
                return (
                  <div
                    key={a.id}
                    className={a.estado === "atual" ? "mt-9 flex flex-col items-center" : "flex flex-col items-center"}
                    style={{ transform: `translateX(${x}px)` }}
                  >
                    <No aula={a} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {edu && <AtalhoEduTrilha trilha={{ id: trilha.id, titulo: trilha.titulo }} />}
    </main>
  );
}

function No({ aula }: { aula: AulaNoCaminho }) {
  const perfeita = aula.concluida && aula.total && aula.acertos === aula.total;
  const conteudo = (
    <>
      {aula.estado === "atual" && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 border-marca-200 bg-superficie px-3 py-1.5 text-xs font-bold text-marca-700 shadow-card">
          Começar
          <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-marca-200 bg-superficie" />
        </div>
      )}
      <span
        className={cn(
          "grid size-[68px] place-items-center rounded-full border-b-[6px] transition",
          aula.estado === "concluida" && "border-[#17a35b] bg-verde text-white",
          aula.estado === "atual" && "gradiente-marca animate-pulsar border-marca-800 text-white",
          aula.estado === "bloqueada" && "border-[#d6d5e3] bg-[#e7e6f0] text-[#b3b2c6]",
        )}
      >
        {aula.estado === "concluida" ? (
          perfeita ? (
            <Star className="size-7 fill-white" />
          ) : (
            <Check className="size-8" strokeWidth={3} />
          )
        ) : aula.estado === "atual" ? (
          <Star className="size-7 fill-white" />
        ) : (
          <Lock className="size-6" />
        )}
      </span>
    </>
  );
  return (
    <div className="flex w-40 flex-col items-center">
      {aula.estado === "bloqueada" ? (
        <div className="relative">{conteudo}</div>
      ) : (
        <Link href={`/aula/${aula.id}`} className="relative transition active:translate-y-1">
          {conteudo}
        </Link>
      )}
      <div className={cn("mt-2 line-clamp-2 text-center text-xs font-semibold leading-tight", aula.estado === "bloqueada" ? "text-suave" : "text-tinta")}>
        {aula.titulo}
      </div>
    </div>
  );
}
