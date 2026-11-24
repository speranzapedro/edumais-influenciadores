"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Flip } from "gsap/Flip";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { type RefObject, useEffect, useState } from "react";

type TracoSvg = SVGElement & { __traco?: number };
interface DadosTraco {
  alvo: TracoSvg;
  f: number;
  _pt?: { r: (ratio: number, d: unknown) => void; d: unknown; _next?: DadosTraco["_pt"] };
  add: (alvo: object, prop: string, inicio: number, fim: number) => void;
  _props: string[];
}

/** Fração visível do traço (0 a 1), com `pathLength="1"` no path: o tamanho do traço na tela não importa. */
function aplicarTraco(alvo: TracoSvg, f: number) {
  alvo.__traco = f;
  const s = alvo.style;
  if (f >= 0.9999) {
    s.strokeDasharray = "";
    s.strokeDashoffset = "";
    s.visibility = "";
    return;
  }
  s.strokeDasharray = `${Math.max(f, 0)} 2`;
  s.strokeDashoffset = "0";
  // Traço vazio com ponta arredondada ainda desenharia um ponto.
  s.visibility = f <= 0.0001 ? "hidden" : "";
}

/**
 * Desenha traços como o DrawSVG (`traco: "0%"` a `"100%"`), mas sem medir o path a cada quadro. O
 * DrawSVG mede de novo em todo quadro quando o traço tem `vector-effect="non-scaling-stroke"` (caso
 * dos rabiscos), forçando layout; com `pathLength="1"` a fração já é a do traço inteiro.
 */
const TracoPlugin = {
  name: "traco",
  init(this: DadosTraco, alvo: TracoSvg, valor: string | number) {
    const fim = Math.min(Math.max(Number.parseFloat(String(valor)) / 100, 0), 1);
    this.alvo = alvo;
    this.add(this, "f", alvo.__traco ?? 1, fim);
    this._props.push("traco");
  },
  render(ratio: number, dados: DadosTraco) {
    let pt = dados._pt;
    while (pt) {
      pt.r(ratio, pt.d);
      pt = pt._next;
    }
    aplicarTraco(dados.alvo, dados.f);
  },
};

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, DrawSVGPlugin, MotionPathPlugin, SplitText, Flip, CustomEase, TracoPlugin);
  CustomEase.create("mola", "M0,0 C0.18,0.9 0.32,1.18 0.52,1.06 0.68,0.97 0.82,1 1,1");
  CustomEase.create("saida", "M0,0 C0.22,1 0.36,1 1,1");
}

/** Breakpoints usados nos `gsap.matchMedia()` das seções. */
export const MIDIA = {
  movimento: "(prefers-reduced-motion: no-preference)",
  reduzido: "(prefers-reduced-motion: reduce)",
  desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
  mobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
} as const;

export { CustomEase, DrawSVGPlugin, Flip, gsap, MotionPathPlugin, ScrollTrigger, SplitText, useGSAP };

/**
 * `useGSAP` que só monta as animações quando a seção chega perto da tela (`margem` de antecedência).
 * Na carga, só o topo da página mede e anima; o resto entra conforme a rolagem, sem uma tarefa longa
 * no celular. Os elementos com `data-revelar` ficam ocultos pelo CSS até a montagem.
 */
export function useGSAPPerto(
  montar: () => void,
  { scope, dependencies = [], margem = "60% 0px" }: { scope: RefObject<Element | null>; dependencies?: unknown[]; margem?: string },
) {
  const [perto, setPerto] = useState(false);
  useEffect(() => {
    const el = scope.current;
    if (!el || perto) return;
    const io = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setPerto(true);
          io.disconnect();
        }
      },
      { rootMargin: margem },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [scope, margem, perto]);
  useGSAP(
    () => {
      if (perto) montar();
    },
    { scope, dependencies: [perto, ...dependencies] },
  );
}
