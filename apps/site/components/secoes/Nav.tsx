"use client";

import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { useConteudo } from "../conteudo";
import { gsap, ScrollTrigger, useGSAP } from "../motion/gsap";
import { useRolarPara } from "../motion/ScrollSuave";
import { BotaoChunky } from "../ui/BotaoChunky";
import { Logo } from "../ui/Logo";

export function Nav() {
  const ref = useRef<HTMLElement>(null);
  const rolar = useRolarPara();
  const c = useConteudo().nav;

  useGSAP(
    () => {
      const nav = ref.current!;
      gsap.from(nav, { yPercent: -140, duration: 1, ease: "mola", delay: 0.15 });

      // Some ao descer e volta ao subir; a barrinha mostra o quanto já foi lido.
      const esconder = gsap.to(nav, { yPercent: -150, duration: 0.45, ease: "power3.inOut", paused: true });
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (st) => {
          gsap.set(".nav-progresso", { scaleX: st.progress });
          if (st.scroll() < 140) esconder.reverse();
          else if (st.direction === 1) esconder.play();
          else esconder.reverse();
        },
      });
    },
    { scope: ref },
  );

  return (
    <header ref={ref} className="fixed inset-x-0 top-3 z-50 px-3 md:top-4">
      <nav className="relative mx-auto flex h-16 max-w-[1180px] items-center justify-between overflow-hidden rounded-[22px] border border-white/70 bg-white/75 pl-4 pr-3 shadow-[0_10px_40px_-18px_rgb(43_38_128/0.35)] backdrop-blur-xl">
        {/* biome-ignore lint/a11y/useValidAnchor: âncora real (#inicio); o clique só troca o salto pela rolagem suave */}
        <a
          href="#inicio"
          aria-label="Edu+, voltar ao início"
          onClick={(e) => {
            e.preventDefault();
            rolar("#inicio");
          }}
        >
          <Logo />
        </a>
        <ul className="hidden items-center gap-0.5 lg:flex">
          {c.links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  rolar(l.href);
                }}
                className="group relative whitespace-nowrap rounded-xl px-3 py-2 text-[14.5px] font-semibold xl:px-4 text-tinta-2 transition-colors hover:text-tinta"
              >
                {l.rotulo}
                <span className="absolute inset-x-3 bottom-1 xl:inset-x-4 h-[2px] origin-left scale-x-0 rounded-full bg-marca-500 transition-transform duration-300 ease-[var(--ease-suave)] group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>
        <BotaoChunky href={c.cta.href} tamanho="sm">
          <span className="hidden sm:inline">{c.cta.texto}</span>
          <span className="sm:hidden">{c.ctaCurto}</span>
          <ArrowRight className="size-4" />
        </BotaoChunky>
        <span className="nav-progresso gradiente-marca absolute bottom-0 left-0 h-[3px] w-full origin-left scale-x-0" />
      </nav>
    </header>
  );
}
