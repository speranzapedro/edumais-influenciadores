"use client";

import { useRef } from "react";
import { useConteudo } from "../conteudo";
import { gsap, MIDIA, useGSAP } from "../motion/gsap";
import { useRolarPara } from "../motion/ScrollSuave";
import { Logo } from "../ui/Logo";

const LINKS = [
  { href: "#como-funciona", rotulo: "Como funciona" },
  { href: "#beneficios", rotulo: "Benefícios" },
  { href: "#desafios", rotulo: "Desafios" },
  { href: "#plataformas", rotulo: "Plataformas" },
  { href: "#contato", rotulo: "Contato" },
] as const;

export function Rodape() {
  const ref = useRef<HTMLElement>(null);
  const rolar = useRolarPara();
  const conteudo = useConteudo();
  const c = conteudo.rodape;
  const links = conteudo.nav.links ? [...conteudo.nav.links, { href: "#contato", rotulo: "Contato" }] : LINKS;

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const mm = gsap.matchMedia();
      mm.add(MIDIA.movimento, () => {
        // O wordmark gigante é "escrito" à mão: o contorno corre e o preenchimento chega depois.
        gsap
          .timeline({ scrollTrigger: { trigger: q(".marca-gigante")[0], start: "top 95%", end: "bottom bottom", scrub: 0.8 } })
          .fromTo(q(".marca-gigante text"), { strokeDashoffset: 2600 }, { strokeDashoffset: 0, ease: "none", duration: 1 })
          .fromTo(q(".marca-gigante text"), { fillOpacity: 0 }, { fillOpacity: 1, ease: "none", duration: 0.4 }, 0.7);
      });
    },
    { scope: ref },
  );

  return (
    <footer ref={ref} className="relative overflow-hidden bg-[linear-gradient(#221b6e,#15103f)] pt-16 text-white">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-5 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <Logo claro />
          <p className="mt-3 max-w-[340px] text-[14.5px] text-white/60">{c.tagline}</p>
        </div>
        <nav className="flex flex-wrap gap-x-7 gap-y-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                rolar(l.href);
              }}
              className="font-mono text-[12.5px] uppercase tracking-[0.12em] text-white/70 transition-colors hover:text-white"
            >
              {l.rotulo}
            </a>
          ))}
        </nav>
      </div>

      <svg viewBox="0 0 1000 250" className="marca-gigante mt-10 block w-full" aria-hidden>
        <defs>
          <linearGradient id="grad-gigante" x1="0" x2="1">
            <stop offset="0" stopColor="#9b87fb" />
            <stop offset="0.6" stopColor="#6c5ce7" />
            <stop offset="1" stopColor="#ffd166" />
          </linearGradient>
        </defs>
        <text
          x="500"
          y="232"
          textAnchor="middle"
          fill="url(#grad-gigante)"
          stroke="#bbaeff"
          strokeWidth="2"
          strokeDasharray="2600"
          className="font-sans text-[300px] font-extrabold tracking-[-0.05em]"
        >
          Edu+
        </text>
      </svg>

      <div className="mx-auto flex max-w-[1180px] flex-col gap-2 border-t border-white/10 px-5 py-6 text-[12.5px] text-white/45 md:flex-row md:justify-between md:px-8">
        <span>
          © {new Date().getFullYear()} Edu+. {c.copyright}
        </span>
        <span className="font-mono uppercase tracking-[0.1em]">Aprender cabe na rotina ✦</span>
      </div>
    </footer>
  );
}
