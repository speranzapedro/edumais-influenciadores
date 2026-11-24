"use client";

import { Check, Coins, FileText, Flame, Play, TrendingUp, Users, Wallet } from "lucide-react";
import { useRef } from "react";
import type { Personagem } from "@/lib/avatares";
import { useConteudo } from "../../conteudo";
import { gsap, MIDIA, useGSAP } from "../../motion/gsap";
import { Avatar, type FundoAvatar } from "../../ui/Avatar";
import { Celular } from "../../ui/Celular";
import { Onda } from "../../ui/Onda";
import { TelaQuiz, TelaTrilha } from "../hero/TelasApp";

/** Seguidores do cartão de receita; os índices em `VIRAM_ALUNOS` compram a trilha. */
const SEGUIDORES: Personagem[] = ["joao", "ana", "lia", "caio", "bia", "duda", "nina"];
const FUNDOS: FundoAvatar[] = ["lilas", "azul", "rosa", "pessego", "verde", "lavanda"];
const VIRAM_ALUNOS = [1, 3, 6];
const BARRAS = [22, 34, 45, 58, 74, 94];
/** Receita do mês no bolso do criador (70% do exemplo do simulador: R$ 29,90 × 400 vendas). */
const BOLSO = 8372;
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
/** Quanto a trilha "rola" para cima antes do toque, para a aula atual entrar na tela. */
const ROLAGEM_TRILHA = -26;
const RANKING_AVATARES: Personagem[] = ["lia", "caio", "nina"];
/** Onde o e-book e o curso gravado param depois de riscados (e onde ficam com movimento reduzido). */
const RUIM_FINAL = ["translateY(-38px) rotate(-5deg) scale(0.86)", "translateY(-38px) rotate(5deg) scale(0.86)"];

/**
 * Por que a Edu+: três cartões com os benefícios para o criador (qualidade, receita e comunidade).
 * O estado final de cada palco é o próprio HTML; as animações partem dele, então com movimento
 * reduzido o cartão aparece pronto e parado.
 */
