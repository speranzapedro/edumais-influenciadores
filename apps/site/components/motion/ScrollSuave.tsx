"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "./gsap";

const LenisCtx = createContext<Lenis | null>(null);
export const useLenis = () => useContext(LenisCtx);

/** Scroll suave (Lenis) dirigido pelo ticker do GSAP, para o ScrollTrigger ler a mesma posição. */
export function ScrollSuave({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  // A aula de demonstração rola como o app (nativo), sem o scroll suave da landing.
  const semLenis = usePathname().startsWith("/experimente");

  useEffect(() => {
    if (semLenis || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const l = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95, anchors: { offset: -90 } });
    l.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(l);
    return () => {
      gsap.ticker.remove(tick);
      l.destroy();
      setLenis(null);
    };
  }, [semLenis]);

  return <LenisCtx.Provider value={lenis}>{children}</LenisCtx.Provider>;
}

/** Rola até uma âncora usando o Lenis quando disponível. */
export function useRolarPara() {
  const lenis = useLenis();
  return (alvo: string) => {
    const el = document.querySelector(alvo);
    if (!el) return;
    if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -90, duration: 1.4 });
    else el.scrollIntoView({ behavior: "smooth" });
  };
}
