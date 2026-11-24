"use client";

import { Check, GripVertical, Lightbulb, Sparkles, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, Reorder } from "motion/react";
import { useEffect, useState } from "react";
import { useConteudo } from "../../conteudo";

const useDemos = () => useConteudo().desafios.demos;

/**
 * Demos jogáveis das cartas de desafio. Cada uma recebe `ativo`: quando a carta assenta no centro,
 * o demo se joga sozinho; se a pessoa interagir, o autoplay para e ela assume.
 */
export type PropsDemo = { ativo: boolean };

const mola = { type: "spring", stiffness: 520, damping: 32 } as const;

/** Agenda passos de autoplay e cancela tudo quando a carta sai ou o usuário toca. */
function useAutoplay(ativo: boolean, passos: [number, () => void][], deps: unknown[] = []) {
  const [tocou, setTocou] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: os passos mudam a cada render; quem chama diz em `deps` o que reinicia o autoplay
  useEffect(() => {
    if (!ativo || tocou) return;
    const ids = passos.map(([ms, f]) => setTimeout(f, ms));
    return () => ids.forEach(clearTimeout);
  }, [ativo, tocou, ...deps]);
  useEffect(() => {
    if (!ativo) setTocou(false);
  }, [ativo]);
  return () => setTocou(true);
}

/** Barra de progresso da aula, como no player do app. */
function Progresso({ passo, total = 8 }: { passo: number; total?: number }) {
  return (
    <div className="flex items-center gap-2">
      <X className="size-4 text-suave" />
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-linha">
        <motion.span className="gradiente-marca block h-full rounded-full" animate={{ width: `${(passo / total) * 100}%` }} transition={{ duration: 0.6 }} />
      </div>
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-marca-600">{children}</p>;
}

/** Barra inferior de feedback (verde/vermelha) que sobe como no player. */
function Feedback({ estado, children }: { estado: "certo" | "errado" | null; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {estado && (
        <motion.div
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          exit={{ y: "110%" }}
          transition={mola}
          className={`absolute inset-x-0 bottom-0 flex items-start gap-2.5 rounded-b-[24px] px-4 pb-4 pt-3.5 ${estado === "certo" ? "bg-verde-bg text-[#11733f]" : "bg-vermelho-bg text-[#b42323]"}`}
        >
          <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-white ${estado === "certo" ? "bg-verde" : "bg-vermelho"}`}>
            {estado === "certo" ? <Check className="size-3.5" strokeWidth={3.4} /> : <X className="size-3.5" strokeWidth={3.4} />}
          </span>
          <div className="text-[13px] leading-snug">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Texto / microleitura ─────────────────────────────────────── */
export function DemoTexto({ ativo }: PropsDemo) {
  const d = useDemos().leitura;
  return (
    <div className="flex h-full flex-col">
      <Progresso passo={ativo ? 2 : 1} />
      <h3 className="mt-5 text-[19px] font-extrabold leading-tight text-tinta">{d.titulo}</h3>
      <p className="mt-2.5 text-[14px] leading-relaxed text-tinta-2">
        {d.antes}{" "}
        <span
          className="rounded bg-[linear-gradient(transparent_55%,#ffe08a_55%)] bg-no-repeat font-semibold text-tinta transition-[background-size] delay-500 duration-[1100ms] ease-[var(--ease-suave)]"
          style={{ backgroundSize: ativo ? "100% 100%" : "0% 100%" }}
        >
          {d.destaque}
        </span>{" "}
        {d.meio} <strong className="text-tinta">{d.negrito}</strong>
        {d.fim}
      </p>
      <motion.div
        animate={ativo ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ delay: ativo ? 1.2 : 0, ...mola }}
        className="mt-4 flex gap-2.5 rounded-2xl bg-ambar-bg p-3 text-[13px] leading-snug text-tinta"
      >
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-ambar" />
        {d.dica}
      </motion.div>
      <button type="button" className="chunky chunky-escuro mt-auto h-11 w-full text-[12px] [--degrau:4px]">
        Continuar
      </button>
    </div>
  );
}

/* ── Quiz ─────────────────────────────────────────────────────── */
/** A alternativa certa é sempre a terceira (o autoplay toca nela). */
const CERTA = 2;

export function DemoQuiz({ ativo }: PropsDemo) {
  const { pergunta, opcoes: OPCOES } = useDemos().quiz;
  const [escolha, setEscolha] = useState<number | null>(null);
  const tocar = useAutoplay(ativo, [[1300, () => setEscolha(CERTA)]]);
  useEffect(() => {
    if (!ativo) setEscolha(null);
  }, [ativo]);

  const certo = escolha === CERTA;
  return (
    <div className="relative flex h-full flex-col">
      <Progresso passo={escolha === null ? 3 : 4} />
      <Rotulo>Desafio</Rotulo>
      <p className="mt-1.5 text-[16px] font-bold leading-snug text-tinta">{pergunta}</p>
      <motion.div className="mt-3.5 grid gap-2" animate={escolha !== null && !certo ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.4 }}>
        {OPCOES.map((o, i) => {
          const marcada = escolha === i;
          const mostraCerta = escolha !== null && i === CERTA && certo;
          const errada = marcada && !certo;
          return (
            <motion.button
              key={o.t}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                tocar();
                setEscolha(i);
              }}
              className={`flex items-center gap-2.5 rounded-2xl border-2 border-b-4 px-3 py-2 text-left text-[14px] font-semibold transition-colors ${
                mostraCerta
                  ? "border-verde bg-verde-bg text-[#11733f]"
                  : errada
                    ? "border-vermelho bg-vermelho-bg text-[#b42323]"
                    : "border-linha bg-white text-tinta hover:border-marca-300 hover:bg-marca-50"
              }`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-lg border-2 text-[11px] font-bold ${
                  mostraCerta ? "border-verde bg-verde text-white" : errada ? "border-vermelho bg-vermelho text-white" : "border-linha text-suave"
                }`}
              >
                {"ABCD"[i]}
              </span>
              {o.t}
            </motion.button>
          );
        })}
      </motion.div>
      <Feedback estado={escolha === null ? null : certo ? "certo" : "errado"}>
        <strong className="block">{certo ? "Mandou bem!" : "Quase! Vale revisar"}</strong>
        {escolha !== null && OPCOES[escolha].f.replace(/^(Mandou bem!|Quase!) /, "")}
      </Feedback>
    </div>
  );
}

