"use client";

import { Check, Flame, Sparkles, Trophy } from "lucide-react";
import { useRef } from "react";
import { useConteudo, useDemo } from "../../conteudo";
import { gsap, MIDIA, useGSAP } from "../../motion/gsap";
import { Avatar } from "../../ui/Avatar";
import { Celular } from "../../ui/Celular";
import { Rabisco } from "../../ui/Rabisco";
import { TelaAula, TelaFesta, TelaHome, TelaQuiz, TelaTrilha } from "./TelasApp";

/**
 * Palco da hero em `em` (60 × 62): o font-size vem de `cqw`, então tudo escala junto com a largura.
 * Cada peça tem três camadas de movimento que não brigam entre si:
 *   .cam → parallax do mouse (x/y) · div interna → parallax do scroll (var --rol, via CSS translate,
 *   que o GSAP não toca) · .flu → flutuação contínua · .pop → entrada.
 */
export function Camada({ prof, className, children }: { prof: number; className: string; children: React.ReactNode }) {
  return (
    <div data-prof={prof} className={`cam absolute ${className}`} style={{ "--prof": prof } as React.CSSProperties}>
      <div className="[translate:0_calc(var(--rol,0)*var(--prof)*-9em)]">
        <div className="flu">
          <div className="pop">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Sticker({
  icone,
  tile,
  rotulo,
  valor,
  className = "",
}: {
  icone: React.ReactNode;
  tile: string;
  rotulo: string;
  valor: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-[0.75em] rounded-[1.3em] border border-linha border-b-[0.32em] bg-white py-[0.75em] pl-[0.75em] pr-[1.3em] shadow-[0_1.4em_2.6em_-1.4em_rgb(43_38_128/0.4)] ${className}`}
    >
      <span className={`grid size-[2.9em] place-items-center rounded-[0.95em] ${tile}`}>{icone}</span>
      <span className="leading-tight">
        <span className="block font-mono text-[0.85em] uppercase tracking-[0.08em] text-suave">{rotulo}</span>
        <span className="block whitespace-nowrap text-[1.35em] font-extrabold text-tinta">{valor}</span>
      </span>
    </div>
  );
}

/** Rótulos da etapa do fluxo (o último repete o primeiro para o loop emendar sem salto). */
const ETAPAS = ["01 · Home", "02 · Trilha", "03 · Aula", "04 · Desafio", "05 · Recompensa", "01 · Home"];

export function HeroIlustracao() {
  const ref = useRef<HTMLDivElement>(null);
  const { sticker, autor = "Profa. Ana" } = useConteudo().hero;
  const demo = useDemo();
  const xpAula = demo.festa.eventos.reduce((t, e) => t + e.pontos, 0);

  useGSAP(
    (_ctx, contextSafe) => {
      const palco = ref.current!;
      const q = gsap.utils.selector(palco);
      const um = (s: string) => q(s)[0] as HTMLElement;
      const mm = gsap.matchMedia();

      mm.add(MIDIA.movimento, () => {
        gsap.set(palco, { autoAlpha: 1 });

        // ── Entrada ─────────────────────────────────────────────
        const tl = gsap.timeline({ delay: 0.55, defaults: { ease: "power3.out" } });
        tl.from(q(".blob"), { scale: 0, duration: 1.4, ease: "elastic.out(1, 0.55)" })
          .from(q(".orbita"), { drawSVG: "0%", duration: 1.8, stagger: 0.2, ease: "power2.inOut" }, "<0.1")
          .from(q(".cam-celular .pop"), { y: 140, rotation: -14, scale: 0.86, autoAlpha: 0, duration: 1.3, ease: "mola" }, "<0.15")
          .from(q(".tela-home .home-item"), { y: "1.4em", autoAlpha: 0, duration: 0.55, stagger: 0.06, ease: "back.out(2)" }, "<0.5")
          .from(q(".etapa-chip"), { y: "2em", scale: 0.6, autoAlpha: 0, duration: 0.6, ease: "back.out(2.6)" }, "<0.3")
          .from(q(".cam-avatar .pop"), { scale: 0, rotation: -25, autoAlpha: 0, duration: 0.9, stagger: 0.12, ease: "back.out(2.2)" }, "<-0.4")
          .from(q(".cam-sticker .pop"), { scale: 0.4, y: 30, autoAlpha: 0, duration: 0.8, stagger: 0.1, ease: "back.out(2.4)" }, "<0.25")
          .from(q(".doodle .traco"), { traco: "0%", duration: 0.9, stagger: 0.08, ease: "power2.out" }, "<0.2")
          .from(q(".rotulo-5min"), { autoAlpha: 0, rotation: -14, scale: 0.7, duration: 0.6, ease: "back.out(3)" }, "<0.3");

        // ── Flutuação contínua (cada peça com seu próprio ritmo) ─
        q(".flu").forEach((el, i) => {
          gsap.to(el, {
            y: gsap.utils.random(-16, -8),
            rotation: gsap.utils.random(-2.5, 2.5),
            duration: gsap.utils.random(2.4, 3.6),
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: i * 0.17,
          });
        });

        // ── Fluxo do app: home → trilha → aula → desafio → recompensa ─
        const fs = () => parseFloat(getComputedStyle(palco).fontSize);
        /** Centro de um elemento em `em`, relativo à tela do celular (ignora transforms). */
        const centro = (el: HTMLElement) => {
          let x = el.offsetWidth / 2;
          let y = el.offsetHeight / 2;
          let n: HTMLElement | null = el;
          while (n && !n.classList.contains("tela-app")) {
            // As telas reais são desenhadas em 390px e escaladas: converte ao sair da escala.
            const s = Number(n.dataset.escala);
            if (s) {
              x *= s;
              y *= s;
            }
            x += n.offsetLeft;
            y += n.offsetTop;
            n = n.offsetParent as HTMLElement | null;
          }
          return { x: x / fs(), y: y / fs() };
        };

        const dedo = um(".dedo");
        const onda = um(".onda");
        const [home, trilha, aula, quiz, festa] = ["home", "trilha", "aula", "quiz", "festa"].map((t) => um(`.tela-${t}`));
        const trilhoEtapa = um(".etapa-trilho");
        let xp = Number(um(".home-xp").textContent) || 0;
        let dias = Number(um(".home-ofensiva").textContent) || 0;
        const responderQuiz = (sim: boolean) => quiz.dispatchEvent(new CustomEvent("hero:quiz", { detail: sim }));

        const fluxo = gsap.timeline({ repeat: -1, delay: 3.1, defaults: { ease: "power3.inOut" } });

        const etapa = (n: number, pos: gsap.Position = "<") =>
          fluxo.to(trilhoEtapa, { yPercent: (-100 / ETAPAS.length) * n, duration: 0.55, ease: "back.inOut(2)" }, pos);

        const toque = (alvo: string, apertar?: string) => {
          const el = um(alvo);
          const prensa = apertar ? um(apertar) : el;
          // Um alvo ausente não pode interromper o ticker que também dirige o scroll.
          if (!el || !prensa) return;
          fluxo
            .to(dedo, { left: () => `${centro(el).x}em`, top: () => `${centro(el).y}em`, duration: 0.8 })
            .to(dedo, { scale: 0.74, duration: 0.12, ease: "power2.out" })
            .fromTo(onda, { scale: 0.5, opacity: 0.95 }, { scale: 2.6, opacity: 0, duration: 0.6, ease: "power2.out" }, "<")
            .to(prensa, { scale: 0.95, duration: 0.12, ease: "power2.out" }, "<")
            .to(dedo, { scale: 1, duration: 0.25, ease: "back.out(3)" })
            .to(prensa, { scale: 1, duration: 0.35, ease: "back.out(3)" }, "<");
        };

        fluxo
          .call(() => responderQuiz(false))
          .set(q(".quiz-feedback"), { yPercent: 110 })
          .set([trilha, quiz], { xPercent: 100, autoAlpha: 1 })
          .set(aula, { yPercent: 100, xPercent: 0, autoAlpha: 1 })
          .set(festa, { autoAlpha: 0, scale: 1 })
          .set(dedo, { left: "21em", top: "50em", autoAlpha: 0, scale: 1 })
          .to(dedo, { autoAlpha: 1, duration: 0.3 });

        // 1 · Home: toca em "continuar aprendendo"
        toque(".alvo-home", ".home-continuar");

        // 2 · Trilha entra empurrando a home
        fluxo.to(trilha, { xPercent: 0, duration: 0.7 }).to(home, { xPercent: -28, opacity: 0.4, duration: 0.7 }, "<");
        etapa(1);
        fluxo
          .from(q(".trilha-no"), { scale: 0, duration: 0.5, stagger: 0.06, ease: "back.out(2.4)" }, "<0.3")
          .from(q(".trilha-balao"), { y: "0.6em", scale: 0.5, opacity: 0, duration: 0.45, ease: "back.out(3)" }, ">-0.1");
        toque(".alvo-trilha");

        // 3 · Aula abre de baixo, como um modal
        fluxo.to(aula, { yPercent: 0, duration: 0.65, ease: "power3.out" });
        etapa(2);
        fluxo
          .from(q(".aula-item, .aula-formula"), { y: "1.4em", opacity: 0, duration: 0.5, stagger: 0.08, ease: "power3.out" }, "<0.25")
          .to(q(".aula-barra"), { width: "38%", duration: 0.9 }, "<")
          .fromTo(q(".aula-formula"), { scale: 1 }, { scale: 1.06, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.inOut" }, "+=0.1")
          .to({}, { duration: 0.3 });
        toque(".alvo-aula");

        // 4 · Desafio: escolhe a resposta certa
        fluxo.to(quiz, { xPercent: 0, duration: 0.65 }).to(aula, { xPercent: -28, opacity: 0.4, duration: 0.65 }, "<");
        etapa(3);
        fluxo.from(q(".quiz-op"), { x: "2.5em", opacity: 0, duration: 0.45, stagger: 0.07, ease: "power3.out" }, "<0.3").to({}, { duration: 0.35 });
        // O índice já vem no HTML; não depende de uma classe adicionada em useEffect.
        const indiceCorreto = quiz.querySelector<HTMLElement>("[data-resposta-correta]")?.dataset.respostaCorreta;
        if (indiceCorreto !== undefined) toque(`.cartao-quiz button:nth-child(${Number(indiceCorreto) + 1})`);
        fluxo
          .call(() => responderQuiz(true), [], "-=0.4")
          .fromTo(q(".quiz-feedback"), { yPercent: 110 }, { yPercent: 0, duration: 0.55, ease: "back.out(1.3)" }, "+=0.35")
          .fromTo(
            q(".flutua-xp"),
            { y: "1em", scale: 0.5, autoAlpha: 0 },
            { y: "-2.4em", scale: 1, autoAlpha: 1, duration: 0.55, ease: "back.out(2.4)" },
            "<0.15",
          )
          .to(q(".flutua-xp"), { y: "-5em", autoAlpha: 0, duration: 0.5, ease: "power2.in" }, ">0.35")
          .fromTo(q(".cam-acerto .pop"), { scale: 0.8, rotation: -8 }, { scale: 1, rotation: 0, duration: 0.9, ease: "elastic.out(1, 0.4)" }, "<-0.6")
          .to({}, { duration: 0.2 });
        toque(".alvo-quiz-ok");

        // 5 · Recompensa: a tela de festa se abre em círculo a partir do toque
        const okEm = () => centro(um(".alvo-quiz-ok"));
        fluxo
          .call(() => {
            dias += 1;
            q(".festa-dias").forEach((e) => {
              e.textContent = String(dias);
            });
          })
          .set(festa, { autoAlpha: 1, clipPath: () => `circle(0% at ${okEm().x}em ${okEm().y}em)` })
          .to(festa, { clipPath: () => `circle(160% at ${okEm().x}em ${okEm().y}em)`, duration: 0.85, ease: "power3.in" })
          .to(dedo, { autoAlpha: 0, duration: 0.3 }, "<");
        etapa(4);
        fluxo
          .from(q(".festa-trofeu"), { scale: 0, rotation: -50, duration: 0.85, ease: "back.out(2.4)" }, "-=0.15")
          .from(q(".festa-item, .festa-ofensiva"), { y: "1.6em", opacity: 0, duration: 0.5, stagger: 0.1, ease: "back.out(2)" }, "<0.2")
          .fromTo(
            q(".confete"),
            { y: "-2em", x: 0, rotation: 0, opacity: 1 },
            {
              y: () => `${gsap.utils.random(38, 54)}em`,
              x: () => `${gsap.utils.random(-4, 4)}em`,
              rotation: () => gsap.utils.random(-540, 540),
              duration: () => gsap.utils.random(1.6, 2.6),
              ease: "power1.in",
              stagger: 0.025,
            },
            "<-0.4",
          )
          .call(
            () => {
              const o = { v: xp };
              xp += xpAula;
              gsap.to(o, {
                v: xp,
                duration: 0.9,
                ease: "power2.out",
                onUpdate: () =>
                  q(".home-xp").forEach((e) => {
                    e.textContent = String(Math.round(o.v));
                  }),
              });
            },
            [],
            "<0.5",
          )
          .fromTo(q(".festa-ofensiva"), { scale: 1 }, { scale: 1.1, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }, "<0.6")
          .fromTo(q(".cam-ofensiva .pop"), { scale: 0.85, rotation: 8 }, { scale: 1, rotation: 0, duration: 0.9, ease: "elastic.out(1, 0.4)" }, "<")
          .call(
            () =>
              q(".sticker-dias").forEach((e) => {
                e.textContent = String(dias);
              }),
            [],
            "<",
          )
          .to({}, { duration: 1.7 });

        // Volta para a home já com XP e ofensiva atualizados
        fluxo
          .set(home, { xPercent: 0, opacity: 1 })
          .set([trilha, quiz], { xPercent: 100 })
          .set(aula, { yPercent: 100, xPercent: 0, opacity: 1 })
          .call(() => {
            q(".home-xp").forEach((e) => {
              e.textContent = String(xp);
            });
            q(".home-ofensiva").forEach((e) => {
              e.textContent = String(dias);
            });
          })
          .to(festa, { autoAlpha: 0, scale: 1.06, duration: 0.6, ease: "power2.inOut" });
        etapa(5);
        fluxo
          .fromTo(q(".home-ofensiva, .home-xp"), { scale: 1 }, { scale: 1.3, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out", stagger: 0.1 })
          .to({}, { duration: 1.1 })
          .set(trilhoEtapa, { yPercent: 0 });

        // ── De vez em quando um personagem "pula" ───────────────
        const avatares = q(".cam-avatar .pop");
        const pulo = () => {
          const el = gsap.utils.random(avatares);
          gsap
            .timeline({ onComplete: () => void gsap.delayedCall(gsap.utils.random(1.2, 2.4), pulo) })
            .to(el, { scaleY: 0.9, scaleX: 1.06, y: 4, duration: 0.14, ease: "power2.out", transformOrigin: "50% 100%" })
            .to(el, { scaleY: 1.06, scaleX: 0.96, y: -16, duration: 0.24, ease: "power2.out" })
            .to(el, { scale: 1, y: 0, duration: 0.6, ease: "bounce.out" });
        };
        gsap.delayedCall(4, pulo);

        // ── Parallax pelo mouse (só onde há cursor) ─────────────
        if (window.matchMedia("(hover: hover)").matches) {
          const camadas = q(".cam").map((el) => {
            const p = Number((el as HTMLElement).dataset.prof);
            return { p, x: gsap.quickTo(el, "x", { duration: 1.1, ease: "power3.out" }), y: gsap.quickTo(el, "y", { duration: 1.1, ease: "power3.out" }) };
          });
          const mover = contextSafe!((e: PointerEvent) => {
            const nx = e.clientX / window.innerWidth - 0.5;
            const ny = e.clientY / window.innerHeight - 0.5;
            camadas.forEach((c) => {
              c.x(nx * c.p * -34);
              c.y(ny * c.p * -24);
            });
          });
          window.addEventListener("pointermove", mover);
          return () => window.removeEventListener("pointermove", mover);
        }
      });

      mm.add(MIDIA.reduzido, () => {
        gsap.set(palco, { autoAlpha: 1 });
      });

      // ── Parallax pelo scroll: as camadas se afastam quando a hero sai ──
      mm.add(MIDIA.movimento, () => {
        gsap.to(palco, {
          "--rol": 1,
          ease: "none",
          scrollTrigger: { trigger: palco, start: "top 20%", end: "bottom top", scrub: true },
        });
      });
    },
    { scope: ref },
  );

  return (
    <div className="relative mx-auto w-full max-w-[660px] [container-type:inline-size]">
      <div ref={ref} data-revelar className="relative h-[62em] text-[1.6667cqw] max-md:h-[59em] max-md:text-[2.75cqw]" aria-hidden inert>
        {/* brilho e órbitas */}
        <div className="blob absolute left-1/2 top-1/2 size-[40em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(187_174_255/0.55)_0%,rgb(216_208_255/0.35)_38%,transparent_68%)]" />
        <svg aria-hidden="true" viewBox="0 0 600 620" className="absolute inset-0 size-full overflow-visible" fill="none">
          <g transform="rotate(-14 300 330)">
            <path
              className="orbita"
              d="M30 330a270 150 0 1 0 540 0a270 150 0 1 0-540 0"
              stroke="#bbaeff"
              strokeWidth="2"
              strokeDasharray="3 9"
              strokeLinecap="round"
            />
          </g>
          <g transform="rotate(24 300 320)">
            <path
              className="orbita"
              d="M90 320a210 270 0 1 0 420 0a210 270 0 1 0-420 0"
              stroke="#d8d0ff"
              strokeWidth="2"
              strokeDasharray="3 9"
              strokeLinecap="round"
            />
          </g>
        </svg>

        {/* doodles soltos */}
        <Rabisco tipo="estrela" className="doodle absolute left-[12em] top-[14em] max-md:hidden size-[2.6em] text-marca-400" espessura={2.4} />
        <Rabisco tipo="estrela" className="doodle absolute right-[14em] top-[2.5em] max-md:hidden size-[1.8em] text-laranja" espessura={2.4} />
        <Rabisco tipo="espiral" className="doodle absolute bottom-[1em] right-[2em] max-md:hidden w-[6em] text-rosa" espessura={2.6} />
        <Rabisco tipo="zigue" className="doodle absolute left-[1em] top-[2em] max-md:hidden w-[6em] text-verde" espessura={2.6} />

        {/* celular com o fluxo do app */}
        <Camada prof={0.5} className="cam-celular left-[16.5em] top-[4em] z-10 max-md:left-[4.4em] max-md:top-[3em]">
          <div className="relative -rotate-[4deg]">
            <Celular className="h-[53em] w-[27em]">
              <div className="tela-app tela-home absolute inset-0">
                <TelaHome />
              </div>
              <div className="tela-app tela-trilha invisible absolute inset-0">
                <TelaTrilha />
              </div>
              <div className="tela-app tela-aula invisible absolute inset-0">
                <TelaAula />
              </div>
              <div className="tela-app tela-quiz invisible absolute inset-0">
                <TelaQuiz />
              </div>
              <div className="tela-app tela-festa invisible absolute inset-0">
                <TelaFesta />
              </div>
              <span className="flutua-xp invisible absolute left-1/2 top-[30em] z-20 -translate-x-1/2 rounded-full bg-tinta px-[0.8em] py-[0.3em] font-mono text-[1.1em] font-medium text-white">
                +10 XP
              </span>
              {/* o "dedo" que navega pelo app */}
              <span className="dedo invisible absolute z-40 size-[3.4em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/55 shadow-[0_0.6em_1.4em_-0.4em_rgb(29_26_58/0.55)] ring-[0.22em] ring-tinta/75 backdrop-blur-[2px]">
                <span className="onda absolute inset-0 rounded-full ring-[0.22em] ring-white" />
              </span>
            </Celular>
            {/* etapa do fluxo */}
            <div className="etapa-chip absolute -bottom-[1.7em] left-1/2 z-20 flex -translate-x-1/2 items-center gap-[0.6em] whitespace-nowrap rounded-full bg-tinta py-[0.55em] pl-[0.9em] pr-[1.1em] text-white shadow-[0_1em_2em_-1em_rgb(29_26_58/0.6)]">
              <span className="relative flex size-[0.65em]">
                <span className="absolute inset-0 animate-ping rounded-full bg-verde/70" />
                <span className="relative size-[0.65em] rounded-full bg-verde" />
              </span>
              <span className="block h-[1.35em] w-[9.6em] overflow-hidden font-mono text-[1.05em] uppercase leading-[1.35em] tracking-[0.1em]">
                <span className="etapa-trilho block">
                  {ETAPAS.map((e, i) => (
                    <span key={i} className="block">
                      {e}
                    </span>
                  ))}
                </span>
              </span>
            </div>
          </div>
        </Camada>

        {/* personagens */}
        <Camada prof={1.1} className="cam-avatar left-[1.5em] top-[7em] z-20 max-md:hidden">
          <div className="grid justify-items-center gap-[0.6em]">
            <Avatar quem="ana" fundo="lavanda" className="size-[10.5em] !ring-[0.45em]" />
            <span className="rounded-full bg-white px-[0.9em] py-[0.35em] text-[1.05em] font-bold text-tinta shadow-[0_0.8em_1.6em_-0.8em_rgb(43_38_128/0.35)]">
              {autor}
            </span>
          </div>
        </Camada>
        <Camada prof={1.4} className="cam-avatar right-[3em] top-[0.5em] z-0 max-md:hidden">
          <Avatar quem="caio" fundo="verde" className="size-[7.5em] !ring-[0.4em]" />
        </Camada>
        <Camada prof={1.25} className="cam-avatar -right-[0.5em] top-[27em] z-20 max-md:hidden">
          <Avatar quem="joao" fundo="azul" className="size-[12em] !ring-[0.45em]" />
        </Camada>
        <Camada prof={0.9} className="cam-avatar bottom-[3.5em] left-[3em] z-20 max-md:hidden">
          <Avatar quem="lia" fundo="rosa" className="size-[9em] !ring-[0.4em]" />
        </Camada>

        {/* stickers */}
        <Camada prof={1.6} className="cam-sticker left-[16em] -top-[0.5em] z-30 max-md:left-[8em] max-md:-top-[1em]">
          <span className="flex items-center gap-[0.5em] rounded-full border border-marca-200 bg-white/95 px-[1em] py-[0.5em] font-mono text-[1em] uppercase tracking-[0.08em] text-marca-700 shadow-[0_1em_2em_-1em_rgb(43_38_128/0.35)]">
            <Sparkles className="size-[1.2em]" /> Edu montou 6 aulas
          </span>
        </Camada>
        <Camada prof={1.8} className="cam-sticker cam-ofensiva -left-[1em] top-[27em] z-30 max-md:-left-[0.5em] max-md:top-[45em]">
          <Sticker
            icone={<Flame className="size-[1.5em] fill-current" />}
            tile="bg-laranja-bg text-laranja"
            rotulo="Ofensiva"
            valor={
              <>
                <span className="sticker-dias">{demo.painel.ofensiva}</span> dias
              </>
            }
          />
        </Camada>
        <Camada prof={1.5} className="cam-sticker right-[0em] top-[14em] z-30 max-md:hidden">
          <Sticker icone={<Trophy className="size-[1.5em]" />} tile="bg-ambar-bg text-ambar" rotulo={sticker.rotulo} valor={sticker.valor} />
        </Camada>
        <Camada prof={1.2} className="cam-sticker cam-acerto right-[0.5em] top-[41.5em] z-30 max-md:-right-[0.5em] max-md:top-[7em]">
          <Sticker icone={<Check className="size-[1.6em]" strokeWidth={3} />} tile="bg-verde text-white" rotulo="Desafio" valor="Mandou bem!" />
        </Camada>

        {/* seta rabiscada até o celular */}
        <Camada prof={0.7} className="bottom-[16em] left-[4.5em] z-30 max-md:hidden">
          <div className="relative">
            <span className="rotulo-5min absolute -left-[1em] -top-[2.6em] block -rotate-[8deg] whitespace-nowrap font-mono text-[1.2em] font-medium text-marca-700">
              só 5 min/dia
            </span>
            <Rabisco tipo="setaCurva" className="doodle w-[8em] -rotate-[10deg] text-marca-600" espessura={2.6} />
          </div>
        </Camada>
      </div>
    </div>
  );
}
