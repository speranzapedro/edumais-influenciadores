"use client";

import { useRef } from "react";
import { gsap, MIDIA, useGSAPPerto } from "../motion/gsap";

/**
 * Pares de formas com a mesma estrutura de comandos: o GSAP interpola número a número,
 * então a onda "respira" de uma para a outra enquanto a página rola.
 */
const FORMAS = [
  [
    "M0 96V58c120-28 240-42 360-30s240 50 360 46 240-48 360-52 240 24 360 30v44z",
    "M0 96V44c130-18 250-34 370-26s230 44 350 50 250-40 370-46 230 30 350 20v54z",
  ],
  [
    "M0 96V50c140-30 260-36 380-20s250 46 370 40 230-44 350-46 230 20 340 26v46z",
    "M0 96V60c120-14 250-30 370-24s240 40 360 44 240-36 360-42 240 28 350 18v40z",
  ],
] as const;

/** Borda ondulada entre seções. `topo` fica acima da seção; `base`, abaixo e espelhada. */
export function Onda({ cor, lado = "topo", forma = 0 }: { cor: string; lado?: "topo" | "base"; forma?: 0 | 1 }) {
  const ref = useRef<SVGPathElement>(null);

  useGSAPPerto(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MIDIA.movimento, () => {
        gsap.to(ref.current, {
          attr: { d: FORMAS[forma][1] },
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 1.2 },
        });
      });
    },
    { scope: ref },
  );

  return (
    <svg
      className={`pointer-events-none absolute left-0 h-16 w-full md:h-24 ${lado === "topo" ? "bottom-[calc(100%-2px)]" : "top-[calc(100%-2px)] rotate-180"} ${cor}`}
      viewBox="0 0 1440 96"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path ref={ref} d={FORMAS[forma][0]} fill="currentColor" />
    </svg>
  );
}
