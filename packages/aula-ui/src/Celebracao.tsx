"use client";

import { CONQUISTAS, type EventoXp } from "@edu/core";
import { classesBotao, cn, Icone } from "@edu/ui";
import confetti from "canvas-confetti";
import { Flame, Target, Trophy, Zap } from "lucide-react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { useAula } from "./contexto";

export interface ResultadoAula {
  recompensa: {
    eventos: EventoXp[];
    xpGanho: number;
    streak: { atual: number };
    novoDiaAtivo: boolean;
    marcoAtingido: number | null;
    aulaJaConcluida: boolean;
    trilhaConcluida: boolean;
    novasConquistas: string[];
    xpTotal: number;
  };
  proxima: { id: string; titulo: string } | null;
  acertos: number;
  total: number;
}

function ContadorXp({ valor }: { valor: number }) {
  const mv = useMotionValue(0);
  const arredondado = useTransform(mv, (v) => `+${Math.round(v)}`);
  useEffect(() => {
    const c = animate(mv, valor, { duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [mv, valor]);
  return <motion.span>{arredondado}</motion.span>;
}

export function Celebracao({ resultado, trilhaId }: { resultado: ResultadoAula; trilhaId: string }) {
  const { recompensa: r, acertos, total, proxima } = resultado;
  const perfeita = total > 0 && acertos === total;
  const { rotas } = useAula();

  useEffect(() => {
    const cores = ["#ffffff", "#c9bfff", "#ffd166", "#7ee2a8", "#ff8fc0"];
    const disparar = (x: number) => confetti({ particleCount: 70, spread: 75, startVelocity: 42, origin: { x, y: 0.35 }, colors: cores, scalar: 0.9 });
    disparar(0.3);
    const t1 = setTimeout(() => disparar(0.7), 250);
    const t2 = r.trilhaConcluida ? setTimeout(() => confetti({ particleCount: 180, spread: 120, origin: { y: 0.4 }, colors: cores }), 700) : undefined;
    return () => {
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [r.trilhaConcluida]);

  const titulo = r.trilhaConcluida ? "Trilha concluída!" : perfeita ? "Gabaritou!" : total && acertos / total < 0.5 ? "Aula concluída!" : "Mandou bem!";
  const subtitulo = r.trilhaConcluida
    ? "Você completou todas as aulas desta trilha. Que orgulho!"
    : r.aulaJaConcluida
      ? "Revisão feita — repetir é como se aprende de verdade."
      : `Você acertou ${acertos} de ${total} desafios.`;
  const conquistas = CONQUISTAS.filter((c) => r.novasConquistas.includes(c.key));

  return (
    <div className="gradiente-noite relative mx-auto flex min-h-dvh max-w-[440px] flex-col overflow-hidden px-6 pb-8 pt-14 text-white">
      <div className="pointer-events-none absolute left-1/2 top-24 size-72 -translate-x-1/2 rounded-full bg-marca-400/30 blur-3xl" />

      <motion.div
        initial={{ scale: 0.3, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 12 }}
        className="relative mx-auto grid size-36 place-items-center rounded-full bg-gradient-to-b from-[#ffe08a] to-[#f5a524] shadow-[0_20px_60px_-10px_rgba(245,165,36,0.7)]"
      >
        <Trophy className="size-20 text-white drop-shadow" strokeWidth={1.6} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-8 text-center">
        <h1 className="text-[30px] font-extrabold tracking-tight">{titulo} 🎉</h1>
        <p className="mx-auto mt-2 max-w-[300px] text-[15px] text-white/80">{subtitulo}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/80">
            <Zap className="size-5 fill-[#ffd166] text-[#ffd166]" /> XP ganho
          </div>
          <div className="text-3xl font-extrabold text-[#ffd166]">
            <ContadorXp valor={r.xpGanho} />
          </div>
        </div>
        {r.eventos.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
            {r.eventos.map((e) => (
              <li key={e.fonte + e.ref_key} className="flex justify-between text-white/85">
                <span>{e.descricao}</span>
                <span className="font-bold">+{e.pontos}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5">
            <Flame className="size-5 fill-[#ff9f43] text-[#ff9f43]" />
            <div>
              <div className="font-extrabold leading-none">{r.streak.atual}</div>
              <div className="text-[11px] text-white/70">{r.streak.atual === 1 ? "dia seguido" : "dias seguidos"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5">
            <Target className="size-5 text-[#7ee2a8]" />
            <div>
              <div className="font-extrabold leading-none">{total ? Math.round((acertos / total) * 100) : 100}%</div>
              <div className="text-[11px] text-white/70">de acertos</div>
            </div>
          </div>
        </div>
      </motion.div>

      {conquistas.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-4 space-y-2">
          {conquistas.map((c) => (
            <div key={c.key} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-tinta shadow-lg">
              <div className="grid size-10 place-items-center rounded-full bg-gradient-to-b from-[#ffe08a] to-[#f5a524] text-white">
                <Icone nome={c.icone} className="size-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-marca-600">Nova conquista!</div>
                <div className="font-bold">{c.titulo}</div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <div className="mt-auto space-y-3 pt-8">
        {proxima && !r.trilhaConcluida ? (
          <Link href={rotas.aula(proxima.id)} className={cn(classesBotao("branco", "xl"), "w-full")}>
            Próxima aula
          </Link>
        ) : null}
        <Link
          href={r.trilhaConcluida ? rotas.progresso : rotas.trilha(trilhaId)}
          className={cn(
            classesBotao(proxima && !r.trilhaConcluida ? "fantasma" : "branco", "xl"),
            "w-full",
            proxima && !r.trilhaConcluida && "text-white hover:bg-white/10 hover:text-white",
          )}
        >
          {r.trilhaConcluida ? "Ver minhas conquistas" : "Voltar à trilha"}
        </Link>
      </div>
    </div>
  );
}
