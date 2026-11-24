"use client";

import confetti from "canvas-confetti";
import { Flame, Medal, Rocket, Sparkles, Target, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { PropsDemo } from "./Demos";

const SELOS = [
  { I: Rocket, n: "Primeiro passo", c: "from-[#b3a4ff] to-[#6c5ce7]" },
  { I: Flame, n: "Semana de fogo", c: "from-[#ffc078] to-[#f59324]" },
  { I: Target, n: "Gabaritou", c: "from-[#6ee7a8] to-[#1fb768]" },
];
const CORES = ["#ffd166", "#9b87fb", "#7ee2a8", "#ff8fc0", "#ffb36b"];
const mola = { type: "spring", stiffness: 420, damping: 16 } as const;

/**
 * Recompensa ao fim da aula: o anel de XP enche e vira o nível, o XP sobe, a ofensiva é
 * renovada e os selos de conquista viram. Tudo claro, com confete leve.
 */
export function DemoRecompensa({ ativo }: PropsDemo) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [fase, setFase] = useState(0);

  useEffect(() => {
    if (!ativo || !canvas.current) return;
    const disparar = confetti.create(canvas.current, { resize: true });
    const leve = (n: number, y: number) =>
      disparar({ particleCount: n, spread: 80, startVelocity: 19, gravity: 0.75, ticks: 180, scalar: 0.62, origin: { x: 0.5, y }, colors: CORES });
    const passos: [number, () => void][] = [
      [250, () => setFase(1)], // anel começa a encher
      [900, () => setFase(2)], // +10 XP
      [
        1500,
        () => {
          setFase(3);
          leve(55, 0.28);
        },
      ], // subiu de nível
      [2300, () => setFase(4)], // ofensiva renovada
      [
        2900,
        () => {
          setFase(5);
          leve(25, 0.7);
        },
      ], // selos
    ];
    const ids = passos.map(([ms, f]) => setTimeout(f, ms));
    return () => {
      ids.forEach(clearTimeout);
      disparar.reset();
      setFase(0);
    };
  }, [ativo]);

  const subiu = fase >= 3;
  const anel = fase === 0 ? 0.62 : fase < 3 ? 1 : 0.14;
  const xp = fase >= 2 ? 350 : 340;
  const dias = fase >= 4 ? 8 : 7;

  return (
    <div className="relative flex h-full flex-col items-center text-center">
      <canvas ref={canvas} className="pointer-events-none absolute -inset-4 z-20 size-[calc(100%+32px)]" />
      {/* brilho suave atrás do anel */}
      <div className="pointer-events-none absolute left-1/2 top-[64px] size-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(187_174_255/0.35),transparent_62%)]" />

      {/* anel de XP com o nível */}
      <div className="relative mt-1 size-[128px]">
        <motion.div
          initial={false}
          animate={{ opacity: subiu ? 1 : 0, scale: subiu ? 1 : 0.6 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute -inset-10 animate-girar rounded-full bg-[repeating-conic-gradient(rgb(255_209_102/0.5)_0deg_9deg,transparent_9deg_22deg)] [mask-image:radial-gradient(circle,black_30%,transparent_70%)]"
        />
        <svg aria-hidden="true" viewBox="0 0 120 120" className="relative size-full -rotate-90">
          <defs>
            <linearGradient id="anel-xp" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#9b87fb" />
              <stop offset="1" stopColor="#5a48d1" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="50" stroke="#efeafe" strokeWidth="11" fill="#fff" />
          <motion.circle
            cx="60"
            cy="60"
            r="50"
            stroke="url(#anel-xp)"
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
            initial={false}
            animate={{ pathLength: anel }}
            transition={fase === 3 ? { duration: 0.5, ease: [0.22, 1, 0.36, 1] } : { duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-suave">Nível</p>
            <div className="relative mx-auto h-[38px] w-8 overflow-hidden text-[34px] font-extrabold leading-[38px] text-tinta">
              <motion.div initial={false} animate={{ y: subiu ? -38 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
                <div>3</div>
                <div className="text-marca-600">4</div>
              </motion.div>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {subiu && (
            <motion.span
              initial={{ y: 10, scale: 0, rotate: -12 }}
              animate={{ y: 0, scale: 1, rotate: -4 }}
              exit={{ scale: 0 }}
              transition={mola}
              className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-[#ffd166] px-2.5 py-1 text-[11px] font-extrabold text-tinta shadow-[0_8px_16px_-8px_rgb(245_165_36/0.9)]"
            >
              <Sparkles className="size-3" /> Subiu de nível!
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* XP e ofensiva */}
      <div className="mt-4 flex items-center gap-2">
        <span className="relative flex items-center gap-1.5 rounded-full bg-marca-50 px-3 py-1.5 text-[14px] font-extrabold text-marca-700 ring-1 ring-marca-200">
          <Zap className="size-4 fill-current" />
          <motion.span key={xp} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="tabular-nums">
            {xp}
          </motion.span>
          XP
          <AnimatePresence>
            {fase === 2 && (
              <motion.span
                initial={{ y: 0, opacity: 0, scale: 0.6 }}
                animate={{ y: -26, opacity: 1, scale: 1 }}
                exit={{ y: -40, opacity: 0 }}
                transition={mola}
                className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-tinta px-2 py-0.5 font-mono text-[10.5px] text-white"
              >
                +10 XP
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <motion.span
          animate={fase >= 4 ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.45 }}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-extrabold ring-1 transition-colors duration-300 ${
            fase >= 4 ? "bg-laranja-bg text-laranja ring-[#ffd9b0]" : "bg-fundo text-suave ring-linha"
          }`}
        >
          <motion.span animate={fase >= 4 ? { rotate: [0, -16, 12, 0], scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.6 }}>
            <Flame className={`size-4 ${fase >= 4 ? "fill-current" : ""}`} />
          </motion.span>
          <motion.span key={dias} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="tabular-nums">
            {dias}
          </motion.span>
          dias
        </motion.span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={fase >= 4 ? "renovada" : "aula"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="mt-2 text-[12px] font-semibold text-tinta-2"
        >
          {fase >= 4 ? "Ofensiva renovada! Volte amanhã para manter." : "Aula concluída · 4 de 4 acertos"}
        </motion.p>
      </AnimatePresence>

      {/* selos de conquista */}
      <div className="mt-4 grid w-full grid-cols-3 gap-2 [perspective:600px]">
        {SELOS.map(({ I, n, c }, i) => {
          const virou = fase >= 5;
          return (
            <motion.div
              key={n}
              initial={false}
              animate={virou ? { rotateY: 0, opacity: 1, y: 0 } : { rotateY: 180, opacity: 0.35, y: 6 }}
              transition={{ delay: virou ? i * 0.16 : 0, type: "spring", stiffness: 180, damping: 14 }}
              className="grid justify-items-center gap-1.5 rounded-2xl bg-fundo p-2.5 ring-1 ring-linha [backface-visibility:hidden]"
            >
              <span
                className={`grid size-11 place-items-center rounded-full border-4 border-white bg-gradient-to-br text-white shadow-[0_8px_16px_-8px_rgb(29_26_58/0.45)] ${c}`}
              >
                <I className="size-5" />
              </span>
              <span className="text-[11px] font-bold leading-tight text-tinta">{n}</span>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-auto flex items-center gap-1.5 pt-2 text-[12px] text-suave">
        <Medal className="size-3.5" /> 14 conquistas para desbloquear
      </p>
    </div>
  );
}
