import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./base";

export interface ItemAba {
  href: string;
  rotulo: ReactNode;
  /** Contador opcional ao lado do rótulo (ex.: nº de trilhas). */
  contagem?: number;
}

/**
 * Abas de navegação: cada aba é uma página (link), então funcionam sem JavaScript, mantêm a URL e o
 * "voltar" do navegador. A ativa é a de `ativa` (href exato).
 */
export function Abas({ itens, ativa, className, rotulo = "Seções" }: { itens: ItemAba[]; ativa: string; className?: string; rotulo?: string }) {
  return (
    <nav aria-label={rotulo} className={cn("flex gap-1 overflow-x-auto border-b border-linha", className)}>
      {itens.map((a) => {
        const atual = a.href === ativa;
        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={atual ? "page" : undefined}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition",
              atual ? "border-marca-600 text-marca-700" : "border-transparent text-suave hover:border-linha hover:text-tinta",
            )}
          >
            {a.rotulo}
            {a.contagem !== undefined && (
              <span className={cn("rounded-full px-1.5 text-[11px] font-bold", atual ? "bg-marca-100 text-marca-700" : "bg-fundo text-suave")}>
                {a.contagem}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export const classesAreaTexto =
  "w-full rounded-2xl border border-linha bg-superficie px-4 py-3 text-[15px] text-tinta outline-none transition placeholder:text-suave/70 focus:border-marca-400 focus:ring-4 focus:ring-marca-100";

/** Campo de texto longo com rótulo e ajuda, no mesmo visual do `Campo`. */
export function AreaTexto({ rotulo, ajuda, className, id, ...props }: ComponentProps<"textarea"> & { rotulo: ReactNode; ajuda?: ReactNode }) {
  const campoId = id ?? (typeof props.name === "string" ? `campo-${props.name}` : undefined);
  return (
    <label className="block" htmlFor={campoId}>
      <span className="mb-1.5 block text-sm font-semibold text-tinta-2">{rotulo}</span>
      <textarea id={campoId} className={cn(classesAreaTexto, className)} {...props} />
      {ajuda && <span className="mt-1 block text-xs text-suave">{ajuda}</span>}
    </label>
  );
}
