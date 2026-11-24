import type { AulaNaPrevia, ModuloNaPrevia } from "@edu/db";
import { CabecalhoCartao, Cartao, cn } from "@edu/ui";
import { ChevronRight, Layers } from "lucide-react";
import Link from "next/link";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function resumoAula(a: AulaNaPrevia) {
  const partes = [plural(a.textos, "explicação", "explicações")];
  if (a.desafios) partes.push(plural(a.desafios, "desafio", "desafios"));
  if (a.abertas) partes.push(plural(a.abertas, "pergunta aberta", "perguntas abertas"));
  return partes.join(" · ");
}

/** Módulos e aulas publicados; cada aula abre a prévia dela. */
export function ListaAulas({ modulos, hrefAula, atual }: { modulos: ModuloNaPrevia[]; hrefAula: (aulaId: string) => string; atual?: string }) {
  // Numeração corrida, como "Aula N" no player.
  let n = 0;
  return (
    <Cartao className="p-6">
      <CabecalhoCartao titulo="Módulos e aulas" icone={<Layers className="size-4 text-marca-600" />} />
      <p className="mt-1 text-xs text-suave">O que está publicado no app. Clique numa aula para abrir como o aluno.</p>
      <div className="mt-4 space-y-5">
        {modulos.map((m, mi) => (
          <section key={m.id}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-marca-600">Módulo {mi + 1}</div>
            <div className="text-sm font-bold">{m.titulo}</div>
            <div className="mt-2 divide-y divide-linha rounded-2xl border border-linha">
              {m.aulas.map((a) => {
                const numero = ++n;
                return (
                  <Link
                    key={a.id}
                    href={hrefAula(a.id)}
                    aria-current={a.id === atual ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 px-3.5 py-2.5 first:rounded-t-2xl last:rounded-b-2xl",
                      a.id === atual ? "bg-marca-50" : "hover:bg-fundo",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                        a.id === atual ? "bg-marca-600 text-white" : "bg-fundo text-tinta-2",
                      )}
                    >
                      {numero}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm font-semibold", a.id === atual ? "text-marca-700" : "group-hover:text-marca-600")}>
                        {a.titulo}
                      </span>
                      <span className="block truncate text-[11px] text-suave">{resumoAula(a)}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-suave group-hover:text-marca-600" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Cartao>
  );
}
