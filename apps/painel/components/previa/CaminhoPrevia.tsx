import type { AulaNaPrevia, ModuloNaPrevia } from "@edu/db";
import { Avatar, BarraProgresso, cn, Icone } from "@edu/ui";
import { ChevronLeft, Lock, Star } from "lucide-react";
import Link from "next/link";

// Mesmo zigue-zague do caminho no app do aluno (px).
const ZIGUE = [0, 52, 78, 52, 0, -52, -78, -52];

/**
 * Réplica da tela da trilha no app do aluno, como um aluno que ainda não começou a vê: a primeira
 * aula liberada e as outras com cadeado. Na prévia, todas abrem.
 */
export function CaminhoPrevia({
  trilha,
  modulos,
  totalAulas,
  criador,
  hrefAula,
}: {
  trilha: { titulo: string; icone: string };
  modulos: ModuloNaPrevia[];
  totalAulas: number;
  /** Quem preparou a trilha, como o fã vê no app. */
  criador: { id: string; nome: string } | null;
  hrefAula: (aulaId: string) => string;
}) {
  let indice = 0;
  return (
    <main>
      <div className="gradiente-marca relative overflow-hidden rounded-b-[28px] px-5 pb-6 pt-6 text-white">
        <div className="pointer-events-none absolute -right-12 -top-10 size-44 rounded-full bg-white/10" />
        <span className="inline-flex items-center gap-1 text-sm text-white/80">
          <ChevronLeft className="size-4" /> Trilhas
        </span>
        <div className="mt-4 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/15">
            <Icone nome={trilha.icone} className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight">{trilha.titulo}</h1>
            <div className="text-xs text-white/80">0 de {totalAulas} aulas · 0%</div>
          </div>
        </div>
        <BarraProgresso valor={0} cor="bg-white" trilho="bg-white/25" className="mt-4" />
      </div>

      {criador && (
        <div className="px-5">
          <div className="-mt-3 rounded-[22px] border border-linha bg-superficie p-4 shadow-card">
            <div className="flex items-center gap-3">
              <Avatar nome={criador.nome} semente={criador.id} tamanho={40} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium text-suave">Uma trilha de</div>
                <div className="truncate text-sm font-bold">{criador.nome}</div>
              </div>
            </div>
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
                const primeira = indice === 0;
                const x = ZIGUE[indice++ % ZIGUE.length];
                return (
                  <div
                    key={a.id}
                    className={primeira ? "mt-9 flex flex-col items-center" : "flex flex-col items-center"}
                    style={{ transform: `translateX(${x}px)` }}
                  >
                    <No aula={a} atual={primeira} href={hrefAula(a.id)} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function No({ aula, atual, href }: { aula: AulaNaPrevia; atual: boolean; href: string }) {
  return (
    <div className="flex w-40 flex-col items-center">
      <Link href={href} className="group relative transition active:translate-y-1" title={`Abrir a prévia da aula ${aula.ordem}`}>
        {atual && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 border-marca-200 bg-superficie px-3 py-1.5 text-xs font-bold text-marca-700 shadow-card">
            Começar
            <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-marca-200 bg-superficie" />
          </div>
        )}
        <span
          className={cn(
            "grid size-[68px] place-items-center rounded-full border-b-[6px] transition",
            atual
              ? "gradiente-marca animate-pulsar border-marca-800 text-white"
              : "border-[#d6d5e3] bg-[#e7e6f0] text-[#b3b2c6] group-hover:border-marca-300 group-hover:bg-marca-100 group-hover:text-marca-600",
          )}
        >
          {atual ? <Star className="size-7 fill-white" /> : <Lock className="size-6" />}
        </span>
      </Link>
      <div className={cn("mt-2 line-clamp-2 text-center text-xs font-semibold leading-tight", atual ? "text-tinta" : "text-suave")}>{aula.titulo}</div>
    </div>
  );
}
