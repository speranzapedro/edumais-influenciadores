"use client";

import { BadgeCheck, CreditCard, Headphones, type LucideIcon, Megaphone, ShieldCheck, Smartphone, Tag } from "lucide-react";
import { useRef } from "react";
import { useConteudo } from "../../conteudo";
import { gsap, MIDIA, useGSAP } from "../../motion/gsap";
import { Avatar } from "../../ui/Avatar";

/** Ícone de cada item, na ordem do conteúdo: criador e Edu+. */
const ICONES: [LucideIcon[], LucideIcon[]] = [
  [Megaphone, BadgeCheck, ShieldCheck, Tag],
  [Headphones, CreditCard, Smartphone, ShieldCheck],
];

/** Quem faz o quê na parceria: o criador de um lado, a Edu+ do outro. */
export function Responsabilidades() {
  const ref = useRef<HTMLElement>(null);
  const c = useConteudo().criador!.responsabilidades;
  const pct = useConteudo().parceria?.divisao;

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const mm = gsap.matchMedia();
      mm.add(MIDIA.movimento, () => {
        gsap.from(q(".cabeca-resp > *"), {
          y: 24,
          autoAlpha: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 70%" },
        });
        q(".coluna-resp").forEach((col, i) => {
          gsap
            .timeline({ scrollTrigger: { trigger: col, start: "top 75%" } })
            .from(col, { x: i ? 60 : -60, autoAlpha: 0, rotation: i ? 2 : -2, duration: 0.9, ease: "back.out(1.4)" })
            .from(col.querySelectorAll(".item-resp"), { x: i ? 20 : -20, autoAlpha: 0, duration: 0.5, stagger: 0.07, ease: "power3.out" }, 0.3)
            .from(col.querySelectorAll(".icone-resp"), { scale: 0, rotation: -40, duration: 0.5, stagger: 0.07, ease: "back.out(2.6)" }, 0.35);
        });
      });
    },
    { scope: ref },
  );

  return (
    <section id="responsabilidades" ref={ref} className="relative overflow-x-clip bg-white px-5 pb-36 pt-20 md:px-8 md:pb-44 md:pt-28">
      <div className="mx-auto max-w-[1240px]">
        <div className="cabeca-resp mx-auto max-w-[860px] text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-marca-700">{c.eyebrow}</p>
          <h2 className="mt-4 text-[clamp(2.1rem,4.6vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-tinta">
            {c.tituloA} <span className="text-marca-600">{c.tituloB}</span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-tinta-2">{c.texto}</p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 md:gap-6">
          {c.lados.map((lado, i) => (
            <div
              key={lado.rotulo}
              className={`coluna-resp rounded-[32px] p-6 md:p-8 ${i === 0 ? "gradiente-marca text-white shadow-[0_40px_80px_-40px_rgb(108_92_231/0.8)]" : "border border-linha bg-fundo text-tinta"}`}
            >
              <div className="flex items-center gap-3">
                {i === 0 ? (
                  <Avatar quem="rafa" fundo="azul" className="size-12" />
                ) : (
                  <span className="grid size-12 place-items-center rounded-full bg-white font-extrabold text-marca-600 shadow-card">E+</span>
                )}
                <span className="text-[24px] font-extrabold tracking-[-0.02em]">{lado.rotulo}</span>
                {pct && (
                  <span
                    className={`ml-auto rounded-full px-3 py-1 font-mono text-[12px] ${i === 0 ? "bg-white/20 text-white" : "bg-marca-100 text-marca-700"}`}
                  >
                    {pct[i].pct}% da receita
                  </span>
                )}
              </div>
              <ul className="mt-7 grid gap-5">
                {lado.itens.map((it, j) => {
                  const Icone = ICONES[i][j] ?? BadgeCheck;
                  return (
                    <li key={it.titulo} className="item-resp flex gap-4">
                      <span
                        className={`icone-resp grid size-11 shrink-0 place-items-center rounded-2xl ${i === 0 ? "bg-white/15 text-white" : "bg-white text-marca-600 shadow-card"}`}
                      >
                        <Icone className="size-5" strokeWidth={2.2} />
                      </span>
                      <span>
                        <span className="block text-[17px] font-extrabold leading-tight">{it.titulo}</span>
                        <span className={`mt-1 block text-[15px] leading-snug ${i === 0 ? "text-white/80" : "text-tinta-2"}`}>{it.texto}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
