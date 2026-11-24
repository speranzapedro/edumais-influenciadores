"use client";

import { ArrowRight, Coins } from "lucide-react";
import { useRef, useState } from "react";
import { useConteudo } from "../conteudo";
import { gsap, MIDIA, SplitText, useGSAP } from "../motion/gsap";
import { useRolarPara } from "../motion/ScrollSuave";

const PRECOS = [19.9, 29.9, 39.9, 49.9, 69.9, 99.9];
const VENDAS = { min: 50, max: 3000, passo: 50, inicial: 400 };

/** Parte do criador em cada venda; o resto fica com a Edu+. */
const PARTE_CRIADOR = 0.7;

const reais = (v: number, casas = 0) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Parceria 70/30: a divisão da receita e um simulador enxuto, com os números em destaque. */
export function Parceria() {
  const ref = useRef<HTMLElement>(null);
  const c = useConteudo().parceria;
  const [iPreco, setIPreco] = useState(1);
  const [vendas, setVendas] = useState(VENDAS.inicial);
  const valores = useRef({ total: 0, voce: 0, edu: 0 });
  const rolar = useRolarPara();
  const primeira = useRef(true);

  const preco = PRECOS[iPreco];
  const total = preco * vendas;

  // Entrada e motion contínuo.
  useGSAP(
    () => {
      if (!c) return;
      const q = gsap.utils.selector(ref);
      const mm = gsap.matchMedia();

      mm.add(MIDIA.movimento, () => {
        const titulo = SplitText.create(q(".titulo-parceria")[0], { type: "words", mask: "words" });
        gsap
          .timeline({ scrollTrigger: { trigger: q(".cartao-parceria")[0], start: "top 70%" } })
          .from(q(".cartao-parceria"), { scale: 0.94, borderRadius: 120, duration: 1.1, ease: "power3.out" })
          .from(q(".olho-parceria"), { y: 20, autoAlpha: 0, duration: 0.6 }, 0.2)
          .from(titulo.words, { yPercent: 110, duration: 0.8, stagger: 0.04, ease: "power4.out" }, 0.25)
          .from(q(".texto-parceria"), { y: 20, autoAlpha: 0, duration: 0.7 }, 0.6)
          .from(q(".lado-voce"), { x: -60, autoAlpha: 0, rotation: -4, duration: 0.9, ease: "back.out(1.6)" }, 0.7)
          .from(q(".lado-edu"), { x: 60, autoAlpha: 0, rotation: 4, duration: 0.9, ease: "back.out(1.6)" }, 0.8)
          .from(q(".link-parceria"), { y: 14, autoAlpha: 0, duration: 0.5 }, 1.1)
          .from(q(".simulador"), { y: 80, autoAlpha: 0, rotation: 3, duration: 1, ease: "power3.out" }, 0.5)
          .from(q(".pct-lado"), { textContent: 0, duration: 1.2, snap: { textContent: 1 }, ease: "power2.out" }, 1);

        // "70/30" gigante do fundo atravessa a seção com a rolagem.
        gsap.fromTo(
          q(".marca-dagua"),
          { xPercent: 12 },
          { xPercent: -22, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 1 } },
        );
      });
    },
    { scope: ref },
  );

  // Números do simulador rolam até o valor novo, e moedas saltam da barra.
  useGSAP(
    () => {
      if (!c) return;
      const q = gsap.utils.selector(ref);
      const alvo = { total, voce: total * PARTE_CRIADOR, edu: total * (1 - PARTE_CRIADOR) };
      const escrever = () => {
        q(".valor-total").forEach((e) => {
          e.textContent = reais(valores.current.total);
        });
        q(".valor-voce").forEach((e) => {
          e.textContent = reais(valores.current.voce);
        });
        q(".valor-edu").forEach((e) => {
          e.textContent = reais(valores.current.edu);
        });
      };
      if (primeira.current || window.matchMedia(MIDIA.reduzido).matches) {
        primeira.current = false;
        valores.current = alvo;
        escrever();
        return;
      }
      gsap.to(valores.current, { ...alvo, duration: 0.6, ease: "power3.out", overwrite: true, onUpdate: escrever });
      gsap.fromTo(q(".barra-metade"), { scaleY: 1.18 }, { scaleY: 1, duration: 0.6, ease: "elastic.out(1, 0.4)", overwrite: true });
      q(".moeda-pulo").forEach((m, i) => {
        gsap.fromTo(
          m,
          { y: 0, x: 0, autoAlpha: 1, scale: 0.6, rotation: 0 },
          {
            y: -50 - Math.random() * 40,
            x: (Math.random() - 0.5) * 120,
            rotation: (Math.random() - 0.5) * 240,
            scale: 1,
            autoAlpha: 0,
            duration: 0.9,
            delay: i * 0.03,
            ease: "power2.out",
            overwrite: true,
          },
        );
      });
    },
    { scope: ref, dependencies: [total] },
  );

  if (!c) return null;
  const s = c.simulador;
  const [voce, edu] = c.divisao;

  return (
    <section id="parceria" ref={ref} className="relative bg-white px-3 pb-6 md:px-5 md:pb-10">
      <div className="cartao-parceria gradiente-noite relative mx-auto max-w-[1320px] overflow-hidden rounded-[40px] px-5 py-20 text-white md:rounded-[64px] md:px-12 md:py-28">
        <span
          aria-hidden
          className="marca-dagua pointer-events-none absolute -bottom-10 left-0 select-none whitespace-nowrap text-[clamp(10rem,30vw,26rem)] font-extrabold leading-none tracking-[-0.06em] text-white/[0.04]"
        >
          {voce.pct}/{edu.pct} · {voce.pct}/{edu.pct}
        </span>
        <span aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-marca-500/25 blur-[120px]" />

        <div className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="olho-parceria font-mono text-[12px] uppercase tracking-[0.16em] text-marca-300">{c.eyebrow}</p>
            <h2 className="titulo-parceria mt-4 text-[clamp(2.1rem,4.6vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.035em]">
              {c.tituloA} <span className="text-marca-300">{c.tituloB}</span>
            </h2>
            <p className="texto-parceria mt-5 max-w-[540px] text-[17px] leading-relaxed text-white/70">{c.texto}</p>

            <div className="mt-10 grid gap-4 sm:grid-cols-[1.25fr_1fr]">
              {[voce, edu].map((l, i) => (
                <div
                  key={l.rotulo}
                  className={`${i === 0 ? "lado-voce border-marca-400/50 bg-marca-500/20" : "lado-edu border-white/10 bg-white/[0.06]"} rounded-3xl border p-5 backdrop-blur-sm md:p-6`}
                >
                  <span className="text-[17px] font-extrabold text-white/80">{l.rotulo}</span>
                  <p
                    className={`mt-1 text-[clamp(3rem,6vw,4.5rem)] font-extrabold leading-none tracking-[-0.05em] ${i === 0 ? "text-marca-300" : "text-white"}`}
                  >
                    <span className="pct-lado">{l.pct}</span>%
                  </p>
                  <p className="mt-3 text-[14.5px] leading-snug text-white/75">{l.texto}</p>
                </div>
              ))}
            </div>
            <a
              href={c.link.href}
              onClick={(e) => {
                e.preventDefault();
                rolar(c.link.href);
              }}
              className="link-parceria group mt-6 inline-flex items-center gap-2 font-mono text-[12.5px] font-medium uppercase tracking-[0.09em] text-marca-300 hover:text-white"
            >
              {c.link.texto}
              <ArrowRight className="size-4 transition-transform duration-300 ease-mola group-hover:translate-x-1" />
            </a>
          </div>

          {/* simulador */}
          <div className="simulador relative rounded-[32px] bg-white p-6 text-tinta shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)] md:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-marca-700">{s.titulo}</p>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-linha pb-5">
              <p className="text-[14px] font-semibold text-tinta-2">{s.total}</p>
              <p className="valor-total text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold leading-none tracking-[-0.03em]">{reais(total)}</p>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2">
                <span className="flex justify-between text-[14px] font-semibold">
                  {s.preco}
                  <span className="font-mono text-marca-700">{reais(preco, 2)}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={PRECOS.length - 1}
                  step={1}
                  value={iPreco}
                  onChange={(e) => setIPreco(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-marca-600"
                />
              </label>
              <label className="grid gap-2">
                <span className="flex justify-between text-[14px] font-semibold">
                  {s.vendas}
                  <span className="font-mono text-marca-700">{vendas.toLocaleString("pt-BR")}</span>
                </span>
                <input
                  type="range"
                  min={VENDAS.min}
                  max={VENDAS.max}
                  step={VENDAS.passo}
                  value={vendas}
                  onChange={(e) => setVendas(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-marca-600"
                />
              </label>
            </div>

            <div className="relative mt-7 grid gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <Coins
                  key={i}
                  aria-hidden
                  className="moeda-pulo pointer-events-none invisible absolute left-1/3 top-4 z-10 size-5 text-ambar"
                  strokeWidth={2.4}
                />
              ))}
              <div className="barra-metade origin-bottom rounded-3xl bg-marca-600 p-5 text-white md:p-6">
                <p className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-white/75">
                  {s.suaParte} · {voce.pct}%
                </p>
                <p className="valor-voce mt-2 text-[clamp(2.4rem,5vw,3.4rem)] font-extrabold leading-none tracking-[-0.04em]">{reais(total * PARTE_CRIADOR)}</p>
              </div>
              <div className="barra-metade flex origin-bottom items-center justify-between gap-3 rounded-2xl bg-marca-50 px-5 py-3.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-marca-700">
                  {s.parteEdu} · {edu.pct}%
                </p>
                <p className="valor-edu text-[18px] font-extrabold tracking-[-0.02em] text-tinta-2">{reais(total * (1 - PARTE_CRIADOR))}</p>
              </div>
            </div>
            <p className="mt-4 text-[12.5px] leading-snug text-tinta-2">{s.nota}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
