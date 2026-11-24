"use client";

import { cn } from "@edu/ui";
import { Check, Copy, Flame, Lock, Sparkles, Star, TrendingUp } from "lucide-react";
import { AnimatePresence, animate, MotionConfig, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";

/** Tempo de cada passo na reprodução automática (a barra de progresso usa o mesmo valor). */
const DURACAO_MS = 4200;
const SUAVE = [0.22, 1, 0.36, 1] as const;

interface Passo {
  titulo: string;
  Visual: () => ReactNode;
}

const PASSOS: Passo[] = [
  { titulo: "Defina a ideia do seu produto no estilo Duolingo", Visual: VisualIdeia },
  { titulo: "Crie as trilhas de conteúdo e revise as aulas com ajuda da nossa Inteligência Artificial", Visual: VisualTrilhas },
  { titulo: "Divulgue seu produto inovador para sua audiência", Visual: VisualDivulgar },
  { titulo: "Veja as vendas no seu painel", Visual: VisualVendas },
];

/**
 * Linha do tempo animada do Edu+ Criador: os 4 passos se acendem em sequência e o passo da vez mostra
 * uma prévia do produto. Pausa com o mouse em cima ou o foco do teclado; dá para clicar num passo. Com
 * "reduzir movimento" ligado no sistema, não avança sozinha e as prévias aparecem sem animação.
 * `compacto` (celular): só os passos, sem as prévias.
 */
export function PassosCriador({ compacto = false, className }: { compacto?: boolean; className?: string }) {
  const reduzir = useReducedMotion();
  const [ativo, setAtivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const proximo = () => setAtivo((a) => (a + 1) % PASSOS.length);

  return (
    <MotionConfig reducedMotion="user">
      <ol
        className={cn("relative", className)}
        aria-label="Como funciona o Edu+ Criador"
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        // Só o foco do teclado pausa: depois de um clique, o passo segue sozinho quando o mouse sai.
        onFocus={(e) => e.target.matches(":focus-visible") && setPausado(true)}
        onBlur={() => setPausado(false)}
      >
        {PASSOS.map((p, i) => {
          const estado = i < ativo ? "feito" : i === ativo ? "ativo" : "proximo";
          const ultimo = i === PASSOS.length - 1;
          return (
            <li key={p.titulo} className={cn("relative flex gap-4", !ultimo && (compacto ? "pb-4" : "pb-6"))}>
              {!ultimo && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute w-0.5 -translate-x-1/2 overflow-hidden rounded-full bg-linha",
                    compacto ? "bottom-1 left-4 top-9" : "bottom-1 left-5 top-11",
                  )}
                >
                  <motion.span
                    className="block h-full w-full origin-top bg-marca-600"
                    initial={false}
                    animate={{ scaleY: i < ativo ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: SUAVE }}
                  />
                </span>
              )}
              <button
                type="button"
                onClick={() => setAtivo(i)}
                aria-current={estado === "ativo" ? "step" : undefined}
                aria-label={`Passo ${i + 1}: ${p.titulo}`}
                className="relative z-10 shrink-0 self-start rounded-full outline-none focus-visible:ring-4 focus-visible:ring-marca-200"
              >
                <motion.span
                  className={cn(
                    "relative grid place-items-center rounded-full font-extrabold transition-colors duration-300",
                    compacto ? "size-8 text-xs" : "size-10 text-sm",
                    estado === "ativo" && "gradiente-marca text-white shadow-flutuante",
                    estado === "feito" && "bg-marca-600 text-white",
                    estado === "proximo" && "border-2 border-linha bg-superficie text-suave",
                  )}
                  initial={false}
                  animate={{ scale: estado === "ativo" ? 1.08 : 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                >
                  {estado === "feito" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                  {estado === "ativo" && !reduzir && <span className="absolute inset-0 animate-pulsar rounded-full" />}
                </motion.span>
              </button>
              <div className={cn("min-w-0 flex-1", compacto ? "pt-1" : "pt-2")}>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setAtivo(i)}
                  className={cn(
                    "block text-left font-bold leading-snug transition-colors duration-300",
                    compacto ? "text-sm" : "text-[15px]",
                    estado === "proximo" ? "text-suave hover:text-tinta-2" : "text-tinta",
                  )}
                >
                  {p.titulo}
                </button>
                {estado === "ativo" && !reduzir && (
                  <span aria-hidden="true" className="mt-2 block h-1 w-16 overflow-hidden rounded-full bg-marca-100">
                    <span
                      key={ativo}
                      onAnimationEnd={proximo}
                      className="block h-full w-full origin-left animate-encher rounded-full bg-marca-600"
                      style={{ "--duracao-encher": `${DURACAO_MS}ms`, animationPlayState: pausado ? "paused" : "running" } as React.CSSProperties}
                    />
                  </span>
                )}
                {!compacto && (
                  <AnimatePresence initial={false}>
                    {estado === "ativo" && (
                      <motion.div
                        key={p.titulo}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: SUAVE }}
                        className="overflow-hidden"
                        aria-hidden="true"
                      >
                        <div className="pt-3">
                          <p.Visual />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </MotionConfig>
  );
}

/* Prévias: mini telas ilustrativas, sem dados reais. */

function Previa({ children }: { children: ReactNode }) {
  return <div className="rounded-card border border-linha bg-fundo p-4">{children}</div>;
}

const surgir = (atraso: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: atraso, duration: 0.4, ease: SUAVE },
});

function VisualIdeia() {
  const nos = [
    { y: 0, tipo: "feito" },
    { y: -10, tipo: "feito" },
    { y: 0, tipo: "atual" },
    { y: 10, tipo: "bloqueado" },
    { y: 0, tipo: "bloqueado" },
  ] as const;
  return (
    <Previa>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-tinta">Seu produto</span>
        <motion.span {...surgir(0.9)} className="inline-flex items-center gap-1 rounded-full bg-laranja-bg px-2 py-0.5 text-[11px] font-bold text-laranja">
          <Flame className="size-3" /> 3 dias seguidos
        </motion.span>
      </div>
      <div className="mt-4 flex items-center justify-between px-2 py-2">
        {nos.map((n, i) => (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: posições fixas da trilha ilustrativa
            key={i}
            initial={{ scale: 0, y: n.y }}
            animate={{ scale: 1, y: n.y }}
            transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 420, damping: 18 }}
            className={cn(
              "grid size-9 place-items-center rounded-full",
              n.tipo === "feito" && "gradiente-marca text-white shadow-flutuante",
              n.tipo === "atual" && "border-2 border-marca-600 bg-superficie text-marca-600",
              n.tipo === "bloqueado" && "bg-linha text-suave",
            )}
          >
            {n.tipo === "feito" && <Check className="size-4" strokeWidth={3} />}
            {n.tipo === "atual" && <Star className="size-4 fill-current" />}
            {n.tipo === "bloqueado" && <Lock className="size-3.5" />}
          </motion.span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <motion.span {...surgir(1.05)} className="rounded-full bg-ambar-bg px-2 py-0.5 text-[11px] font-bold text-ambar">
          +10 XP
        </motion.span>
        <motion.span {...surgir(1.15)} className="rounded-full bg-lilas-bg px-2 py-0.5 text-[11px] font-bold text-lilas">
          Microaulas
        </motion.span>
        <motion.span {...surgir(1.25)} className="rounded-full bg-verde-bg px-2 py-0.5 text-[11px] font-bold text-verde">
          Quiz
        </motion.span>
      </div>
    </Previa>
  );
}

function VisualTrilhas() {
  const aulas = [
    { titulo: "Aula 1 · O primeiro passo", largura: "w-3/4" },
    { titulo: "Aula 2 · Na prática", largura: "w-2/3" },
    { titulo: "Aula 3 · Desafio", largura: "w-1/2" },
  ];
  return (
    <Previa>
      <motion.span {...surgir(0)} className="inline-flex items-center gap-1.5 rounded-full bg-marca-100 px-2.5 py-1 text-[11px] font-bold text-marca-700">
        <Sparkles className="size-3" /> A IA sugere, você aprova
      </motion.span>
      <div className="mt-3 space-y-2">
        {aulas.map((a, i) => (
          <motion.div key={a.titulo} {...surgir(0.25 + i * 0.35)} className="flex items-center gap-3 rounded-xl bg-superficie px-3 py-2 shadow-card">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-tinta">{a.titulo}</div>
              <div className={cn("mt-1.5 h-1.5 rounded-full bg-linha", a.largura)} />
            </div>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 + i * 0.35, type: "spring", stiffness: 500, damping: 20 }}
              className="grid size-6 shrink-0 place-items-center rounded-full bg-verde-bg text-verde"
            >
              <Check className="size-3.5" strokeWidth={3} />
            </motion.span>
          </motion.div>
        ))}
      </div>
    </Previa>
  );
}

function VisualDivulgar() {
  const redes = ["Instagram", "TikTok", "YouTube", "WhatsApp"];
  const fas = ["AL", "BR", "CA", "DI"];
  const cores = ["bg-rosa-bg text-rosa", "bg-azul-bg text-azul", "bg-verde-bg text-verde", "bg-laranja-bg text-laranja"];
  return (
    <Previa>
      <motion.div {...surgir(0)} className="flex items-center gap-2 rounded-xl border border-marca-200 bg-superficie px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-tinta-2">
          aprenda.edumais.app.br/c/<span className="text-marca-600">@voce</span>
        </span>
        <Copy className="size-3.5 shrink-0 text-marca-600" />
      </motion.div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {redes.map((r, i) => (
          <motion.span key={r} {...surgir(0.3 + i * 0.12)} className="rounded-full bg-superficie px-2.5 py-1 text-[11px] font-bold text-tinta-2 shadow-card">
            {r}
          </motion.span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex -space-x-2">
          {fas.map((f, i) => (
            <motion.span
              key={f}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9 + i * 0.12, type: "spring", stiffness: 480, damping: 18 }}
              className={cn("grid size-7 place-items-center rounded-full border-2 border-fundo text-[10px] font-extrabold", cores[i])}
            >
              {f}
            </motion.span>
          ))}
        </div>
        <motion.span {...surgir(1.4)} className="text-xs font-semibold text-suave">
          Seus seguidores começando a estudar
        </motion.span>
      </div>
    </Previa>
  );
}

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function VisualVendas() {
  const valor = useMotionValue(0);
  const texto = useTransform(valor, (v) => reais.format(v));
  useEffect(() => {
    const a = animate(valor, 1874.3, { duration: 1.6, ease: SUAVE, delay: 0.2 });
    return () => a.stop();
  }, [valor]);
  const barras = [34, 48, 40, 62, 74, 92];
  return (
    <Previa>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold text-suave">Sua parte este mês</div>
          <motion.div className="mt-0.5 text-xl font-extrabold tabular-nums text-tinta">{texto}</motion.div>
        </div>
        <motion.span {...surgir(1.2)} className="inline-flex items-center gap-1 rounded-full bg-verde-bg px-2 py-0.5 text-[11px] font-bold text-verde">
          <TrendingUp className="size-3" /> +12 assinantes
        </motion.span>
      </div>
      <div className="mt-3 flex h-16 items-end gap-2">
        {barras.map((h, i) => (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: barras fixas do gráfico ilustrativo
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: SUAVE }}
            style={{ height: `${h}%` }}
            className={cn("flex-1 origin-bottom rounded-t-md", i === barras.length - 1 ? "gradiente-marca" : "bg-marca-200")}
          />
        ))}
      </div>
    </Previa>
  );
}
