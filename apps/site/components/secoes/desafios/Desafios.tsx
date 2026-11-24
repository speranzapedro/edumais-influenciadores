"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { useConteudo } from "../../conteudo";
import { gsap, MIDIA, useGSAPPerto } from "../../motion/gsap";
import { useLenis } from "../../motion/ScrollSuave";
import { DemoRecompensa } from "./DemoRecompensa";
import { DemoAberta, DemoCompletar, DemoOrdenar, DemoQuiz, DemoTexto, type PropsDemo } from "./Demos";

/** Visual e demo de cada carta (nome, etiqueta e texto vêm do conteúdo do público, na mesma ordem). */
const VISUAIS: {
  face: string;
  painel: string;
  /** face clara: cabeçalho em tinta em vez de branco */
  claro?: boolean;
  Demo: (p: PropsDemo) => React.ReactNode;
}[] = [
  {
    face: "bg-marca-600",
    painel: "bg-white",
    Demo: DemoTexto,
  },
  {
    face: "bg-azul",
    painel: "bg-white",
    Demo: DemoQuiz,
  },
  {
    face: "bg-laranja",
    painel: "bg-white",
    Demo: DemoCompletar,
  },
  {
    face: "bg-verde",
    painel: "bg-white",
    Demo: DemoOrdenar,
  },
  {
    face: "bg-rosa",
    painel: "bg-white",
    Demo: DemoAberta,
  },
  {
    face: "bg-gradient-to-b from-[#ffd56e] to-[#ffb935]",
    painel: "bg-white",
    claro: true,
    Demo: DemoRecompensa,
  },
];

const N = VISUAIS.length;

/** Segura a carta parada em cada número inteiro e só transiciona no meio do caminho. */
function patamar(p: number) {
  const base = Math.floor(p);
  const f = p - base;
  const t = gsap.utils.clamp(0, 1, (f - 0.22) / 0.56);
  return base + gsap.parseEase("power2.inOut")(t);
}

