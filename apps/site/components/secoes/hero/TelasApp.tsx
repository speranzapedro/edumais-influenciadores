"use client";

import { CartaoQuiz, CartaoTexto } from "@edu/aula-ui";
import { type BlocoQuiz, type BlocoQuizAluno, type BlocoTexto, blocoParaAluno, type CorrecaoQuiz, corrigirQuiz } from "@edu/core";
import { BarraProgresso, Botao, Cartao, classesBotao, cn, Icone, TileIcone, tomDe } from "@edu/ui";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Home,
  Map as IconeMapa,
  Lock,
  Play,
  Star,
  Target,
  Trophy,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDemo } from "../../conteudo";

/*
 * Telas do app do aluno com os componentes reais (@edu/ui e os cartões do player), na largura do
 * app (390px) e escaladas para o celular da ilustração. As classes `.alvo-*` são onde o "dedo" toca;
 * `data-escala` deixa a hero converter as posições de volta para o palco.
 */

const LARGURA = 390;

/** Desenha os filhos em 390px e escala para a largura da tela do celular. */
export function Escala({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ s: 0.7, h: 844 });
  useLayoutEffect(() => {
    const pai = ref.current!.parentElement!;
    const medir = () => {
      const s = pai.clientWidth / LARGURA || 0.7;
      setDim({ s, h: pai.clientHeight / s });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(pai);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      data-escala={dim.s}
      className={`absolute left-0 top-0 origin-top-left overflow-hidden bg-fundo text-tinta ${className}`}
      style={{ width: LARGURA, height: dim.h, transform: `scale(${dim.s})` }}
    >
      {children}
    </div>
  );
}

const ITENS_NAV = [
  { k: "trilhas", rotulo: "Trilhas", I: IconeMapa },
  { k: "progresso", rotulo: "Progresso", I: BarChart3 },
  { k: "inicio", rotulo: "Início", I: Home, central: true },
  { k: "ranking", rotulo: "Ranking", I: Trophy },
  { k: "perfil", rotulo: "Perfil", I: UserRound },
];

/** Barra de navegação do app (BarraNavegacao), presa ao pé da tela. */
export function NavApp({ ativo }: { ativo: "inicio" | "trilhas" }) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-40 px-3 pb-3">
      <div className="flex items-end justify-between rounded-[22px] border border-linha bg-superficie/95 px-2 pb-2 pt-2 shadow-[0_-8px_30px_-12px_rgba(29,26,58,0.18)]">
        {ITENS_NAV.map(({ k, rotulo, I, central }) => {
          const on = k === ativo;
          return central ? (
            <span key={k} className="-mt-7 flex w-16 flex-col items-center gap-1">
              <span
                className={cn(
                  "grid size-14 place-items-center rounded-full border-4 border-fundo text-white shadow-flutuante",
                  on ? "gradiente-marca scale-105" : "bg-marca-400",
                )}
              >
                <I className="size-6" strokeWidth={2.4} />
              </span>
              <span className={cn("text-[10px] font-semibold", on ? "text-marca-600" : "text-suave")}>{rotulo}</span>
            </span>
          ) : (
            <span key={k} className="flex w-16 flex-col items-center gap-1 py-1">
              <I className={cn("size-[22px]", on ? "text-marca-600" : "text-suave")} strokeWidth={on ? 2.4 : 2} />
              <span className={cn("text-[10px] font-semibold", on ? "text-marca-600" : "text-suave")}>{rotulo}</span>
            </span>
          );
        })}
      </div>
    </nav>
  );
}

/** Topo do player: sair, progresso da aula e contador de blocos. */
function TopoAula({ atual, total, classeBarra = "" }: { atual: number; total: number; classeBarra?: string }) {
  return (
    <header className="border-b border-linha/60 bg-fundo/90 px-4 pb-3 pt-12">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full text-suave">
          <X className="size-5" />
        </span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-marca-100">
          <div className={`h-full rounded-full bg-marca-600 ${classeBarra}`} style={{ width: `${(atual / total) * 100}%` }} />
        </div>
        <span className="w-10 text-right text-xs font-bold text-tinta-2">
          {atual}/{total}
        </span>
      </div>
    </header>
  );
}

function TituloAula() {
  const d = useDemo();
  return (
    <div className="aula-item mb-5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-marca-600">
        Aula {d.aula.posicao} de {d.trilha.total} · {d.trilha.titulo}
      </div>
      <h1 className="mt-1 text-xl font-extrabold leading-tight tracking-tight">{d.aula.titulo}</h1>
    </div>
  );
}

