"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLenis } from "../motion/ScrollSuave";
import { Celular } from "../ui/Celular";

/**
 * Abre a aula jogável (/experimente). No celular vai para a página, em tela cheia, como o app;
 * no desktop abre um celular por cima da landing com a aula dentro (iframe).
 */
export function LinkExperimente({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const lenis = useLenis();
  const [aberto, setAberto] = useState(false);
  const href = "/experimente";

  useEffect(() => {
    if (!aberto) return;
    lenis?.stop();
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", fechar);
    return () => {
      lenis?.start();
      window.removeEventListener("keydown", fechar);
    };
  }, [aberto, lenis]);

  return (
    <>
      <a
        href={href}
        className={className}
        onClick={(e) => {
          if (!window.matchMedia("(min-width: 768px)").matches) return;
          e.preventDefault();
          setAberto(true);
        }}
      >
        {children}
      </a>
      {aberto &&
        createPortal(
          // biome-ignore lint/a11y/useKeyWithClickEvents: clicar fora fecha; o teclado fecha com Esc e pelo botão Fechar
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Experimente uma aula"
            className="fixed inset-0 z-[90] grid place-items-center bg-noite/70 p-6 backdrop-blur-sm [animation:aparecer_.3s_ease-out]"
            onClick={() => setAberto(false)}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: só impede que o clique no celular feche o diálogo */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: idem; o teclado não depende deste clique */}
            <div className="relative [animation:subir_.45s_var(--ease-mola)]" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="absolute -right-14 top-0 grid size-11 place-items-center rounded-full bg-white text-tinta shadow-flutuante transition hover:scale-105"
              >
                <X className="size-5" />
              </button>
              <div className="text-[min(16px,calc((100dvh-80px)/53))]">
                <Celular className="h-[53em] w-[25em]" tela="bg-fundo">
                  <iframe src={`${href}?embutida=1`} title="Aula de demonstração" className="absolute inset-0 size-full pt-[2.6em]" />
                </Celular>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
