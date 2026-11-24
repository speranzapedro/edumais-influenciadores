"use client";

import { ArrowRight, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { useConteudo } from "../../conteudo";
import { gsap, MIDIA, useGSAP } from "../../motion/gsap";
import { useRolarPara } from "../../motion/ScrollSuave";
import { Avatar } from "../../ui/Avatar";
import { Onda } from "../../ui/Onda";

/** Perguntas frequentes do criador em acordeão (uma aberta por vez). */
export function Faq() {
  const ref = useRef<HTMLElement>(null);
  const c = useConteudo().criador!.faq;
  const [aberta, setAberta] = useState(0);
  const rolar = useRolarPara();

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const mm = gsap.matchMedia();
      mm.add(MIDIA.movimento, () => {
        gsap.from(q(".cabeca-faq > *"), {
          y: 24,
          autoAlpha: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 70%" },
        });
        gsap.from(q(".pergunta"), {
          y: 30,
          autoAlpha: 0,
          duration: 0.6,
          stagger: 0.07,
          ease: "power3.out",
          scrollTrigger: { trigger: q(".lista-faq")[0], start: "top 75%" },
        });
        gsap.from(q(".ajuda-avatar"), {
          scale: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "back.out(2.4)",
          scrollTrigger: { trigger: q(".ajuda-faq")[0], start: "top 85%" },
        });
      });
    },
    { scope: ref },
  );

  return (
    <section id="faq" ref={ref} className="relative z-10 bg-white pb-36 pt-24 md:pb-44 md:pt-32">
      <Onda cor="text-white" forma={1} />
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:px-8">
        <div className="cabeca-faq md:sticky md:top-28 md:self-start">
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-marca-700">{c.eyebrow}</p>
          <h2 className="mt-4 text-[clamp(2.1rem,4.4vw,3.4rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-tinta">
            {c.tituloA} <span className="text-marca-600">{c.tituloB}</span>
          </h2>
          <div className="ajuda-faq mt-8 rounded-3xl bg-marca-50 p-6">
            <div className="flex -space-x-3">
              {(["nina", "rafa", "lia"] as const).map((q, i) => (
                <span key={q} className="ajuda-avatar">
                  <Avatar quem={q} fundo={(["rosa", "azul", "pessego"] as const)[i]} className="size-12" />
                </span>
              ))}
            </div>
            <p className="mt-4 text-[18px] font-extrabold text-tinta">{c.ajuda.titulo}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-tinta-2">{c.ajuda.texto}</p>
            <a
              href={c.ajuda.link.href}
              onClick={(e) => {
                e.preventDefault();
                rolar(c.ajuda.link.href);
              }}
              className="group mt-4 inline-flex items-center gap-2 font-mono text-[12.5px] font-medium uppercase tracking-[0.09em] text-marca-700 hover:text-marca-900"
            >
              {c.ajuda.link.texto}
              <ArrowRight className="size-4 transition-transform duration-300 ease-mola group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        <ul className="lista-faq grid gap-3">
          {c.perguntas.map((p, i) => {
            const ativa = aberta === i;
            return (
              <li
                key={p.p}
                className={`pergunta rounded-3xl border transition-colors duration-300 ${ativa ? "border-marca-200 bg-marca-50/60" : "border-linha bg-white hover:border-marca-200"}`}
              >
                <button
                  type="button"
                  aria-expanded={ativa}
                  onClick={() => setAberta(ativa ? -1 : i)}
                  className="flex w-full items-center gap-4 px-5 py-5 text-left md:px-6"
                >
                  <span className="flex-1 text-[17px] font-extrabold text-tinta md:text-[18px]">{p.p}</span>
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full transition-all duration-500 ease-mola ${ativa ? "rotate-45 bg-marca-600 text-white" : "bg-fundo text-marca-600"}`}
                  >
                    <Plus className="size-4" strokeWidth={2.8} />
                  </span>
                </button>
                <div className={`grid transition-[grid-template-rows] duration-500 ease-suave ${ativa ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-[15.5px] leading-relaxed text-tinta-2 md:px-6 md:pb-6">{p.r}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