/* ── 1 · Home do aluno ─────────────────────────────────────────── */
export function TelaHome() {
  const d = useDemo();
  const pct = Math.round((d.trilha.feitas / d.trilha.total) * 100);
  const proxima = d.modulo.aulas.findIndex((a) => a.estado === "atual");
  const trilhas = [{ titulo: d.trilha.titulo, cor: d.trilha.cor, icone: d.trilha.icone, concluidas: d.trilha.feitas, total: d.trilha.total }, ...d.outras];
  return (
    <Escala>
      <main className="px-5 pt-12">
        <header className="home-item flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight">Bom dia, {d.aluno.nome} 👋</h1>
            <p className="text-sm text-suave">Bora continuar aprendendo?</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative grid size-11 place-items-center rounded-full bg-superficie text-tinta-2 shadow-card">
              <Bell className="size-5" />
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-vermelho px-1 text-[10px] font-bold text-white ring-2 ring-fundo">
                1
              </span>
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/avatares/${d.aluno.avatar}`} alt="" className="size-11 rounded-full bg-marca-100 ring-2 ring-white" />
          </div>
        </header>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <Cartao className="home-item flex items-center gap-2 px-3 py-2.5">
            <Flame className="size-5 fill-laranja text-laranja" />
            <div>
              <div className="home-ofensiva text-base font-extrabold leading-none">{d.painel.ofensiva}</div>
              <div className="text-[10px] font-medium text-suave">dias</div>
            </div>
          </Cartao>
          <Cartao className="home-item flex items-center gap-2 px-3 py-2.5">
            <Zap className="size-5 fill-marca-500 text-marca-500" />
            <div>
              <div className="home-xp text-base font-extrabold leading-none">{d.painel.xp}</div>
              <div className="text-[10px] font-medium text-suave">XP total</div>
            </div>
          </Cartao>
          <Cartao className="home-item flex items-center gap-2 px-3 py-2.5">
            <Trophy className="size-5 text-ambar" />
            <div>
              <div className="text-base font-extrabold leading-none">{d.painel.indicador.valor}</div>
              <div className="text-[10px] font-medium text-suave">{d.painel.indicador.rotulo}</div>
            </div>
          </Cartao>
        </div>

        <div className="home-item home-continuar gradiente-marca relative mt-5 block overflow-hidden rounded-[24px] p-5 text-white shadow-flutuante">
          <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-16 size-32 rounded-full bg-white/10" />
          <div className="text-xs font-medium text-white/75">Continuar aprendendo</div>
          <div className="mt-3 text-lg font-bold leading-snug">{d.trilha.titulo}</div>
          <div className="mt-0.5 line-clamp-1 text-sm text-white/85">
            Aula {d.aula.posicao} · {d.modulo.aulas[proxima]?.titulo ?? d.aula.titulo}
          </div>
          <div className="mt-5 flex items-end justify-between gap-6">
            <div className="flex-1">
              <BarraProgresso valor={pct} cor="bg-white" trilho="bg-white/25" />
              <div className="mt-2 text-xs text-white/80">{pct}% concluído</div>
            </div>
            <span className="alvo-home grid size-12 shrink-0 place-items-center rounded-full bg-white text-marca-700 shadow-lg">
              <Play className="ml-0.5 size-5 fill-current" />
            </span>
          </div>
        </div>

        <section className="mt-7">
          <div className="home-item mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Minhas trilhas</h2>
            <span className="text-xs font-semibold text-marca-600">Ver todas</span>
          </div>
          <div className="space-y-3">
            {trilhas.map((t) => {
              const p = Math.round((t.concluidas / t.total) * 100);
              return (
                <Cartao key={t.titulo} className="home-item flex items-center gap-3 p-3.5">
                  <TileIcone tom={tomDe(t.cor)}>
                    <Icone nome={t.icone} />
                  </TileIcone>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{t.titulo}</div>
                    <div className="mt-0.5 text-xs text-suave">
                      {t.concluidas}/{t.total} aulas
                    </div>
                    <BarraProgresso valor={p} className="mt-2 h-1.5" />
                  </div>
                  <span className="text-sm font-bold text-marca-600">{p}%</span>
                  <ChevronRight className="size-4 shrink-0 text-suave" />
                </Cartao>
              );
            })}
          </div>
        </section>
      </main>
      <NavApp ativo="inicio" />
    </Escala>
  );
}

/* ── 2 · Caminho da trilha ─────────────────────────────────────── */
const ZIGUE = [0, 52, 78, 52, 0, -52, -78, -52];

export function TelaTrilha() {
  const d = useDemo();
  const pct = Math.round((d.trilha.feitas / d.trilha.total) * 100);
  return (
    <Escala>
      <div className="gradiente-marca relative overflow-hidden rounded-b-[28px] px-5 pb-6 pt-12 text-white">
        <div className="pointer-events-none absolute -right-12 -top-10 size-44 rounded-full bg-white/10" />
        <span className="inline-flex items-center gap-1 text-sm text-white/80">
          <ChevronLeft className="size-4" /> Trilhas
        </span>
        <div className="mt-4 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/15">
            <Icone nome={d.trilha.icone} className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight">{d.trilha.titulo}</h1>
            <div className="text-xs text-white/80">
              {d.trilha.feitas} de {d.trilha.total} aulas · {pct}%
            </div>
          </div>
        </div>
        <BarraProgresso valor={pct} cor="bg-white" trilho="bg-white/25" className="mt-4" />
      </div>

      <div className="px-5 pb-10">
        <section className="mt-6">
          <div className="rounded-2xl border border-linha bg-superficie px-4 py-3 shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-wider text-marca-600">Módulo 2</div>
            <div className="text-sm font-bold">{d.modulo.titulo}</div>
          </div>
          <div className="mt-6 flex flex-col items-center gap-5">
            {d.modulo.aulas.map((a, i) => (
              <div
                key={a.titulo}
                className={cn("trilha-no flex flex-col items-center", a.estado === "atual" && "mt-9")}
                style={{ transform: `translateX(${ZIGUE[i % ZIGUE.length]}px)` }}
              >
                <div className="flex w-40 flex-col items-center">
                  <div className="relative">
                    {a.estado === "atual" && (
                      <div className="trilha-balao absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 border-marca-200 bg-superficie px-3 py-1.5 text-xs font-bold text-marca-700 shadow-card">
                        Começar
                        <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-marca-200 bg-superficie" />
                      </div>
                    )}
                    <span
                      className={cn(
                        "grid size-[68px] place-items-center rounded-full border-b-[6px]",
                        a.estado === "concluida" && "border-[#17a35b] bg-verde text-white",
                        a.estado === "atual" && "alvo-trilha gradiente-marca animate-pulsar border-marca-800 text-white",
                        a.estado === "bloqueada" && "border-[#d6d5e3] bg-[#e7e6f0] text-[#b3b2c6]",
                      )}
                    >
                      {a.estado === "concluida" ? (
                        <Star className="size-7 fill-white" />
                      ) : a.estado === "atual" ? (
                        <Star className="size-7 fill-white" />
                      ) : (
                        <Lock className="size-6" />
                      )}
                    </span>
                  </div>
                  <div
                    className={cn("mt-2 line-clamp-2 text-center text-xs font-semibold leading-tight", a.estado === "bloqueada" ? "text-suave" : "text-tinta")}
                  >
                    {a.titulo}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <NavApp ativo="trilhas" />
    </Escala>
  );
}

/* ── 3 · Aula: microleitura ────────────────────────────────────── */
export function TelaAula() {
  const d = useDemo();
  const texto = d.blocos.find((b) => b.tipo === "texto") as BlocoTexto;
  return (
    <Escala>
      <div className="flex h-full flex-col">
        <TopoAula atual={1} total={d.blocos.length} classeBarra="aula-barra" />
        <main className="flex-1 px-5 pt-5">
          <TituloAula />
          <div className="aula-item aula-formula">
            <CartaoTexto bloco={texto} />
          </div>
        </main>
        <div className="border-t border-linha bg-superficie px-5 pb-5 pt-4">
          <Botao tamanho="xl" className="alvo-aula w-full" tabIndex={-1}>
            Continuar
          </Botao>
        </div>
      </div>
    </Escala>
  );
}

/* ── 4 · Desafio: o quiz real, respondido pela hero ─────────────── */
export function TelaQuiz() {
  const d = useDemo();
  const raiz = useRef<HTMLDivElement>(null);
  const quiz = d.blocos.find((b) => b.tipo === "quiz") as BlocoQuiz;
  const aluno = blocoParaAluno(quiz) as BlocoQuizAluno;
  const certa = quiz.opcoes.findIndex((o) => o.correta);
  const [respondido, setRespondido] = useState(false);
  const correcao: CorrecaoQuiz | null = respondido ? corrigirQuiz(quiz, certa) : null;
  const posicao = d.blocos.indexOf(quiz) + 1;

  // A timeline da hero responde e reinicia o quiz por eventos na própria tela.
  // biome-ignore lint/correctness/useExhaustiveDependencies: religa o ouvinte quando a alternativa certa muda (outra demo)
  useEffect(() => {
    const tela = raiz.current!.closest(".tela-app") ?? raiz.current!;
    const ouvir = (e: Event) => setRespondido((e as CustomEvent<boolean>).detail);
    tela.addEventListener("hero:quiz", ouvir);
    return () => tela.removeEventListener("hero:quiz", ouvir);
  }, [certa]);

  return (
    <Escala>
      <div ref={raiz} className="relative flex h-full flex-col">
        <TopoAula atual={posicao} total={d.blocos.length} />
        <main className="flex-1 px-5 pt-5">
          <TituloAula />
          <div className="cartao-quiz" data-resposta-correta={certa}>
            <CartaoQuiz bloco={aluno} escolha={respondido ? certa : undefined} correcao={correcao} onEscolher={() => {}} />
          </div>
        </main>
        <div className="border-t border-linha bg-superficie px-5 pb-5 pt-4">
          <Botao tamanho="xl" className="w-full" disabled tabIndex={-1}>
            Escolha uma resposta
          </Botao>
        </div>
        <div className="quiz-feedback absolute inset-x-0 bottom-0 border-t border-verde/30 bg-verde-bg px-5 pb-5 pt-4">
          <div className="mb-3 flex items-center gap-2 font-extrabold text-[#159a55]">
            <CheckCircle2 className="size-6" /> Mandou bem!
          </div>
          <Botao tamanho="xl" variante="sucesso" className="alvo-quiz-ok w-full" tabIndex={-1}>
            Continuar
          </Botao>
        </div>
      </div>
    </Escala>
  );
}

/* ── 5 · Celebração ────────────────────────────────────────────── */
const CORES_CONFETE = ["#ffd166", "#ffffff", "#7ee2a8", "#ff8fc0", "#c9bfff", "#ffb36b"];

export function TelaFesta() {
  const d = useDemo();
  const desafios = d.blocos.filter((b) => b.tipo === "quiz" || b.tipo === "completar" || b.tipo === "ordenar").length;
  const xp = d.festa.eventos.reduce((s, e) => s + e.pontos, 0);
  return (
    <Escala className="!bg-transparent">
      <div className="gradiente-noite relative flex h-full flex-col overflow-hidden px-6 pb-8 pt-14 text-white">
        <div className="pointer-events-none absolute left-1/2 top-24 size-72 -translate-x-1/2 rounded-full bg-marca-400/30 blur-3xl" />
        {Array.from({ length: 22 }, (_, i) => (
          <span
            key={i}
            className="confete absolute top-0 block h-3 w-2 rounded-[2px]"
            style={{ left: `${(i * 41) % 100}%`, background: CORES_CONFETE[i % CORES_CONFETE.length] }}
          />
        ))}
        <div className="festa-trofeu relative mx-auto grid size-36 place-items-center rounded-full bg-gradient-to-b from-[#ffe08a] to-[#f5a524] shadow-[0_20px_60px_-10px_rgba(245,165,36,0.7)]">
          <Trophy className="size-20 text-white drop-shadow" strokeWidth={1.6} />
        </div>
        <div className="festa-item mt-8 text-center">
          <h1 className="text-[30px] font-extrabold tracking-tight">Gabaritou! 🎉</h1>
          <p className="mx-auto mt-2 max-w-[300px] text-[15px] text-white/80">
            Você acertou {desafios} de {desafios} desafios.
          </p>
        </div>
        <div className="festa-item mt-8 rounded-[24px] border border-white/15 bg-white/10 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/80">
              <Zap className="size-5 fill-[#ffd166] text-[#ffd166]" /> XP ganho
            </div>
            <div className="text-3xl font-extrabold text-[#ffd166]">+{xp}</div>
          </div>
          <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
            {d.festa.eventos.map((e) => (
              <li key={e.descricao} className="flex justify-between text-white/85">
                <span>{e.descricao}</span>
                <span className="font-bold">+{e.pontos}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="festa-ofensiva flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5">
              <Flame className="size-5 fill-[#ff9f43] text-[#ff9f43]" />
              <div>
                <div className="festa-dias font-extrabold leading-none">{d.painel.ofensiva + 1}</div>
                <div className="text-[11px] text-white/70">dias seguidos</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5">
              <Target className="size-5 text-[#7ee2a8]" />
              <div>
                <div className="font-extrabold leading-none">100%</div>
                <div className="text-[11px] text-white/70">de acertos</div>
              </div>
            </div>
          </div>
        </div>
        <div className="festa-item mt-auto pt-8">
          <span className={cn(classesBotao("branco", "xl"), "w-full")}>Voltar à trilha</span>
        </div>
      </div>
    </Escala>
  );
}
