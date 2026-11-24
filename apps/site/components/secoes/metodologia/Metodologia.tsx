"use client";

import { RefreshCcw, Sparkles } from "lucide-react";
import { useRef } from "react";
import type { ChaveMini } from "@/conteudo/tipos";
import { useConteudo } from "../../conteudo";
import { gsap, MIDIA, ScrollTrigger, useGSAPPerto } from "../../motion/gsap";
import { Escala } from "../../ui/Escala";
import { Onda } from "../../ui/Onda";
import { Lapis, PONTA_LAPIS } from "./Lapis";
import { MiniAluno, MiniAulas, MiniFeedback, MiniModulos, MiniPublicar, MiniRevisao, MiniTema, MiniUpload } from "./Minis";

type Quem = "Professor" | "Edu" | "Aluno";

/** Quem age e a mini-ilustração de cada tipo de passo (o texto vem do conteúdo do público). */
const VISUAL: Record<ChaveMini, { quem: Quem; Mini: () => React.ReactNode }> = {
  tema: { quem: "Professor", Mini: MiniTema },
  upload: { quem: "Professor", Mini: MiniUpload },
  modulos: { quem: "Edu", Mini: MiniModulos },
  revisao: { quem: "Professor", Mini: MiniRevisao },
  aulas: { quem: "Edu", Mini: MiniAulas },
  publicar: { quem: "Professor", Mini: MiniPublicar },
  aluno: { quem: "Aluno", Mini: MiniAluno },
  feedback: { quem: "Professor", Mini: MiniFeedback },
};
/** Ordem padrão dos passos (escolas e professores). */
const ORDEM: ChaveMini[] = ["upload", "modulos", "revisao", "aulas", "publicar", "aluno", "feedback"];

const ROTULO: Record<Quem, string> = {
  Professor: "bg-marca-100 text-marca-700",
  Edu: "gradiente-marca text-white",
  Aluno: "bg-verde-bg text-[#159a55]",
};

/** Âncora do caminho: centro, raios do círculo e o lado em que está o cartão (+1 direita, -1 esquerda). */
type Ancora = { x: number; y: number; rx: number; ry: number; s: 1 | -1 };

/**
 * Caminho rabiscado que liga os números dos passos. Em cada número o traço chega vindo do "corredor"
 * entre os cartões, dá uma volta e meia em torno dele (como quem circula algo à mão) e sai por baixo,
 * de volta ao corredor, rumo ao próximo. Devolve o `d` e, por âncora, o comprimento na entrada e na saída.
 */
function montarCaminho(inicio: { x: number; y: number }, ancoras: Ancora[], medir: SVGPathElement, largura: number) {
  const lim = (v: number) => gsap.utils.clamp(6, largura - 6, v);
  const comprimento = (s: string) => {
    medir.setAttribute("d", s);
    return medir.getTotalLength();
  };
  let d = `M${inicio.x},${inicio.y}`;
  let ex = inicio.x;
  let ey = inicio.y;
  let saida = 0;
  const marcas: { entra: number; sai: number }[] = [];

  ancoras.forEach(({ x, y, rx, ry, s }) => {
    const ty = y - ry;
    const dy = Math.max(50, ty - ey);
    const dx = Math.abs(x - ex);
    const a1 = saida === 0 ? 0 : Math.min(dx * 0.6 + 40, 220);
    const a2 = Math.min(dx * 0.6 + 60, 260);
    d += ` C${lim(ex + saida * a1)},${ey + dy * 0.45} ${lim(x - s * a2)},${ty - dy * 0.06} ${x},${ty}`;
    const entra = comprimento(d);
    const giro = s > 0 ? 1 : 0;
    const k = 1.1;
    d += ` A${rx},${ry} 0 0 ${giro} ${x},${y + ry}`;
    d += ` A${rx * k},${ry * k} 0 0 ${giro} ${x + s * 2},${y - ry * k}`;
    d += ` A${rx * k},${ry * k} 0 0 ${giro} ${x},${y + ry * k + 2}`;
    marcas.push({ entra, sai: comprimento(d) });
    ex = x;
    ey = y + ry * k + 2;
    saida = -s;
  });

  // Rabicho final, como quem tira o lápis do papel.
  d += ` c${saida * 46},8 ${saida * 78},30 ${saida * 66},64`;
  return { d, marcas, total: comprimento(d) };
}