export function PorQue() {
  const ref = useRef<HTMLElement>(null);
  const c = useConteudo().criador!.porQue;

  useGSAP(
    () => {
      const q = gsap.utils.selector(ref);
      const mm = gsap.matchMedia();

      // O quiz real (o mesmo da hero) é respondido por evento; o retorno verde fica fora da tela.
      const telaQuiz = q(".palco-qualidade .tela-quiz-pq")[0];
      const responder = (sim: boolean) => telaQuiz?.dispatchEvent(new CustomEvent("hero:quiz", { detail: sim }));
      gsap.set(q(".palco-qualidade .quiz-feedback"), { yPercent: 110 });

      mm.add(MIDIA.reduzido, () => {
        const t = setTimeout(() => responder(true), 60);
        return () => clearTimeout(t);
      });

      mm.add(MIDIA.movimento, () => {
        gsap.from(q(".cabeca-pq > *"), {
          y: 24,
          autoAlpha: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 70%" },
        });
        gsap.from(q(".cartao-pq"), {
          y: 60,
          autoAlpha: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: q(".grade-pq")[0], start: "top 80%" },
        });

        // Cada palco roda em loop enquanto está na tela.
        const loop = (palco: Element) =>
          gsap.timeline({
            repeat: -1,
            repeatDelay: 2.4,
            delay: 0.4,
            scrollTrigger: { trigger: palco, start: "top 85%", end: "bottom top", toggleActions: "play pause resume pause" },
          });

        // 1. Qualidade: o e-book e o curso gravado levam um X; o app sobe por cima, na trilha, e um toque abre a aula.
        const qualidade = q(".palco-qualidade")[0];
        const k = gsap.utils.selector(qualidade);
        const dedo = k(".dedo-pq")[0];
        /** Centro da aula atual em `em`, relativo à tela do celular (lido na hora do toque, já com a trilha rolada). */
        const alvo = () => {
          const tela = k(".tela-trilha-pq")[0].parentElement!.getBoundingClientRect();
          const a = k(".tela-trilha-pq .alvo-trilha")[0]?.getBoundingClientRect();
          const fs = parseFloat(getComputedStyle(k(".celular-pq")[0]).fontSize) || 7;
          return a ? { x: (a.left + a.width / 2 - tela.left) / fs, y: (a.top + a.height / 2 - tela.top) / fs } : { x: 20, y: 30 };
        };
        loop(qualidade)
          .call(() => responder(false), [], 0)
          .set(k(".tela-trilha-pq"), { yPercent: 0 }, 0)
          .set(k(".tela-quiz-pq"), { yPercent: 100 }, 0)
          .set(dedo, { left: "21em", top: "46em", autoAlpha: 0, scale: 1 }, 0)
          .fromTo(k(".item-ruim"), { y: 16, autoAlpha: 0, rotation: 0, scale: 1 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.12, ease: "power3.out" }, 0)
          .from(k(".risco"), { drawSVG: "0%", duration: 0.3, stagger: 0.18, ease: "power2.inOut" }, "+=0.5")
          .to(k(".item-ruim"), { y: -38, rotation: (i: number) => (i ? 5 : -5), scale: 0.86, opacity: 0.5, duration: 0.6, ease: "power2.inOut" }, "+=0.3")
          .from(k(".celular-pq"), { y: 280, rotation: 6, duration: 0.9, ease: "back.out(1.1)" }, "<0.15")
          // rola a trilha até a aula atual e toca nela
          .to(k(".tela-trilha-pq"), { yPercent: ROLAGEM_TRILHA, duration: 0.8, ease: "power2.inOut" }, "+=0.3")
          .to(dedo, { autoAlpha: 1, duration: 0.25 }, "<0.3")
          .to(dedo, { left: () => `${alvo().x}em`, top: () => `${alvo().y}em`, duration: 0.7, ease: "power3.inOut" })
          .to(dedo, { scale: 0.74, duration: 0.12, ease: "power2.out" })
          .fromTo(k(".onda-pq"), { scale: 0.5, opacity: 0.95 }, { scale: 2.6, opacity: 0, duration: 0.6, ease: "power2.out" }, "<")
          .to(dedo, { scale: 1, duration: 0.25, ease: "back.out(3)" })
          // a aula abre de baixo, como no app
          .to(k(".tela-quiz-pq"), { yPercent: 0, duration: 0.65, ease: "power3.out" }, "-=0.1")
          .to(dedo, { autoAlpha: 0, duration: 0.2 }, "<")
          .call(() => responder(true), [], "+=0.8")
          .fromTo(k(".mais-xp-pq"), { y: 10, autoAlpha: 0, scale: 0.6 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2.6)" }, "<0.15")
          .to(k(".mais-xp-pq"), { y: -14, autoAlpha: 0, duration: 0.4, ease: "power2.in" }, "+=1.4");

        // 2. Receita em três momentos: seguidores viram alunos, as vendas da trilha sobem e o dinheiro cai no bolso.
        const receita = q(".palco-receita")[0];
        const r = gsap.utils.selector(receita);
        const bolso = { v: BOLSO };
        const escreverBolso = () =>
          r(".valor-bolso").forEach((e) => {
            e.textContent = reais(bolso.v);
          });
        loop(receita)
          // 1º momento
          .from(r(".seguidor"), { scale: 0.4, autoAlpha: 0, duration: 0.4, stagger: 0.05, ease: "back.out(2)" })
          .from(r(".virou"), { filter: "grayscale(1)", opacity: 0.45, duration: 0.4, stagger: 0.2 }, "+=0.2")
          .from(r(".selo-aluno"), { scale: 0, duration: 0.4, stagger: 0.2, ease: "back.out(3)" }, "<0.1")
          .from(r(".alunos-pq"), { autoAlpha: 0, x: 10, duration: 0.4 }, "<")
          .from(r(".contador-alunos"), { textContent: 0, snap: { textContent: 1 }, duration: 0.9, ease: "power2.out" }, "<")
          // 2º momento
          .from(r(".vendas-pq"), { y: 18, autoAlpha: 0, duration: 0.5, ease: "power3.out" }, "+=0.5")
          .from(r(".barra-receita"), { scaleY: 0, duration: 0.45, stagger: 0.1, ease: "back.out(1.6)" }, "<0.2")
          // 3º momento
          .from(r(".bolso-pq"), { y: 18, scale: 0.94, autoAlpha: 0, duration: 0.5, ease: "back.out(1.6)" }, "+=0.5")
          .fromTo(
            r(".moeda-pq"),
            { y: -46, autoAlpha: 0, rotation: -30 },
            { y: 0, autoAlpha: 1, rotation: 0, duration: 0.45, stagger: 0.12, ease: "power2.in" },
            "<0.2",
          )
          .to(r(".moeda-pq"), { autoAlpha: 0, scale: 0.4, duration: 0.2, stagger: 0.12 }, "<0.4")
          .fromTo(bolso, { v: 0 }, { v: BOLSO, duration: 1.1, ease: "power2.out", onUpdate: escreverBolso }, "<-0.2")
          .fromTo(r(".carteira-pq"), { scale: 1 }, { scale: 1.18, duration: 0.18, yoyo: true, repeat: 3, ease: "power2.out" }, "<");

        // 3. Comunidade: o ranking se monta, o XP sobe e a ofensiva vira mais um dia.
        const comunidade = q(".palco-comunidade")[0];
        const m = gsap.utils.selector(comunidade);
        loop(comunidade)
          .from(m(".linha-ranking"), { x: -30, autoAlpha: 0, duration: 0.5, stagger: 0.12, ease: "power3.out" })
          .from(m(".barra-xp"), { scaleX: 0, duration: 0.8, stagger: 0.12, ease: "power2.out" }, "<0.2")
          .from(m(".xp-num"), { textContent: 0, snap: { textContent: 1 }, duration: 0.8, stagger: 0.12, ease: "power2.out" }, "<")
          .fromTo(m(".mais-xp"), { y: 6, autoAlpha: 0, scale: 0.6 }, { y: -18, autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2.5)" }, "+=0.2")
          .to(m(".mais-xp"), { y: -34, autoAlpha: 0, duration: 0.45, ease: "power2.in" }, "+=0.5")
          .from(m(".dias-ofensiva"), { textContent: 6, snap: { textContent: 1 }, duration: 0.01 }, "<")
          .fromTo(m(".chama"), { scale: 1 }, { scale: 1.35, rotation: -10, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" }, "<");
      });
    },
    { scope: ref },
  );

  const maxXp = Math.max(...c.comunidade.linhas.map((l) => l.xp));

  return (
    <section id="por-que" ref={ref} className="relative z-10 bg-white pb-16 pt-20 md:pb-24 md:pt-28">
      <Onda cor="text-white" />
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <div className="cabeca-pq mx-auto max-w-[760px] text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-marca-700">{c.eyebrow}</p>
          <h2 className="mt-4 text-[clamp(2.1rem,4.6vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-tinta">
            {c.tituloA} <span className="text-marca-600">{c.tituloB}</span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-tinta-2">{c.texto}</p>
        </div>

        <div className="grade-pq mt-14 grid gap-5 md:grid-cols-3 md:gap-6">
          {/* 1. qualidade: e-book e curso gravado riscados, e o app real sobe por cima */}
          <article className="cartao-pq rounded-[32px] border border-linha bg-fundo p-3">
            <div
              className="palco-qualidade relative h-[280px] overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_50%_100%,rgb(216_208_255/0.8),white_70%)]"
              aria-hidden
            >
              <div className="absolute inset-x-4 top-[58px] grid grid-cols-2 gap-3">
                <div className="item-ruim relative rounded-2xl border border-linha bg-white p-3 shadow-card" style={{ opacity: 0.5, transform: RUIM_FINAL[0] }}>
                  <span className="grid size-9 place-items-center rounded-xl bg-rosa-bg text-rosa">
                    <FileText className="size-[18px]" />
                  </span>
                  <p className="mt-2 truncate text-[13px] font-extrabold text-tinta">{c.qualidade.ebook}</p>
                  <p className="text-[11.5px] font-semibold text-suave">{c.qualidade.ebookDetalhe}</p>
                  <div className="mt-2 grid gap-1">
                    <span className="h-1.5 w-full rounded bg-linha" />
                    <span className="h-1.5 w-3/4 rounded bg-linha" />
                  </div>
                  <Risco />
                </div>
                <div className="item-ruim relative rounded-2xl border border-linha bg-white p-3 shadow-card" style={{ opacity: 0.5, transform: RUIM_FINAL[1] }}>
                  <div className="grid h-9 place-items-center rounded-xl bg-tinta/85">
                    <Play className="size-4 fill-white text-white" />
                  </div>
                  <p className="mt-2 truncate text-[13px] font-extrabold text-tinta">{c.qualidade.curso}</p>
                  <p className="text-[11.5px] font-semibold text-suave">{c.qualidade.cursoDetalhe}</p>
                  <span className="mt-2 block h-1.5 w-full rounded bg-linha">
                    <span className="block h-full w-[4%] rounded bg-rosa" />
                  </span>
                  <Risco />
                </div>
              </div>

              {/* o app do aluno, com o quiz de verdade */}
              <div className="celular-pq absolute left-1/2 top-[44px] z-10 -translate-x-1/2 text-[7px]">
                <div className="-rotate-[3deg]">
                  <Celular className="h-[53em] w-[27em]">
                    <div className="tela-app tela-trilha-pq absolute inset-0">
                      <TelaTrilha />
                    </div>
                    {/* sem movimento, fica a aula aberta (o estado final) */}
                    <div className="tela-app tela-quiz-pq absolute inset-0 z-10">
                      <TelaQuiz />
                    </div>
                    <span className="dedo-pq invisible absolute z-40 size-[3.4em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/55 shadow-[0_0.6em_1.4em_-0.4em_rgb(29_26_58/0.55)] ring-[0.22em] ring-tinta/75 backdrop-blur-[2px]">
                      <span className="onda-pq absolute inset-0 rounded-full ring-[0.22em] ring-white" />
                    </span>
                  </Celular>
                </div>
              </div>
              <span className="mais-xp-pq invisible absolute right-[14%] top-[120px] z-20 rounded-full bg-tinta px-2.5 py-1 font-mono text-[11px] text-white shadow-flutuante">
                {c.qualidade.xp}
              </span>
            </div>
            <Texto titulo={c.qualidade.titulo} texto={c.qualidade.texto} />
          </article>

          {/* 2. receita */}
          <article className="cartao-pq rounded-[32px] border border-linha bg-fundo p-3">
            <div className="palco-receita relative flex h-[280px] flex-col gap-2 overflow-hidden rounded-[26px] bg-white p-3.5" aria-hidden>
              {/* 1º momento: seguidores viram alunos */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-fundo px-2.5 py-1 text-[11.5px] font-bold text-tinta-2">
                    <Users className="size-3.5" /> 12,4 mil {c.receita.seguidores}
                  </span>
                  <span className="alunos-pq whitespace-nowrap text-[12px] font-extrabold text-verde">
                    +<span className="contador-alunos">38</span> {c.receita.alunos}
                  </span>
                </div>
                <div className="mt-2.5 flex justify-between px-0.5">
                  {SEGUIDORES.map((p, i) => {
                    const virou = VIRAM_ALUNOS.includes(i);
                    return (
                      <span key={p} className="seguidor relative">
                        <span
                          className={`block rounded-full ${virou ? "virou" : "opacity-45 grayscale"}`}
                          style={virou ? { filter: "grayscale(0)" } : undefined}
                        >
                          <Avatar quem={p} fundo={FUNDOS[i % FUNDOS.length]} anel={false} className="size-9 ring-2 ring-white" />
                        </span>
                        {virou && (
                          <span className="selo-aluno absolute -bottom-1 -right-1 grid size-[18px] place-items-center rounded-full bg-verde text-white ring-2 ring-white">
                            <Check className="size-2.5" strokeWidth={3.5} />
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* 2º momento: as vendas da trilha sobem */}
              <div className="vendas-pq flex flex-1 items-end justify-between gap-3 rounded-2xl bg-fundo px-3.5 py-2.5">
                <div className="pb-0.5">
                  <span className="grid size-8 place-items-center rounded-xl bg-marca-100 text-marca-600">
                    <TrendingUp className="size-4" strokeWidth={2.6} />
                  </span>
                  <p className="mt-2 text-[13px] font-extrabold leading-tight text-tinta">{c.receita.vendas}</p>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-suave">{c.receita.crescimento}</p>
                </div>
                <svg viewBox="0 0 100 50" className="h-[62px] w-[118px]" aria-hidden>
                  {BARRAS.map((h, i) => (
                    <rect
                      key={i}
                      className="barra-receita origin-bottom [transform-box:fill-box]"
                      x={2 + i * 16.5}
                      y={50 - h * 0.5}
                      width="12"
                      height={h * 0.5}
                      rx="2.5"
                      fill={i === BARRAS.length - 1 ? "#6c5ce7" : "#bbaeff"}
                    />
                  ))}
                </svg>
              </div>

              {/* 3º momento: mais receita no bolso */}
              <div className="bolso-pq gradiente-marca relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-white">
                <span className="carteira-pq relative grid size-10 shrink-0 place-items-center rounded-xl bg-white/20">
                  <Wallet className="size-5" strokeWidth={2.4} />
                  {[0, 1, 2].map((i) => (
                    <Coins key={i} className="moeda-pq invisible absolute -top-2 size-4 text-ambar" style={{ left: `${4 + i * 10}px` }} strokeWidth={2.6} />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="valor-bolso block text-[22px] font-extrabold leading-none tracking-[-0.03em]">{reais(BOLSO)}</span>
                  <span className="mt-1 block text-[12px] font-semibold text-white/80">{c.receita.bolso}</span>
                </span>
              </div>
            </div>
            <Texto titulo={c.receita.titulo} texto={c.receita.texto} />
          </article>

          {/* 3. comunidade */}
          <article className="cartao-pq rounded-[32px] border border-linha bg-fundo p-3">
            <div className="palco-comunidade relative flex h-[280px] flex-col justify-center overflow-hidden rounded-[26px] bg-white px-4" aria-hidden>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-marca-700">{c.comunidade.ranking}</span>
                <span className="flex items-center gap-1 rounded-full bg-ambar-bg px-2.5 py-1 text-[12px] font-bold text-ambar">
                  <Flame className="chama size-3.5 fill-current" />
                  <span className="dias-ofensiva">7</span> {c.comunidade.ofensiva}
                </span>
              </div>
              <ul className="mt-4 grid gap-2.5">
                {c.comunidade.linhas.map((l, i) => (
                  <li key={l.nome} className={`linha-ranking relative flex items-center gap-2.5 rounded-2xl p-2 ${i === 0 ? "bg-marca-50" : ""}`}>
                    <span className="w-6 text-center font-mono text-[12px] font-bold text-suave">{i + 1}º</span>
                    <Avatar quem={RANKING_AVATARES[i]} fundo={(["rosa", "azul", "pessego"] as const)[i]} anel={false} className="size-9" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-extrabold text-tinta">{l.nome}</span>
                      <span className="mt-1 block h-1.5 rounded-full bg-marca-100">
                        <span className="barra-xp block h-full origin-left rounded-full bg-marca-500" style={{ width: `${(l.xp / maxXp) * 100}%` }} />
                      </span>
                    </span>
                    <span className="font-mono text-[12px] font-bold text-marca-700">
                      <span className="xp-num">{l.xp}</span> XP
                    </span>
                    {i === 1 && (
                      <span className="mais-xp invisible absolute -top-1 right-10 rounded-full bg-tinta px-2 py-0.5 font-mono text-[10.5px] text-white">
                        {c.comunidade.xp}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <Texto titulo={c.comunidade.titulo} texto={c.comunidade.texto} />
          </article>
        </div>
      </div>
    </section>
  );
}

function Texto({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="px-3 pb-3 pt-5">
      <h3 className="text-[21px] font-extrabold leading-tight tracking-[-0.02em] text-tinta">{titulo}</h3>
      <p className="mt-2 text-[15.5px] leading-relaxed text-tinta-2">{texto}</p>
    </div>
  );
}

/** X vermelho que risca o e-book e o curso gravado. */
function Risco() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
      fill="none"
    >
      <path className="risco" d="M12 14 L88 86" stroke="#e8478f" strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path className="risco" d="M88 14 L12 86" stroke="#e8478f" strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
