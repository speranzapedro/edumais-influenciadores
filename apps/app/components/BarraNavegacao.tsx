"use client";

import { cn } from "@edu/ui";
import { BarChart3, Home, Map as IconeMapa, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/trilhas", rotulo: "Trilhas", Icone: IconeMapa },
  { href: "/progresso", rotulo: "Progresso", Icone: BarChart3 },
  { href: "/", rotulo: "Início", Icone: Home, central: true },
  { href: "/criadores", rotulo: "Criadores", Icone: UsersRound },
  { href: "/perfil", rotulo: "Perfil", Icone: UserRound },
];

export function BarraNavegacao() {
  const path = usePathname();
  const ativo = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] px-3 pb-[max(env(safe-area-inset-bottom),10px)]">
      <div className="flex items-end justify-between rounded-[22px] border border-linha bg-superficie/95 px-2 pb-2 pt-2 shadow-[0_-8px_30px_-12px_rgba(29,26,58,0.18)] backdrop-blur">
        {ITENS.map(({ href, rotulo, Icone, central }) => {
          const on = ativo(href);
          if (central) {
            return (
              <Link key={href} href={href} className="-mt-7 flex w-16 flex-col items-center gap-1" aria-label={rotulo}>
                <span
                  className={cn(
                    "grid size-14 place-items-center rounded-full border-4 border-fundo text-white shadow-flutuante transition",
                    on ? "gradiente-marca scale-105" : "bg-marca-400",
                  )}
                >
                  <Icone className="size-6" strokeWidth={2.4} />
                </span>
                <span className={cn("text-[10px] font-semibold", on ? "text-marca-600" : "text-suave")}>{rotulo}</span>
              </Link>
            );
          }
          return (
            <Link key={href} href={href} className="flex w-16 flex-col items-center gap-1 py-1" aria-label={rotulo}>
              <Icone className={cn("size-[22px] transition", on ? "text-marca-600" : "text-suave")} strokeWidth={on ? 2.4 : 2} />
              <span className={cn("text-[10px] font-semibold", on ? "text-marca-600" : "text-suave")}>{rotulo}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
