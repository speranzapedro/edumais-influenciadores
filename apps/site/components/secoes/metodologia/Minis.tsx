"use client";

import {
  BookOpen,
  Check,
  Flame,
  GripVertical,
  ListOrdered,
  MessageCircle,
  MousePointer2,
  PenLine,
  Send,
  Sparkles,
  SquareCheckBig,
  Upload,
  Zap,
} from "lucide-react";
import { useRef } from "react";
import { useConteudo } from "../../conteudo";
import { gsap, MIDIA, ScrollTrigger, useGSAP } from "../../motion/gsap";
import { Rabisco } from "../../ui/Rabisco";

const useMinis = () => useConteudo().metodologia!.minis;

type Q = (sel: string) => Element[];

/** Monta um loop de animação que só roda enquanto a mini-ilustração está na tela. */
function useMini(montar: (q: Q, tl: gsap.core.Timeline) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MIDIA.movimento, () => {
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
        montar(gsap.utils.selector(ref) as Q, tl);
        ScrollTrigger.create({
          trigger: ref.current,
          start: "top 92%",
          end: "bottom 8%",
          onToggle: (st) => (st.isActive ? tl.play() : tl.pause()),
        });
      });
    },
    { scope: ref },
  );
  return ref;
}

const caixa = "relative h-[168px] overflow-hidden rounded-[20px]";