/* ── Complete a frase ─────────────────────────────────────────── */
export function DemoCompletar({ ativo }: PropsDemo) {
  const d = useDemos().completar;
  const PALAVRAS = d.palavras;
  const GABARITO = d.gabarito;
  const [lacunas, setLacunas] = useState<(string | null)[]>([null, null]);
  const tocar = useAutoplay(ativo, [
    [1200, () => setLacunas([GABARITO[0], null])],
    [2100, () => setLacunas([GABARITO[0], GABARITO[1]])],
  ]);
  useEffect(() => {
    if (!ativo) setLacunas([null, null]);
  }, [ativo]);

  const cheio = lacunas.every(Boolean);
  const certo = cheio && lacunas.every((l, i) => l === GABARITO[i]);
  const escolher = (p: string) => {
    tocar();
    setLacunas((ls) => {
      if (ls.includes(p)) return ls.map((l) => (l === p ? null : l));
      const i = ls.indexOf(null);
      if (i < 0) return ls;
      const novo = [...ls];
      novo[i] = p;
      return novo;
    });
  };

  const lacuna = (i: number) => (
    <span className="mx-1 inline-flex h-8 min-w-[84px] items-end justify-center border-b-[3px] border-dashed border-marca-300 align-middle">
      {lacunas[i] && (
        <motion.button
          layoutId={`palavra-${lacunas[i]}`}
          transition={mola}
          onClick={() => escolher(lacunas[i]!)}
          className={`mb-1 rounded-xl border-2 border-b-4 px-2.5 py-0.5 text-[13.5px] font-bold ${
            cheio
              ? certo
                ? "border-verde bg-verde-bg text-[#11733f]"
                : "border-vermelho bg-vermelho-bg text-[#b42323]"
              : "border-marca-300 bg-marca-50 text-marca-700"
          }`}
        >
          {lacunas[i]}
        </motion.button>
      )}
    </span>
  );

  return (
    <LayoutGroup id="completar">
      <div className="relative flex h-full flex-col">
        <Progresso passo={cheio ? 6 : 5} />
        <Rotulo>Complete a frase</Rotulo>
        <p className="mt-2 text-[16px] font-semibold leading-[2.3] text-tinta">
          {d.antes} {lacuna(0)} {d.meio} {lacuna(1)} {d.fim}
        </p>
        <p className="mt-2 text-[12px] text-suave">Toque numa opção para preencher as lacunas.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PALAVRAS.map((p) =>
            lacunas.includes(p) ? (
              <span key={p} className="h-[36px] rounded-xl border-2 border-dashed border-linha px-2.5 py-1 text-[13.5px] font-bold text-transparent">
                {p}
              </span>
            ) : (
              <motion.button
                key={p}
                layoutId={`palavra-${p}`}
                transition={mola}
                whileTap={{ scale: 0.94 }}
                onClick={() => escolher(p)}
                className="rounded-xl border-2 border-b-4 border-linha bg-white px-2.5 py-1 text-[13.5px] font-bold text-tinta hover:border-marca-300"
              >
                {p}
              </motion.button>
            ),
          )}
        </div>
        <Feedback estado={!cheio ? null : certo ? "certo" : "errado"}>
          <strong className="block">{certo ? "Mandou bem!" : "Quase! Vale revisar"}</strong>
          {certo ? d.explicacao : "Toque numa palavra para tirá-la da lacuna."}
        </Feedback>
      </div>
    </LayoutGroup>
  );
}

