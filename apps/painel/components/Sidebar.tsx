"use client";

import { Avatar, cn, Marca } from "@edu/ui";
import { BadgeDollarSign, LayoutDashboard, LogOut, Megaphone, Package, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/app/login/actions";

const ITENS = [
  { href: "/", rotulo: "Início", Icone: LayoutDashboard },
  { href: "/produtos", rotulo: "Produtos", Icone: Package },
  { href: "/vendas", rotulo: "Vendas", Icone: BadgeDollarSign },
  { href: "/assinantes", rotulo: "Assinantes", Icone: Users },
  { href: "/divulgar", rotulo: "Divulgar", Icone: Megaphone },
  { href: "/perfil", rotulo: "Perfil", Icone: UserRound },
];

export function Sidebar({ usuario }: { usuario: { id: string; nome: string; handle: string; foto: string | null } }) {
  const path = usePathname();
  // As trilhas (estúdio e prévia) ficam dentro dos produtos.
  const ativo = (href: string) => (href === "/" ? path === "/" : path.startsWith(href) || (href === "/produtos" && path.startsWith("/trilhas")));
  // No estúdio a sidebar vira uma coluna de ícones para dar espaço ao rascunho e ao chat.
  const compacta = /^\/trilhas\/(?!nova)[^/]+/.test(path);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-dvh shrink-0 flex-col border-r border-linha bg-superficie py-6 transition-[width] print:hidden",
        compacta ? "w-[76px] px-3" : "w-[248px] px-4",
      )}
    >
      {compacta ? (
        <Link href="/" className="gradiente-marca mx-auto grid size-10 place-items-center rounded-xl shadow-flutuante" title="Edu+">
          <svg
            viewBox="0 0 24 24"
            className="size-5 text-white"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 17l5-5 4 4 7-8" />
            <path d="M15 8h5v5" />
          </svg>
        </Link>
      ) : (
        <Marca className="px-2" />
      )}
      <nav className="mt-9 space-y-1">
        {ITENS.map(({ href, rotulo, Icone }) => (
          <Link
            key={href}
            href={href}
            title={rotulo}
            className={cn(
              "flex items-center gap-3 rounded-xl py-2.5 text-sm font-semibold transition",
              compacta ? "justify-center px-0" : "px-3",
              ativo(href) ? "bg-marca-50 text-marca-700" : "text-tinta-2 hover:bg-fundo",
            )}
          >
            <Icone className={cn("size-[18px]", ativo(href) ? "text-marca-600" : "text-suave")} />
            {!compacta && rotulo}
          </Link>
        ))}
      </nav>
      <div className={cn("mt-auto rounded-2xl border border-linha bg-fundo", compacta ? "p-1.5" : "p-3")}>
        <div className={cn("flex items-center gap-2.5", compacta && "flex-col")}>
          <Avatar nome={usuario.nome} semente={usuario.id} tamanho={compacta ? 34 : 38} />
          {!compacta && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{usuario.nome}</div>
              <div className="truncate text-[11px] text-suave">@{usuario.handle}</div>
            </div>
          )}
          <form action={sair}>
            <button type="submit" className="grid size-8 place-items-center rounded-lg text-suave hover:bg-superficie hover:text-vermelho" title="Sair">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