/* Escolha do tema: títulos de trilha digitados um a um ────────── */
export function MiniTema() {
  const m = useMinis().tema!;
  const ref = useMini((q, tl) => {
    const texto = q(".tema-texto")[0];
    const icone = q(".tema-icone")[0];
    const chips = q(".tema-chip");
    m.temas.forEach(([emoji, titulo], i) => {
      const digitado = { n: 0 };
      tl.call(() => {
        icone.textContent = emoji;
        texto.textContent = "";
        // Estilo em linha: a classe do React ficaria presa no primeiro chip.
        chips.forEach((c, j) => {
          gsap.set(c, j === i ? { backgroundColor: "#6c5ce7", color: "#ffffff" } : { backgroundColor: "rgb(255 255 255 / 0.7)", color: "#4b4868" });
        });
      })
        .fromTo(icone, { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(3)" })
        .fromTo(
          digitado,
          { n: 0 },
          {
            n: titulo.length,
            duration: titulo.length * 0.045,
            ease: "none",
            onUpdate: () => {
              texto.textContent = titulo.slice(0, Math.round(digitado.n));
            },
          },
          "<0.1",
        )
        .fromTo(q(".tema-ok"), { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, "+=0.15")
        .to({}, { duration: 1.1 })
        .to(q(".tema-ok"), { scale: 0, duration: 0.2 });
    });
  });
  const [emoji, titulo] = m.temas[0];
  return (
    <div ref={ref} className={`${caixa} bg-ambar-bg px-5 pt-3.5`}>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#a87600]">{m.rotulo}</span>
      <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white p-2 pr-3 shadow-[0_12px_24px_-14px_rgb(29_26_58/0.35)]">
        <span className="tema-icone grid size-9 shrink-0 place-items-center rounded-xl bg-ambar-bg text-[19px]">{emoji}</span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-tinta">
          <span className="tema-texto">{titulo}</span>
          <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-piscar bg-marca-600" />
        </span>
        <span className="tema-ok grid size-6 shrink-0 place-items-center rounded-full bg-verde text-white">
          <Check className="size-3.5" strokeWidth={3.4} />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {m.temas.map(([e, t, curto], i) => (
          <span
            key={t}
            className={`tema-chip whitespace-nowrap rounded-full bg-white/70 px-2.5 py-1 text-[11.5px] font-bold text-tinta-2 transition-colors duration-300 [&.ativo]:bg-marca-600 [&.ativo]:text-white ${i === 0 ? "ativo" : ""}`}
          >
            {e} {curto}
          </span>
        ))}
        <span className="whitespace-nowrap rounded-full border border-dashed border-[#d9b25c] px-2.5 py-1 text-[11.5px] font-bold text-[#a87600]">
          {m.outro}
        </span>
      </div>
    </div>
  );
}

/* 1 · Upload da ementa ─────────────────────────────────────────── */
export function MiniUpload() {
  const m = useMinis().upload;
  const ref = useMini((q, tl) => {
    tl.set(q(".arquivo"), { y: -130, rotation: -16, autoAlpha: 1 })
      .set(q(".barra"), { scaleX: 0 })
      .set(q(".ok"), { scale: 0 })
      .set(q(".zona"), { borderColor: "#a9c6f7", backgroundColor: "rgb(255 255 255 / 0)" })
      .to(q(".arquivo"), { y: 0, rotation: 2, duration: 0.8, ease: "bounce.out" })
      .to(q(".zona"), { borderColor: "#3b82f6", backgroundColor: "rgb(255 255 255 / 0.5)", duration: 0.25 }, "<0.45")
      .to(q(".barra"), { scaleX: 1, duration: 1.1, ease: "power2.inOut" })
      .to(q(".ok"), { scale: 1, duration: 0.5, ease: "back.out(3)" })
      .to(q(".arquivo"), { y: 40, autoAlpha: 0, duration: 0.4, ease: "power2.in" }, "+=1")
      .to(q(".ok"), { scale: 0, duration: 0.25 }, "<");
  });
  return (
    <div ref={ref} className={`${caixa} bg-azul-bg`}>
      <div className="zona absolute inset-x-5 bottom-11 top-4 grid place-items-center rounded-2xl border-2 border-dashed border-[#a9c6f7]">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-azul/80">
          <Upload className="size-4" /> {m.zona}
        </span>
      </div>
      <div className="arquivo invisible absolute left-1/2 top-9 flex w-[196px] -translate-x-1/2 items-center gap-3 rounded-xl bg-white p-3 shadow-[0_12px_24px_-12px_rgb(29_26_58/0.35)]">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-vermelho-bg font-mono text-[10px] font-medium text-vermelho">PDF</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold text-tinta">{m.arquivo}</span>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-linha">
            <span className="barra block h-full origin-left rounded-full bg-azul" />
          </span>
        </span>
        <span className="ok absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-verde text-white shadow">
          <Check className="size-3.5" strokeWidth={3.4} />
        </span>
      </div>
      <div className="absolute bottom-3 left-5 flex gap-1.5">
        {["PDF", "DOCX", "TXT", "MD"].map((f) => (
          <span key={f} className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] text-azul">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

/* 2 · IA organiza os módulos ───────────────────────────────────── */
export function MiniModulos() {
  const MODULOS = useMinis().modulos;
  const ref = useMini((q, tl) => {
    tl.set(q(".modulo"), { autoAlpha: 0, x: 24 })
      .set(q(".feixe"), { y: 0 })
      .to(q(".feixe"), { y: 170, duration: 1.6, ease: "none" })
      .to(q(".linha-doc"), { backgroundColor: "#d8d0ff", duration: 0.2, stagger: 0.12 }, "<")
      .to(q(".modulo"), { autoAlpha: 1, x: 0, duration: 0.55, stagger: 0.32, ease: "back.out(2.2)" }, "<0.35")
      .fromTo(q(".faisca"), { rotation: 0, scale: 1 }, { rotation: 180, scale: 1.35, duration: 0.5, yoyo: true, repeat: 3, ease: "power2.inOut" }, "<")
      .to(q(".modulo"), { autoAlpha: 0, x: -12, duration: 0.3, stagger: 0.06 }, "+=1.5")
      .to(q(".linha-doc"), { backgroundColor: "#ebebf3", duration: 0.3 }, "<");
  });
  return (
    <div ref={ref} className={`${caixa} flex items-center gap-4 bg-lilas-bg px-5`}>
      <div className="relative h-[128px] w-[88px] shrink-0 overflow-hidden rounded-lg bg-white p-2.5 shadow-[0_10px_20px_-12px_rgb(29_26_58/0.35)]">
        {[90, 70, 84, 60, 92, 74, 50, 86, 66, 78].map((w, i) => (
          <span key={i} className="linha-doc mb-[5px] block h-[5px] rounded-full bg-linha" style={{ width: `${w}%` }} />
        ))}
        <span className="feixe absolute inset-x-0 -top-10 h-10 bg-gradient-to-b from-transparent via-marca-400/50 to-transparent" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {MODULOS.map(([t, p], i) => (
          <div key={t} className="modulo invisible flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-[0_6px_14px_-10px_rgb(29_26_58/0.4)]">
            <span className="font-mono text-[10.5px] text-marca-600">M{i + 1}</span>
            <span className="truncate text-[13px] font-bold text-tinta">{t}</span>
            <span className="ml-auto shrink-0 font-mono text-[10px] text-suave">{p}</span>
          </div>
        ))}
      </div>
      <Sparkles className="faisca absolute right-3 top-3 size-5 text-marca-500" />
    </div>
  );
}

/* 3 · Professor revisa e ajusta ────────────────────────────────── */
export function MiniRevisao() {
  const m = useMinis().revisao;
  const ref = useMini((q, tl) => {
    const [r0, r1, r2] = q(".linha-mod");
    tl.set([r0, r1, r2], { y: 0, scale: 1, boxShadow: "0 4px 10px -8px rgb(29 26 58 / 0.4)" })
      .set(q(".cursor"), { x: 250, y: 130, scale: 1 })
      .set(q(".extra"), { width: 0 })
      .set(q(".balao"), { scale: 0, autoAlpha: 0 })
      .to(q(".cursor"), { x: 26, y: 62, duration: 0.8, ease: "power3.inOut" })
      .to(q(".cursor"), { scale: 0.82, duration: 0.12 })
      .to(r1, { scale: 1.04, boxShadow: "0 16px 26px -12px rgb(29 26 58 / 0.45)", duration: 0.15 }, "<")
      .to([q(".cursor"), r1], { y: "-=40", duration: 0.55, ease: "power2.inOut" })
      .to(r0, { y: 40, duration: 0.45, ease: "power2.inOut" }, "<0.1")
      .to(q(".cursor"), { scale: 1, duration: 0.12 })
      .to(r1, { scale: 1, boxShadow: "0 4px 10px -8px rgb(29 26 58 / 0.4)", duration: 0.2 }, "<")
      .to(q(".cursor"), { x: 196, y: 108, duration: 0.6, ease: "power3.inOut" })
      .to(q(".extra"), { width: "auto", duration: 0.8, ease: "steps(11)" })
      .to(q(".balao"), { scale: 1, autoAlpha: 1, duration: 0.5, ease: "back.out(2.6)" }, "+=0.15")
      .to({}, { duration: 1.6 })
      .to([q(".balao"), q(".cursor")], { autoAlpha: 0, duration: 0.3 })
      .set(q(".cursor"), { autoAlpha: 1 });
  });
  const linha = "linha-mod absolute inset-x-5 flex h-[34px] items-center gap-2 rounded-xl bg-white px-2.5 text-[13px] font-bold text-tinta";
  return (
    <div ref={ref} className={`${caixa} bg-ambar-bg`}>
      <div className={linha} style={{ top: 16 }}>
        <GripVertical className="size-4 text-suave" /> {m.linhas[0]}
      </div>
      <div className={linha} style={{ top: 56 }}>
        <GripVertical className="size-4 text-suave" /> {m.linhas[1]}
      </div>
      <div className={linha} style={{ top: 96 }}>
        <GripVertical className="size-4 text-suave" /> {m.linhas[2]}
        <span className="extra inline-block overflow-hidden whitespace-nowrap text-marca-600">{m.extra}</span>
        <span className="-ml-1.5 h-4 w-[2px] animate-piscar bg-marca-600" />
      </div>
      <div className="balao absolute bottom-3 right-4 flex items-center gap-1.5 rounded-xl rounded-br-sm bg-tinta px-2.5 py-1.5 text-[11.5px] font-semibold text-white">
        <Sparkles className="size-3.5 text-marca-300" /> {m.balao}
      </div>
      <MousePointer2 className="cursor absolute left-0 top-0 size-6 fill-tinta text-white drop-shadow" />
    </div>
  );
}

/* 4 · IA cria as microaulas ────────────────────────────────────── */
const TIPOS = [
  { r: "Texto", I: BookOpen, c: "bg-lilas-bg text-lilas" },
  { r: "Quiz", I: SquareCheckBig, c: "bg-azul-bg text-azul" },
  { r: "Completar", I: PenLine, c: "bg-laranja-bg text-laranja" },
  { r: "Ordenar", I: ListOrdered, c: "bg-verde-bg text-verde" },
  { r: "Aberta", I: MessageCircle, c: "bg-rosa-bg text-rosa" },
];
export function MiniAulas() {
  const ref = useMini((q, tl) => {
    const leque = [
      { x: -116, y: 16, rotation: -18 },
      { x: -58, y: 2, rotation: -9 },
      { x: 0, y: -4, rotation: 0 },
      { x: 58, y: 2, rotation: 9 },
      { x: 116, y: 16, rotation: 18 },
    ];
    tl.set(q(".aula"), { x: 0, y: 30, rotation: 0, scale: 0.7, autoAlpha: 0 })
      .set(q(".selo-tempo"), { scale: 0, autoAlpha: 0 })
      .to(q(".aula"), { autoAlpha: 1, scale: 0.85, y: 20, duration: 0.3, stagger: 0.04 })
      .to(q(".aula"), {
        x: (i) => leque[i].x,
        y: (i) => leque[i].y,
        rotation: (i) => leque[i].rotation,
        scale: 1,
        duration: 0.8,
        stagger: 0.07,
        ease: "back.out(1.8)",
      })
      .to(q(".selo-tempo"), { scale: 1, autoAlpha: 1, duration: 0.45, ease: "back.out(3)" }, "-=0.3")
      .to(q(".aula"), { y: "-=8", duration: 0.25, stagger: { each: 0.08, yoyo: true, repeat: 1 }, ease: "power2.out" }, "+=0.3")
      .to(q(".aula"), { x: 0, y: 24, rotation: 0, scale: 0.8, autoAlpha: 0, duration: 0.5, stagger: 0.04, ease: "power3.in" }, "+=1.1")
      .to(q(".selo-tempo"), { scale: 0, autoAlpha: 0, duration: 0.25 }, "<");
  });
  return (
    <div ref={ref} className={`${caixa} bg-rosa-bg`}>
      {TIPOS.map(({ r, I, c }) => (
        <div
          key={r}
          className="aula invisible absolute left-1/2 top-[34px] -ml-[34px] flex h-[88px] w-[68px] flex-col items-center justify-center gap-2 rounded-2xl border border-linha border-b-4 bg-white shadow-[0_10px_20px_-12px_rgb(29_26_58/0.4)]"
        >
          <span className={`grid size-8 place-items-center rounded-xl ${c}`}>
            <I className="size-4" />
          </span>
          <span className="text-[10.5px] font-bold text-tinta">{r}</span>
        </div>
      ))}
      <span className="selo-tempo invisible absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-tinta px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-white">
        aulas de 3–5 min
      </span>
    </div>
  );
}

/* 5 · Professor revisa e publica ───────────────────────────────── */
export function MiniPublicar() {
  const m = useMinis().publicar;
  const ref = useMini((q, tl) => {
    tl.set(q(".bolinha"), { x: 0 })
      .set(q(".trilho-toggle"), { backgroundColor: "#dcdbe8" })
      .set(q(".aviao"), { x: 0, y: 0, rotation: 0, autoAlpha: 0, scale: 0.6 })
      .set(q(".notificacao"), { y: -30, autoAlpha: 0 })
      .to(q(".bolinha"), { x: 20, duration: 0.35, ease: "back.out(2.5)" }, "+=0.4")
      .to(q(".trilho-toggle"), { backgroundColor: "#1fb768", duration: 0.25 }, "<")
      .to(q(".aviao"), { autoAlpha: 1, scale: 1, duration: 0.2 })
      .to(q(".aviao"), {
        motionPath: {
          path: [
            { x: 40, y: -46 },
            { x: 110, y: -40 },
            { x: 150, y: -8 },
          ],
          curviness: 1.3,
          autoRotate: 45,
        },
        duration: 1,
        ease: "power1.inOut",
      })
      .to(q(".aviao"), { autoAlpha: 0, scale: 0.4, duration: 0.15 })
      .fromTo(q(".mini-cel"), { rotation: 0 }, { rotation: 4, duration: 0.07, yoyo: true, repeat: 5 }, "<")
      .to(q(".notificacao"), { y: 0, autoAlpha: 1, duration: 0.5, ease: "back.out(2)" }, "<")
      .to({}, { duration: 1.6 })
      .to(q(".notificacao"), { autoAlpha: 0, duration: 0.3 });
  });
  return (
    <div ref={ref} className={`${caixa} flex items-center justify-between bg-verde-bg px-5`}>
      <div className="relative rounded-2xl bg-white p-3.5 shadow-[0_10px_20px_-12px_rgb(29_26_58/0.35)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-suave">Trilha revisada</p>
        <div className="mt-1.5 flex items-center gap-3">
          <span className="text-[14px] font-extrabold text-tinta">Publicar trilha</span>
          <span className="trilho-toggle relative h-6 w-11 rounded-full bg-[#dcdbe8]">
            <span className="bolinha absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow" />
          </span>
        </div>
        <Send className="aviao invisible absolute right-2 top-1/2 size-5 fill-marca-200 text-marca-600" />
      </div>
      <div className="mini-cel relative h-[132px] w-[74px] rounded-[16px] bg-tinta p-[4px]">
        <div className="relative h-full overflow-hidden rounded-[12px] bg-fundo">
          <span className="gradiente-marca absolute inset-x-0 top-0 h-10" />
          <div className="notificacao invisible absolute inset-x-1 top-3 rounded-lg bg-white p-1.5 shadow">
            <p className="text-[7.5px] font-extrabold leading-tight text-tinta">Nova trilha!</p>
            <p className="text-[6.5px] leading-tight text-suave">{m.trilha}</p>
          </div>
          <div className="absolute inset-x-2 top-[62px] grid gap-1.5">
            <span className="h-1.5 rounded-full bg-linha" />
            <span className="h-1.5 w-3/4 rounded-full bg-linha" />
            <span className="h-1.5 w-1/2 rounded-full bg-linha" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* 6 · Aluno estuda, ganha XP e sobe ────────────────────────────── */
export function MiniAluno() {
  const m = useMinis().placar;
  const ref = useMini((q, tl) => {
    const xpEl = q(".xp-num")[0] as HTMLElement;
    const voceEl = q(".xp-voce")[0] as HTMLElement;
    const o = { v: 128 };
    const pinta = () => {
      xpEl.textContent = String(Math.round(o.v));
      voceEl.textContent = String(Math.round(o.v));
    };
    tl.set(o, { v: 128, onComplete: pinta })
      .set(q(".linha-voce"), { y: 0 })
      .set(q(".linha-caio"), { y: 0 })
      .set(q(".mais-xp"), { y: 0, autoAlpha: 0, scale: 0.6 })
      .to(q(".mais-xp"), { y: -26, autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2.5)" }, "+=0.4")
      .to(o, { v: 138, duration: 0.8, ease: "power2.out", onUpdate: pinta }, "<0.15")
      .fromTo(q(".chama"), { scale: 1 }, { scale: 1.35, rotation: -8, duration: 0.18, yoyo: true, repeat: 3, ease: "power2.inOut" }, "<")
      .to(q(".mais-xp"), { y: -46, autoAlpha: 0, duration: 0.4 }, "+=0.2")
      .to(q(".linha-voce"), { y: -36, duration: 0.6, ease: "back.inOut(1.6)" }, "<")
      .to(q(".linha-caio"), { y: 36, duration: 0.6, ease: "back.inOut(1.6)" }, "<")
      .to({}, { duration: 1.8 });
  });
  const linha = "absolute inset-x-0 flex h-[30px] items-center gap-2 rounded-xl px-2 text-[12.5px] font-bold";
  return (
    <div ref={ref} className={`${caixa} flex items-center gap-4 bg-laranja-bg px-5`}>
      <div className="relative grid gap-2">
        <span className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[20px] font-extrabold text-tinta shadow-[0_10px_20px_-12px_rgb(29_26_58/0.35)]">
          <Zap className="size-5 fill-marca-500 text-marca-500" />
          <span className="xp-num tabular-nums">128</span>
          <span className="text-[13px] text-suave">XP</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[13px] font-bold text-tinta">
          <Flame className="chama size-4 fill-laranja text-laranja" /> 7 dias
        </span>
        <span className="mais-xp invisible absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-tinta px-2 py-0.5 font-mono text-[11px] text-white">
          +10 XP
        </span>
      </div>
      <div className="relative flex flex-1 gap-2">
        <div className="grid gap-[6px] pt-[1px] font-mono text-[11px] text-suave">
          {m.posicoes.map((p, i) => (
            <span key={i} className="flex h-[30px] items-center">
              {p}
            </span>
          ))}
        </div>
        <div className="relative h-[102px] flex-1">
          <div className={`${linha} top-0 bg-white/70 text-tinta`}>
            {m.avatares && <img src="/avatares/lia" alt="" className="size-6 rounded-full bg-[#ffd5dc]" />} {m.linhas[0].nome}{" "}
            <span className="ml-auto font-mono text-[11px]">{m.linhas[0].xp}</span>
          </div>
          <div className={`linha-caio ${linha} top-[36px] bg-white/70 text-tinta`}>
            {m.avatares && <img src="/avatares/caio" alt="" className="size-6 rounded-full bg-[#d1f4d9]" />} {m.linhas[1].nome}{" "}
            <span className="ml-auto font-mono text-[11px]">{m.linhas[1].xp}</span>
          </div>
          <div className={`linha-voce ${linha} top-[72px] z-10 bg-tinta text-white shadow-[0_10px_20px_-10px_rgb(29_26_58/0.6)]`}>
            <img src="/avatares/joao" alt="" className="size-6 rounded-full bg-[#b6e3f4]" /> {m.voce}{" "}
            <span className="xp-voce ml-auto font-mono text-[11px]">128</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 7 · Dúvidas voltam para a sala ───────────────────────────────── */
export function MiniFeedback() {
  const m = useMinis().erros!;
  const ERROS = m.itens;
  const ref = useMini((q, tl) => {
    tl.set(q(".barra-erro"), { scaleX: 0 })
      .set(q(".circulo-erro .traco"), { drawSVG: "0%" })
      .set(q(".post-it"), { scale: 0, rotation: -20, autoAlpha: 0 })
      .to(q(".barra-erro"), { scaleX: 1, duration: 0.9, stagger: 0.15, ease: "power3.out" }, "+=0.3")
      .to(q(".circulo-erro .traco"), { drawSVG: "100%", duration: 0.7, ease: "power2.inOut" })
      .to(q(".post-it"), { scale: 1, rotation: 5, autoAlpha: 1, duration: 0.6, ease: "back.out(2.4)" }, "-=0.1")
      .to({}, { duration: 1.8 })
      .to([q(".post-it")], { autoAlpha: 0, duration: 0.3 });
  });
  return (
    <div ref={ref} className={`${caixa} bg-vermelho-bg px-5 pt-3.5`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-vermelho/80">{m.titulo}</p>
      <div className="mt-2.5 grid gap-2.5">
        {ERROS.map(({ q, p }, i) => (
          <div key={q} className="relative">
            <div className="flex items-center justify-between text-[12px] font-bold text-tinta">
              <span>{q}</span>
              <span className="font-mono text-[11px] text-vermelho">
                {p}
                {m.sufixo}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
              <span className="barra-erro block h-full origin-left rounded-full bg-vermelho" style={{ width: `${p}%`, opacity: 1 - i * 0.25 }} />
            </div>
            {i === 0 && (
              <Rabisco
                tipo="circulo"
                esticar
                espessura={2.4}
                className="circulo-erro absolute -left-3 -top-2 h-[calc(100%+16px)] w-[calc(100%+24px)] text-tinta"
              />
            )}
          </div>
        ))}
      </div>
      <div className="post-it invisible absolute bottom-2.5 right-3 rounded-md bg-ambar-bg px-2.5 py-1.5 text-[11px] font-bold text-tinta shadow-[0_8px_16px_-8px_rgb(29_26_58/0.4)]">
        {m.postit}
      </div>
    </div>
  );
}
