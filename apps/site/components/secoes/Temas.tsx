"use client";

import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  Cpu,
  Dna,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  type LucideIcon,
  Magnet,
  PiggyBank,
  Sparkles,
  Telescope,
  Users,
} from "lucide-react";
import { useRef } from "react";
import { useConteudo } from "../conteudo";
import { gsap, MIDIA, ScrollTrigger, useGSAP } from "../motion/gsap";

const ICONES: Record<string, LucideIcon> = {
  Ciências: Atom,
  Astronomia: Telescope,
  Biologia: Dna,
  Química: FlaskConical,
  Física: Magnet,
  Matemática: Calculator,
  Tecnologia: Cpu,
  História: Landmark,
  Filosofia: Brain,
  Sociologia: Users,
  Idiomas: Languages,
  Literatura: BookOpen,
  Geografia: Globe2,
  "Finanças pessoais": PiggyBank,
};

const CORES = ["bg-marca-100 text-marca-700", "bg-azul-bg text-azul", "bg-verde-bg text-verde", "bg-rosa-bg text-rosa", "bg-ambar-bg text-ambar"];

function Faixa({ temas, desloc, className }: { temas: string[]; desloc: number; className: string }) {
  // A lista vai duplicada: a faixa anda metade da largura e recomeça sem emenda.
  const itens = [...temas, ...temas];
  return (
    <div className={`faixa-temas flex w-max gap-3 md:gap-4 ${className}`}>
      {itens.map((t, i) => {
        const Icone = ICONES[t] ?? Sparkles;
        return (
          <span
            key={`${t}-${i}`}
            aria-hidden={i >= temas.length}
            className="flex shrink-0 items-center gap-3 rounded-full border border-white bg-white py-2.5 pl-2.5 pr-6 shadow-card md:py-3 md:pl-3 md:pr-7"
          >
            <span className={`grid size-10 place-items-center rounded-full md:size-12 ${CORES[(i + desloc) % CORES.length]}`}>
              <Icone className="size-5 md:size-6" strokeWidth={2.3} />
            </span>
            <span className="text-[19px] font-extrabold tracking-[-0.02em] text-tinta md:text-[24px]">{t}</span>
          </span>
        );
      })}
    </div>
  );
}

/** Faixas de temas em sentidos opostos; a rolagem da página acelera e inclina as duas. */
export function Temas() {
  const ref = useRef<HTMLElement>(null);
  const c = useConteudo().temas;

  useGSAP(
    () => {
      if (!c) return;
      const q = gsap.utils.selector(ref);
      const mm = gsap.matchMedia();
      mm.add(MIDIA.movimento, () => {
        const [a, b] = q(".faixa-temas");
        const ida = gsap.fromTo(a, { xPercent: 0 }, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });
        const volta = gsap.fromTo(b, { xPercent: -50 }, { xPercent: 0, duration: 42, ease: "none", repeat: -1 });
        // Começa longe do zero para a faixa poder andar para trás (timeScale negativo) sem parar.
        ida.totalTime(ida.duration() * 500);
        volta.totalTime(volta.duration() * 500);
        const inclinar = gsap.quickTo(q(".faixa-temas"), "skewX", { duration: 0.5, ease: "power3.out" });

        // Velocidade das faixas segue a rolagem (e o sentido dela) e depois desacelera até o normal.
        const vel = { v: 1 };
        const aplicar = () => {
          ida.timeScale(vel.v);
          volta.timeScale(vel.v);
        };
        const endireitar = gsap.delayedCall(0.2, () => inclinar(0)).pause();

        ScrollTrigger.create({
          trigger: ref.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (st) => {
            const v = st.getVelocity();
            const sentido = st.direction;
            const forca = gsap.utils.clamp(1, 5, 1 + Math.abs(v) / 400);
            gsap.to(vel, {
              v: forca * sentido,
              duration: 0.2,
              overwrite: true,
              onUpdate: aplicar,
              onComplete: () => void gsap.to(vel, { v: sentido, duration: 1.2, ease: "power2.out", onUpdate: aplicar }),
            });
            inclinar(gsap.utils.clamp(-8, 8, -v / 300));
            endireitar.restart(true);
          },
        });

        gsap.from(q(".olho-temas"), {
          y: 20,
          autoAlpha: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 85%" },
        });
      });
    },
    { scope: ref },
  );

  if (!c) return null;

  return (
    <section ref={ref} className="relative overflow-x-clip pb-20 pt-4 md:pb-28" aria-label={`${c.eyebrow} ${[...c.linhaA, ...c.linhaB].join(", ")}`}>
      <p className="olho-temas mb-7 text-center font-mono text-[12px] uppercase tracking-[0.16em] text-marca-700">{c.eyebrow}</p>
      <div className="grid -rotate-2 gap-3 md:gap-4" aria-hidden>
        <Faixa temas={c.linhaA} desloc={0} className="" />
        <Faixa temas={c.linhaB} desloc={2} className="" />
      </div>
      {/* bordas esfumaçadas */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-fundo md:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-fundo md:w-40" />
    </section>
  );
}