/* ── Coloque em ordem ─────────────────────────────────────────── */
const EMBARALHADO = [2, 0, 3, 1];

export function DemoOrdenar({ ativo }: PropsDemo) {
  const d = useDemos().ordenar;
  const PASSOS_MEDIR = d.passos;
  const [ordem, setOrdem] = useState(EMBARALHADO);
  const tocar = useAutoplay(ativo, [
    [1100, () => setOrdem([0, 2, 3, 1])],
    [1900, () => setOrdem([0, 2, 1, 3])],
    [2700, () => setOrdem([0, 1, 2, 3])],
  ]);
  useEffect(() => {
    if (!ativo) setOrdem(EMBARALHADO);
  }, [ativo]);
  const certo = ordem.every((v, i) => v === i);

  return (
    <div className="relative flex h-full flex-col">
      <Progresso passo={certo ? 7 : 6} />
      <Rotulo>Coloque em ordem</Rotulo>
      <p className="mt-1.5 text-[15px] font-bold leading-snug text-tinta">{d.pergunta}</p>
      <Reorder.Group
        axis="y"
        values={ordem}
        onReorder={(o) => {
          tocar();
          setOrdem(o);
        }}
        className="mt-3 grid gap-2"
      >
        {ordem.map((i) => (
          <Reorder.Item
            key={i}
            value={i}
            transition={mola}
            whileDrag={{ scale: 1.04, boxShadow: "0 16px 30px -14px rgb(29 26 58 / 0.45)" }}
            className={`flex cursor-grab touch-none items-center gap-2 rounded-2xl border-2 border-b-4 bg-white px-2.5 py-2 text-[13.5px] font-semibold active:cursor-grabbing ${
              certo ? "border-verde bg-verde-bg text-[#11733f]" : "border-linha text-tinta"
            }`}
          >
            <GripVertical className="size-4 shrink-0 text-suave" />
            {PASSOS_MEDIR[i]}
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <p className="mt-2 text-[12px] text-suave">Arraste os passos pela alça.</p>
      <Feedback estado={certo ? "certo" : null}>
        <strong className="block">Mandou bem!</strong>
        {d.explicacao}
      </Feedback>
    </div>
  );
}

/* ── Pergunta aberta + feedback do tutor ──────────────────────── */
function useDigitar(texto: string, ligado: boolean, inicio: number, ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!ligado) return void setN(0);
    let i = 0;
    let id: ReturnType<typeof setInterval>;
    const t = setTimeout(() => {
      id = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= texto.length) clearInterval(id);
      }, ms);
    }, inicio);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [ligado, texto, inicio, ms]);
  return texto.slice(0, n);
}

export function DemoAberta({ ativo }: PropsDemo) {
  const { pergunta, resposta: RESPOSTA, tutor: TUTOR } = useDemos().aberta;
  const resposta = useDigitar(RESPOSTA, ativo, 700, 26);
  const respondeu = resposta.length === RESPOSTA.length;
  const tutor = useDigitar(TUTOR, ativo && respondeu, 700, 18);
  return (
    <div className="flex h-full flex-col">
      <Progresso passo={7} />
      <Rotulo>Pergunta aberta</Rotulo>
      <p className="mt-1.5 text-[14.5px] font-bold leading-snug text-tinta">{pergunta}</p>
      <div className="mt-3 min-h-[74px] rounded-2xl border-2 border-linha bg-white p-2.5 text-[13px] leading-snug text-tinta">
        {resposta}
        {!respondeu && ativo && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-piscar bg-marca-600" />}
      </div>
      <AnimatePresence>
        {respondeu && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={mola}
            className="mt-3 rounded-2xl bg-marca-50 p-3 ring-1 ring-marca-200"
          >
            <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-marca-700">
              <Sparkles className="size-3.5" /> Feedback do tutor
            </p>
            <p className="mt-1 text-[12.5px] leading-snug text-tinta-2">
              {tutor}
              {tutor.length < TUTOR.length && <span className="ml-0.5 inline-block size-2 animate-pulse rounded-full bg-marca-500" />}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
