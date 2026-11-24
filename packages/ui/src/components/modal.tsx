"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "./base";

export function Modal({
  aberto,
  aoFechar,
  titulo,
  children,
  largura = "max-w-lg",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: React.ReactNode;
  children: React.ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, aoFechar]);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-tinta/30 px-4 py-[8vh] backdrop-blur-sm">
      {/* Fundo clicável: fecha o modal (o teclado fecha com Esc). */}
      <button type="button" aria-label="Fechar" tabIndex={-1} className="fixed inset-0 cursor-default" onClick={aoFechar} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof titulo === "string" ? titulo : undefined}
        className={cn("relative w-full rounded-card border border-linha bg-superficie shadow-flutuante", largura)}
      >
        <div className="flex items-center justify-between border-b border-linha px-6 py-4">
          <h2 className="text-lg font-extrabold">{titulo}</h2>
          <button type="button" onClick={aoFechar} className="grid size-8 place-items-center rounded-lg text-suave hover:bg-fundo" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