/** Mede as âncoras em relação ao palco. O último elemento (a pílula final) vira uma elipse. */
function medirAncoras(palco: HTMLElement, numeros: HTMLElement[], final: HTMLElement): Ancora[] {
  const caixa = palco.getBoundingClientRect();
  const lista: Ancora[] = numeros.map((el) => {
    const b = el.getBoundingClientRect();
    const cartao = el.parentElement!.querySelector(".cartao")!.getBoundingClientRect();
    const x = b.left - caixa.left + b.width / 2;
    return {
      x,
      y: b.top - caixa.top + b.height / 2,
      rx: b.width / 2 + 12,
      ry: b.height / 2 + 12,
      s: cartao.left + cartao.width / 2 > b.left + b.width / 2 ? 1 : -1,
    };
  });
  const f = final.getBoundingClientRect();
  lista.push({ x: f.left - caixa.left + f.width / 2, y: f.top - caixa.top + f.height / 2, rx: f.width / 2 + 22, ry: f.height / 2 + 16, s: 1 });
  return lista;
}

/** Só aparece para públicos que têm `metodologia` no conteúdo (escolas e professores). */
export function Metodologia() {
  return useConteudo().metodologia ? <MetodologiaSecao /> : null;
}

function MetodologiaSecao() {
  const c = useConteudo().metodologia!;
  const PASSOS = c.passos.map((p, k) => ({ ...p, ...VISUAL[(c.visual ?? ORDEM)[k]] }));
  const nomeQuem = (q: Quem) => (q === "Professor" ? (c.agente ?? "Professor") : q);
  const ref = useRef<HTMLElement>(null);
  const palcoRef = useRef<HTMLDivElement>(null);

  useGSAPPerto(
    () => {
      const palco = palcoRef.current!;
      const q = gsap.utils.selector(palco);
      const caminho = q(".caminho")[0] as unknown as SVGPathElement;
      const sombra = q(".caminho-sombra")[0] as unknown as SVGPathElement;
      const guia = q(".caminho-guia")[0] as unknown as SVGPathElement;
      const medir = q(".caminho-medir")[0] as unknown as SVGPathElement;
      const lapis = q(".lapis")[0] as HTMLElement;
      const ancorasEl = q(".ancora") as HTMLElement[];
      const passosEl = q(".passo") as HTMLElement[];
      const finalEl = q(".ancora-final")[0] as HTMLElement;
      const mm = gsap.matchMedia();

      // ── Cabeçalho ───────────────────────────────────────────────
      mm.add(MIDIA.movimento, () => {
        gsap.from(gsap.utils.toArray(".cab-metodo > *", ref.current), {
          y: 40,
          autoAlpha: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 70%" },
        });
      });

      mm.add(MIDIA.movimento, () => {
        let total = 1;
        // (y no palco, comprimento do caminho): o lápis passa devagar pelos círculos e corre entre eles.
        let chaves: [number, number][] = [];
        let marcas: { entra: number; sai: number }[] = [];
        const estado = { c: 0, l: 0, giro: 22 };
        const feitos = new Set<number>();
        const revelados = new Set<number>();

        const revelar = passosEl.map((p, i) =>
          gsap
            .timeline({ paused: true })
            .fromTo(
              p.querySelector(".cartao"),
              { autoAlpha: 0, y: 70, x: i % 2 ? 50 : -50, rotation: i % 2 ? 4 : -4, scale: 0.94 },
              { autoAlpha: 1, y: 0, x: 0, rotation: 0, scale: 1, duration: 1, ease: "mola" },
            )
            .fromTo(p.querySelectorAll(".cartao-item"), { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.07, ease: "power3.out" }, 0.2),
        );

        const construir = () => {
          const largura = palco.getBoundingClientRect().width;
          const ancoras = medirAncoras(palco, ancorasEl, finalEl);
          const res = montarCaminho({ x: largura < 768 ? ancoras[0].x : largura / 2, y: 0 }, ancoras, medir, largura);
          total = res.total;
          marcas = res.marcas;
          for (const p of [caminho, sombra, guia]) p.setAttribute("d", res.d);
          gsap.set([caminho, sombra], { strokeDasharray: total, strokeDashoffset: total - estado.l });

          const folga = Math.min(90, window.innerHeight * 0.1);
          chaves = [[0, 0]];
          ancoras.forEach((a, i) => {
            chaves.push([a.y - folga, marcas[i].entra]);
            chaves.push([a.y + folga, marcas[i].sai]);
          });
          chaves.push([palco.offsetHeight, total]);
        };

        const comprimentoPara = (c: number) => {
          for (let i = 1; i < chaves.length; i++) {
            const [c1, l1] = chaves[i];
            if (c <= c1) {
              const [c0, l0] = chaves[i - 1];
              return l0 + ((l1 - l0) * (c - c0)) / Math.max(1, c1 - c0);
            }
          }
          return total;
        };

        const giro = gsap.quickTo(estado, "giro", { duration: 0.5, ease: "power3.out" });

        const desenhar = () => {
          const l = gsap.utils.clamp(0, total, comprimentoPara(estado.c));
          const anterior = estado.l;
          estado.l = l;
          gsap.set([caminho, sombra], { strokeDashoffset: total - l });
          const p = caminho.getPointAtLength(l);
          const atras = caminho.getPointAtLength(Math.max(0, l - 8));
          // O lápis se inclina na direção do traço, mas sem girar junto com ele.
          giro(22 + gsap.utils.clamp(-16, 16, (p.x - atras.x) * 1.6));
          gsap.set(lapis, { x: p.x - PONTA_LAPIS.x, y: p.y - PONTA_LAPIS.y, rotation: estado.giro });
          gsap.set(lapis, { autoAlpha: l > 2 && l < total - 2 ? 1 : l >= total - 2 ? 0.0 : 1 });

          marcas.forEach((m, i) => {
            const chegou = l >= m.sai - 6;
            if (chegou && !feitos.has(i)) {
              feitos.add(i);
              ancorasEl[i]?.classList.add("feito");
              if (i === marcas.length - 1) finalEl.classList.add("feito");
              gsap.fromTo(ancorasEl[i] ?? finalEl, { scale: 1.25 }, { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.4)" });
            } else if (!chegou && feitos.has(i)) {
              feitos.delete(i);
              (ancorasEl[i] ?? finalEl).classList.remove("feito");
            }
            if (i < revelar.length) {
              const ver = l >= m.entra - 260;
              if (ver && !revelados.has(i)) {
                revelados.add(i);
                revelar[i].play();
              } else if (!ver && revelados.has(i) && l < anterior) {
                revelados.delete(i);
                revelar[i].reverse();
              }
            }
          });
        };

        construir();
        // No celular o lápis encolhe para correr na margem, sem cobrir o texto dos cartões.
        gsap.set(lapis, { transformOrigin: `${PONTA_LAPIS.x}px ${PONTA_LAPIS.y}px`, scale: () => (palco.getBoundingClientRect().width < 768 ? 0.5 : 1) });

        const st = gsap.to(estado, {
          c: () => palco.offsetHeight,
          ease: "none",
          onUpdate: desenhar,
          scrollTrigger: { trigger: palco, start: "top 58%", end: "bottom 58%", scrub: 0.7, invalidateOnRefresh: true },
        });

        // Quando o layout muda (fontes, resize), refaz o caminho e as chaves.
        let pendente: ReturnType<typeof setTimeout> | undefined;
        const ro = new ResizeObserver(() => {
          clearTimeout(pendente);
          pendente = setTimeout(() => {
            construir();
            ScrollTrigger.refresh();
            desenhar();
          }, 120);
        });
        ro.observe(palco);
        desenhar();

        return () => {
          ro.disconnect();
          clearTimeout(pendente);
          st.scrollTrigger?.kill();
        };
      });

      // Sem movimento: caminho inteiro desenhado, cartões visíveis, sem lápis.
      mm.add(MIDIA.reduzido, () => {
        const largura = palco.getBoundingClientRect().width;
        const ancoras = medirAncoras(palco, ancorasEl, finalEl);
        const res = montarCaminho({ x: largura < 768 ? ancoras[0].x : largura / 2, y: 0 }, ancoras, medir, largura);
        for (const p of [caminho, sombra, guia]) p.setAttribute("d", res.d);
        gsap.set(lapis, { autoAlpha: 0 });
        for (const a of ancorasEl) a.classList.add("feito");
        finalEl.classList.add("feito");
      });
    },
    { scope: ref },
  );

  return (
    <section id="como-funciona" ref={ref} className="relative z-10 overflow-x-clip bg-marca-100 pb-32 pt-10 md:pb-44">
      {/* bordas onduladas que "derretem" as seções vizinhas no lilás */}
      <Onda cor="text-marca-100" />
      <Onda cor="text-marca-100" lado="base" forma={1} />
      <div className="grade-pontos pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]" />

      <div className="cab-metodo relative mx-auto max-w-[820px] px-5 text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-marca-700">{c.eyebrow}</p>
        <h2 className="mt-4 text-[clamp(2.2rem,5.4vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-tinta">
          {c.tituloA} <span className="text-marca-600">{c.tituloB}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[600px] text-[17px] leading-relaxed text-tinta-2">{c.texto}</p>
      </div>

      <div ref={palcoRef} className="relative mx-auto mt-16 max-w-[1120px] px-5 md:mt-24 md:px-8">
        <svg className="pointer-events-none absolute inset-0 z-[5] size-full overflow-visible" fill="none" aria-hidden>
          <path className="caminho-medir" stroke="none" />
          <path className="caminho-guia" stroke="#bbaeff" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" opacity="0.7" />
          <path
            className="caminho-sombra"
            stroke="#2b2680"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.28"
            transform="translate(1.8 1.6)"
          />
          <path className="caminho" stroke="#2b2680" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <ol className="relative grid grid-cols-[minmax(0,1fr)] gap-y-24 md:gap-y-28">
          {PASSOS.map(({ quem, titulo, texto, Mini }, i) => {
            const direita = i % 2 === 1;
            return (
              <li key={titulo} className={`passo relative min-w-0 pl-14 md:w-[40%] md:pl-0 ${direita ? "md:ml-auto" : ""}`}>
                <span
                  className={`ancora absolute left-0 top-7 z-10 grid size-11 place-items-center rounded-full border-2 border-tinta bg-white font-mono text-[14px] font-medium text-tinta transition-colors duration-300 md:top-9 md:size-14 md:text-[16px] [&.feito]:bg-tinta [&.feito]:text-white ${
                    direita ? "md:-left-7" : "md:left-auto md:-right-7"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div
                  data-revelar
                  className="cartao relative rounded-[24px] border border-white bg-white/95 p-4 shadow-[0_30px_60px_-30px_rgb(43_38_128/0.35)] md:rounded-[28px] md:p-6"
                >
                  <div className="cartao-item flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-suave">Passo {String(i + 1).padStart(2, "0")}</span>
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${ROTULO[quem]}`}>
                      {quem === "Edu" && <Sparkles className="size-3" />}
                      {nomeQuem(quem)}
                    </span>
                  </div>
                  <h3 className="cartao-item mt-3 text-[24px] font-extrabold leading-tight tracking-tight text-tinta md:text-[26px]">{titulo}</h3>
                  <p className="cartao-item mt-2 text-[15px] leading-relaxed text-tinta-2">{texto}</p>
                  <div className="cartao-item mt-5">
                    <Escala largura={340} altura={168}>
                      <Mini />
                    </Escala>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="relative mt-28 flex justify-start pl-1 md:justify-center md:pl-0">
          <span className="ancora-final relative z-10 flex items-center gap-2 rounded-full border-2 border-tinta bg-white px-5 py-3 text-[15px] font-extrabold text-tinta transition-colors duration-300 [&.feito]:bg-tinta [&.feito]:text-white">
            <RefreshCcw className="size-4" /> {c.fim}
          </span>
        </div>

        <div className="lapis pointer-events-none absolute left-0 top-0 z-20 will-change-transform">
          <Lapis />
        </div>
      </div>
    </section>
  );
}
