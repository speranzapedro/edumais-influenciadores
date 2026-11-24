"use client";

import { ArrowDown, ArrowRight, Clock3, Play, Smartphone, Sparkles } from "lucide-react";
import { Fragment, useRef } from "react";
import { useConteudo } from "../../conteudo";
import { LinkExperimente } from "../../experimente/LinkExperimente";
import { gsap, MIDIA, useGSAP } from "../../motion/gsap";
import { Magnetico } from "../../motion/Magnetico";
import { BotaoChunky } from "../../ui/BotaoChunky";
import { Rabisco } from "../../ui/Rabisco";
import { HeroIlustracao } from "./HeroIlustracao";

/** Uma palavra do título dentro de uma máscara, para subir "de dentro" da linha. */
function Palavra({ children, className = "", extra }: { children: string; className?: string; extra?: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="inline-block overflow-hidden pb-[0.12em] align-bottom [margin-bottom:-0.12em]">
        <span className={`palavra inline-block will-change-transform ${className}`}>{children}</span>
      </span>
      {extra}
    </span>
  );
}

/** `ilustracao` troca o palco da direita (padrão: o app do aluno em loop). */
export function Hero({ ilustracao }: { ilustracao?: React.ReactNode } = {}) {
  const ref = useRef<HTMLElement>(null);
  const c = useConteudo().hero;

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const mm = gsap.matchMedia();

      mm.add(MIDIA.movimento, () => {
        gsap.set(q("[data-revelar]:not([aria-hidden])"), { autoAlpha: 1 });
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        tl.from(q(".eyebrow"), { y: 18, autoAlpha: 0, duration: 0.7, ease: "power3.out" }, 0.1)
          .from(q(".palavra"), { yPercent: 118, rotation: 7, duration: 1.15, stagger: 0.065 }, 0.2)
          .from(q(".rabisco-engaja .traco"), { drawSVG: "0%", duration: 1, ease: "power2.inOut" }, 0.95)
          .from(q(".rabisco-rotina .traco"), { drawSVG: "0%", duration: 0.7, stagger: 0.15, ease: "power2.inOut" }, 1.3)
          .from(q(".sub"), { y: 24, autoAlpha: 0, duration: 0.9, ease: "power3.out" }, 0.75)
          .from(q(".cta > *"), { y: 26, autoAlpha: 0, scale: 0.94, duration: 0.8, stagger: 0.09, ease: "back.out(2)" }, 0.95)
          .from(q(".selo"), { y: 12, autoAlpha: 0, duration: 0.6, stagger: 0.07, ease: "power3.out" }, 1.2);

        // Ao sair da tela, o texto sobe um pouco mais rápido que a ilustração.
        gsap.to(q(".texto-hero"), {
          y: -90,
          autoAlpha: 0.2,
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom top", scrub: true },
        });
      });

      mm.add(MIDIA.reduzido, () => {
        gsap.set(q("[data-revelar]"), { autoAlpha: 1 });
      });
    },
    { scope: ref },
  );

  return (
    <section id="inicio" ref={ref} className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-36">
      {/* fundo: grid de pontos com máscara + brilho lilás */}
      <div className="grade-pontos pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_65%_40%,black_10%,transparent_75%)]" />
      <div className="pointer-events-none absolute -right-[20%] -top-[10%] size-[900px] rounded-full bg-[radial-gradient(circle,rgb(155_135_251/0.22),transparent_62%)]" />

      <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-4">
        <div className="texto-hero relative z-10 max-w-[620px]">
          <span
            data-revelar
            className="eyebrow inline-flex items-center gap-2.5 rounded-full border border-marca-200 bg-white/85 px-3.5 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-marca-700 shadow-[0_6px_20px_-12px_rgb(43_38_128/0.4)] backdrop-blur"
          >
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-verde/60" />
              <span className="relative size-2 rounded-full bg-verde" />
            </span>
            {c.eyebrow}
            <span className="-ml-1.5 animate-piscar text-marca-500">▍</span>
          </span>

          <h1 data-revelar className="mt-6 text-[clamp(2.75rem,7.4vw,5.1rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-tinta">
            {c.titulo.palavras.map((p, i) => (
              <Fragment key={i}>
                {i > 0 && " "}
                {i === c.titulo.circulo ? (
                  <Palavra
                    extra={
                      <Rabisco
                        tipo="circulo"
                        esticar
                        espessura={3}
                        className="rabisco-engaja absolute left-[-7%] top-[-22%] h-[144%] w-[114%] text-marca-500"
                      />
                    }
                  >
                    {p}
                  </Palavra>
                ) : i === c.titulo.destaque ? (
                  <Palavra
                    className="text-marca-600"
                    extra={
                      <Rabisco
                        tipo="sublinhadoDuplo"
                        esticar
                        espessura={3.4}
                        className="rabisco-rotina absolute -bottom-[0.2em] left-0 h-[0.36em] w-full text-laranja"
                      />
                    }
                  >
                    {p}
                  </Palavra>
                ) : (
                  <Palavra>{p}</Palavra>
                )}
              </Fragment>
            ))}
          </h1>

          <p data-revelar className="sub mt-7 max-w-[560px] text-[17px] leading-relaxed text-tinta-2 md:text-[19px]">
            <strong className="font-bold text-tinta">{c.subDestaque}</strong> <span className="max-md:hidden">{c.sub}</span>
          </p>

          <div className="cta mt-8 flex flex-col gap-4 sm:flex-row sm:items-center md:mt-9">
            <Magnetico forca={0.25}>
              {/* no celular, um CTA longo quebra em duas linhas em vez de vazar da tela */}
              <BotaoChunky
                href={c.ctaPrimario.href}
                tamanho="lg"
                className="w-full max-sm:whitespace-normal max-sm:px-5 max-sm:text-center max-sm:leading-tight sm:w-auto"
              >
                {c.ctaPrimario.texto}
                <ArrowRight className="size-[18px]" />
              </BotaoChunky>
            </Magnetico>
            <Magnetico forca={0.25}>
              <BotaoChunky href={c.ctaSecundario.href} tamanho="lg" variante="creme" className="w-full sm:w-auto sm:min-w-0">
                {c.ctaSecundario.texto}
                <ArrowDown className="size-[18px]" />
              </BotaoChunky>
            </Magnetico>
          </div>

          <LinkExperimente className="selo group mt-6 inline-flex items-center gap-2.5 text-[15px] font-bold text-marca-700 hover:text-marca-900">
            <span className="grid size-8 place-items-center rounded-full bg-marca-600 text-white shadow-flutuante transition-transform duration-300 ease-mola group-hover:scale-110">
              <Play className="ml-0.5 size-3.5 fill-current" />
            </span>
            Experimente uma aula de verdade
          </LinkExperimente>

          {c.selos && (
            <ul className="mt-7 hidden flex-wrap md:flex gap-x-6 gap-y-3 font-mono text-[12px] uppercase tracking-[0.1em] text-suave">
              <li data-revelar className="selo flex items-center gap-2">
                <Clock3 className="size-4 text-marca-500" /> {c.selos[0]}
              </li>
              <li data-revelar className="selo flex items-center gap-2">
                <Sparkles className="size-4 text-marca-500" /> {c.selos[1]}
              </li>
              <li data-revelar className="selo flex items-center gap-2">
                <Smartphone className="size-4 text-marca-500" /> {c.selos[2]}
              </li>
            </ul>
          )}
        </div>

        {ilustracao ?? <HeroIlustracao />}
      </div>
    </section>
  );
}
