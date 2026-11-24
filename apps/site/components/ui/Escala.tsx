"use client";

import { useEffect, useRef } from "react";

/**
 * Desenha o filho numa largura fixa e reduz proporcionalmente quando o espaço é menor
 * (mantém as mini-ilustrações intactas no celular).
 */
export function Escala({ largura, altura, children }: { largura: number; altura: number; children: React.ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const dentro = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = caixa.current!;
    const d = dentro.current!;
    const ro = new ResizeObserver(() => {
      const e = Math.min(1, c.clientWidth / largura);
      d.style.transform = `scale(${e})`;
      c.style.height = `${altura * e}px`;
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [largura, altura]);

  return (
    <div ref={caixa} className="relative w-full" style={{ height: altura }}>
      <div ref={dentro} className="absolute left-0 top-0 origin-top-left" style={{ width: `max(100%, ${largura}px)` }}>
        {children}
      </div>
    </div>
  );
}