export function Desafios() {
  const c = useConteudo().desafios;
  const CARTAS = VISUAIS.map((v, k) => ({ ...v, ...c.cartas[k] }));
  const ref = useRef<HTMLElement>(null);
  const [ativa, setAtiva] = useState(0);
  const lenis = useLenis();

  useGSAPPerto(
    () => {
      const secao = ref.current!;
      const q = gsap.utils.selector(secao);
      const cartas = q(".carta") as HTMLElement[];
      const palco = q(".palco")[0] as HTMLElement;
      const mm = gsap.matchMedia();

      mm.add(MIDIA.movimento, () => {
        let atual = 0;
        const estado = { p: 0 };

        const posicionar = () => {
          const pe = patamar(estado.p);
          const alturaCarta = cartas[0].offsetHeight;
          // No celular não há espaço para a pilha de lâminas: a carta que sai só sobe e some.
          const compacto = window.innerWidth < 768;
          cartas.forEach((c, i) => {
            const d = i - pe;
            let y: number, rx: number, z: number, s: number, o: number;
            if (d >= 0) {
              // Vindo de baixo, sempre abaixo da carta ativa (nunca por cima dela).
              const t = Math.min(d, 2.4);
              y = t * (alturaCarta + (compacto ? 28 : 40));
              rx = t * (compacto ? 14 : 30);
              z = compacto ? 0 : t * 70;
              s = 1 + t * (compacto ? 0 : 0.03);
              o = d > (compacto ? 1.2 : 2.2) ? Math.max(0, 1 - (d - (compacto ? 1.2 : 2.2)) * 3) : 1;
            } else if (compacto) {
              const a = -d;
              const e = gsap.parseEase("power2.out")(Math.min(a, 1));
              y = -e * alturaCarta * 0.45;
              rx = -e * 28;
              z = 0;
              s = 1 - e * 0.12;
              o = Math.max(0, 1 - a * 1.8);
            } else {
              // Subindo e recuando: vira uma "lâmina" empilhada no topo.
              const a = -d;
              const e = gsap.parseEase("power2.out")(Math.min(a, 1));
              const resto = Math.max(0, a - 1);
              y = -e * alturaCarta * 0.6 - resto * 20;
              rx = -e * 74;
              z = -e * 150 - resto * 60;
              s = 1 - e * 0.1 - resto * 0.045;
              o = a > 4.5 ? Math.max(0, 1 - (a - 4.5) * 2) : 1;
            }
            gsap.set(c, { x: 0, xPercent: -50, yPercent: -50, y, rotationX: rx, z, scale: s, opacity: o, zIndex: Math.round(100 + d * 10) });
          });
          const idx = Math.round(pe);
          if (idx !== atual) {
            atual = idx;
            setAtiva(idx);
          }
          gsap.set(q(".contador-trilho"), { yPercent: (-100 / N) * pe });
          gsap.set(q(".barra-desafios"), { scaleX: (pe + 1) / N });
        };

        gsap.to(estado, {
          p: N - 1,
          ease: "none",
          onUpdate: posicionar,
          scrollTrigger: { trigger: secao, start: "top top", end: "bottom bottom", scrub: 0.6 },
        });
        posicionar();

        // Inclinação sutil da carta ativa seguindo o mouse.
        if (window.matchMedia("(hover: hover)").matches) {
          const ry = gsap.quickTo(palco, "rotationY", { duration: 0.8, ease: "power3.out" });
          const rxx = gsap.quickTo(palco, "rotationX", { duration: 0.8, ease: "power3.out" });
          const mover = (e: PointerEvent) => {
            const b = palco.getBoundingClientRect();
            ry(((e.clientX - (b.left + b.width / 2)) / b.width) * 10);
            rxx(((e.clientY - (b.top + b.height / 2)) / b.height) * -6);
          };
          secao.addEventListener("pointermove", mover);
          return () => secao.removeEventListener("pointermove", mover);
        }
      });

      mm.add(MIDIA.reduzido, () => {
        gsap.set(cartas, { clearProps: "all" });
      });
    },
    { scope: ref },
  );

  const irPara = (i: number) => {
    const secao = ref.current!;
    const inicio = secao.offsetTop;
    const curso = secao.offsetHeight - window.innerHeight;
    const alvo = inicio + (curso * i) / (N - 1);
    if (lenis) lenis.scrollTo(alvo, { duration: 1.2 });
    else window.scrollTo({ top: alvo, behavior: "smooth" });
  };

  const carta = CARTAS[ativa];

  return (
    <section id="desafios" ref={ref} className="relative bg-fundo motion-safe:h-[620vh]">
      <div className="relative overflow-hidden motion-safe:sticky motion-safe:top-0 motion-safe:h-svh">
        <div className="grade-pontos pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_60%_70%_at_70%_50%,black,transparent)]" />
        <div className="relative mx-auto grid h-full max-w-[1240px] grid-rows-[auto_1fr] gap-2 px-5 pt-20 md:grid-cols-[0.9fr_1.1fr] md:grid-rows-1 md:items-center md:gap-10 md:px-8 md:pt-16">
          {/* texto */}
          <div className="relative z-20 max-w-[480px] bg-fundo pb-3 after:absolute after:inset-x-0 after:top-full after:h-5 after:bg-gradient-to-b after:from-fundo after:to-transparent md:bg-transparent md:pb-0 md:after:hidden">
            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-marca-700">{c.eyebrow}</p>
            <h2 className="mt-3 text-[clamp(1.55rem,4.4vw,3.4rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-tinta">
              {c.tituloA} <span className="text-marca-600">{c.tituloB}</span>
            </h2>

            <div className="mt-5 flex items-end gap-4 md:mt-8">
              <div className="h-[44px] overflow-hidden font-mono text-[40px] font-medium leading-[44px] text-tinta md:h-[64px] md:text-[60px] md:leading-[64px]">
                <div className="contador-trilho">
                  {CARTAS.map((_, i) => (
                    <div key={i}>{String(i + 1).padStart(2, "0")}</div>
                  ))}
                </div>
              </div>
              <span className="mb-1.5 font-mono text-[14px] text-suave md:mb-2.5">/ {String(N).padStart(2, "0")}</span>
              <div className="mb-3 h-[3px] flex-1 overflow-hidden rounded-full bg-linha md:mb-4">
                <span className="barra-desafios gradiente-marca block h-full origin-left scale-x-[0.16]" />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={ativa}
                initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                transition={{ duration: 0.35 }}
                className="mt-3 md:mt-5"
              >
                <p className="text-[22px] font-extrabold tracking-tight text-tinta md:text-[28px]">{carta.nome}</p>
                <p className="mt-1.5 hidden text-[16px] leading-relaxed text-tinta-2 sm:block">{carta.texto}</p>
              </motion.div>
            </AnimatePresence>

            <ul className="mt-6 hidden flex-wrap gap-2 md:flex">
              {CARTAS.map((c, i) => (
                <li key={c.nome}>
                  <button
                    type="button"
                    onClick={() => irPara(i)}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.08em] transition-all duration-300 ${
                      i === ativa ? "border-tinta bg-tinta text-white" : "border-linha bg-white text-tinta-2 hover:border-marca-300"
                    }`}
                  >
                    {c.tag}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* esteira 3D */}
          <div className="relative h-full min-h-0 [perspective:1500px] [perspective-origin:50%_42%] motion-reduce:h-auto motion-reduce:py-8">
            <div className="palco absolute inset-0 [transform-style:preserve-3d] motion-reduce:static">
              {CARTAS.map(({ nome, tag, face, painel, claro, Demo }, i) => (
                <article
                  key={nome}
                  aria-label={nome}
                  className={`carta absolute left-1/2 top-1/2 flex h-[min(450px,calc(100%-36px))] w-[min(340px,86vw)] md:h-[min(520px,64svh)] md:w-[min(380px,84vw)] flex-col rounded-[30px] p-3 shadow-[0_40px_80px_-30px_rgb(29_26_58/0.55)] will-change-transform motion-reduce:relative motion-reduce:left-auto motion-reduce:top-auto motion-reduce:mx-auto motion-reduce:mb-6 ${face}`}
                >
                  <header className={`flex items-center justify-between px-2.5 pb-3 pt-1.5 ${claro ? "text-tinta" : "text-white"}`}>
                    <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${claro ? "text-tinta/70" : "text-white/75"}`}>
                      {String(i + 1).padStart(2, "0")} · {tag}
                    </span>
                    <span className="flex gap-1">
                      <span className={`size-2 rounded-full ${claro ? "bg-tinta/25" : "bg-white/40"}`} />
                      <span className={`size-2 rounded-full ${claro ? "bg-tinta/25" : "bg-white/40"}`} />
                      <span className={`size-2 rounded-full ${claro ? "bg-tinta" : "bg-white"}`} />
                    </span>
                  </header>
                  <div className={`relative min-h-0 flex-1 overflow-hidden rounded-[24px] p-4 ${painel}`}>
                    <Demo ativo={ativa === i} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
