"use client";

import { ArrowUpRight, CheckCheck, MessageCircle } from "lucide-react";
import { useRef } from "react";
import { useConteudo } from "../conteudo";
import { gsap, MIDIA, useGSAPPerto } from "../motion/gsap";
import { Magnetico } from "../motion/Magnetico";
import { Avatar } from "../ui/Avatar";
import { BotaoChunky } from "../ui/BotaoChunky";
import { Rabisco } from "../ui/Rabisco";

/** Estrelas em posições fixas (determinísticas, para o SSR bater com o cliente). */
const ESTRELAS = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 37.3) % 100,
  y: (i * 61.7) % 100,
  s: 6 + ((i * 13) % 10),
  d: (i * 0.37) % 2.6,
}));

export function Contato() {
  const c = useConteudo().contato;
  const ref = useRef<HTMLElement>(null);
  const cartao = useRef<HTMLDivElement>(null);

  useGSAPPerto(
    () => {
      const q = gsap.utils.selector(ref);
      const mm = gsap.matchMedia();
      mm.add(MIDIA.movimento, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: ref.current, start: "top 65%" } })
          .from(q(".cab-contato > *"), { y: 40, autoAlpha: 0, duration: 0.9, stagger: 0.1, ease: "power3.out" })
          .from(q(".rabisco-contato .traco"), { traco: "0%", duration: 0.8, ease: "power2.inOut" }, 0.5)
          .from(cartao.current, { y: 90, rotation: 4, autoAlpha: 0, duration: 1.1, ease: "mola" }, 0.15)
          .from(q(".avatar-contato"), { scale: 0, rotation: -30, duration: 0.8, stagger: 0.12, ease: "back.out(2.4)" }, 0.5);
        q(".avatar-contato").forEach((el, i) => {
          gsap.to(el, { y: -14, rotation: i % 2 ? 4 : -4, duration: 2.6 + i * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.3 });
        });
      });
    },
    { scope: ref },
  );

  return (
    <section
      id="contato"
      ref={ref}
      className="gradiente-noite relative -mt-10 overflow-hidden rounded-t-[40px] pb-28 pt-28 text-white md:rounded-t-[64px] md:pb-36 md:pt-36"
    >
      {ESTRELAS.map((s, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute animate-cintilar text-[#c9bfff]"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-full fill-current">
            <path d="M12 0c1 8 3 10 12 12-9 2-11 4-12 12-1-8-3-10-12-12 9-2 11-4 12-12z" />
          </svg>
        </span>
      ))}

      <div className="relative mx-auto grid max-w-[1180px] items-center gap-14 px-5 md:px-8 lg:grid-cols-[1fr_0.95fr]">
        <div className="cab-contato">
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-marca-300">{c.eyebrow}</p>
          <h2 className="mt-4 text-[clamp(2.4rem,5.6vw,4.4rem)] font-extrabold leading-[1] tracking-[-0.04em]">
            {c.tituloA}{" "}
            <span className="relative inline-block text-[#ffd166]">
              {c.tituloB}
              <Rabisco tipo="sublinhado" esticar espessura={3.6} className="rabisco-contato absolute -bottom-2 left-0 h-3 w-full text-[#ffd166]" />
            </span>
          </h2>
          <p className="mt-6 max-w-[500px] text-[17px] leading-relaxed text-white/75">{c.texto}</p>
          <ol className="mt-8 grid max-w-[460px] gap-3">
            {c.passos.map((t, i) => (
              <li key={t} className="flex items-center gap-3.5 rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10 backdrop-blur">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-marca-300 font-mono text-[13px] font-medium text-tinta">{i + 1}</span>
                <span className="text-[15.5px] font-semibold">{t}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative">
          <div className="avatar-contato absolute -left-8 -top-10 z-10 hidden md:block">
            <Avatar quem="nina" fundo="rosa" className="size-[88px]" />
          </div>
          <div className="avatar-contato absolute -right-6 top-1/3 z-10 hidden md:block">
            <Avatar quem="lia" fundo="pessego" className="size-[76px]" />
          </div>
          <div className="avatar-contato absolute -bottom-10 left-10 z-10 hidden md:block">
            <Avatar quem="caio" fundo="verde" className="size-[70px]" />
          </div>

          <div ref={cartao} className="relative rounded-[32px] bg-white p-6 text-tinta shadow-[0_50px_100px_-40px_rgb(0_0_0/0.6)] md:p-8">
            <CartaoWhatsapp w={c.whatsapp} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Contato direto: abre o WhatsApp com a mensagem pronta (prévia da conversa e o botão). */
function CartaoWhatsapp({ w }: { w: ReturnType<typeof useConteudo>["contato"]["whatsapp"] }) {
  const link = `https://wa.me/${w.numero}?text=${encodeURIComponent(w.mensagem)}`;
  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#25d366] text-white shadow-[0_12px_24px_-12px_rgb(18_140_74/0.8)]">
          <MessageCircle className="size-6 fill-white/20" strokeWidth={2.4} />
        </span>
        <div>
          <p className="text-[22px] font-extrabold leading-tight tracking-tight">{w.titulo}</p>
          <p className="mt-0.5 text-[14.5px] leading-snug text-tinta-2">{w.texto}</p>
        </div>
      </div>

      {/* prévia da conversa, como no WhatsApp */}
      <div className="rounded-2xl bg-[#efeae2] p-4" aria-hidden>
        <div className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-tr-md bg-[#d9fdd3] px-3.5 py-2.5 text-[15px] leading-snug text-tinta shadow-[0_1px_1px_rgb(0_0_0/0.08)]">
          {w.mensagem}
          <span className="ml-2 inline-flex translate-y-0.5 items-center gap-0.5 text-[11px] text-tinta-2">
            agora <CheckCheck className="size-3.5 text-[#53bdeb]" strokeWidth={2.4} />
          </span>
        </div>
      </div>

      <Magnetico forca={0.15} className="w-full">
        <BotaoChunky href={link} externo variante="whatsapp" tamanho="lg" className="w-full">
          {w.botao} <ArrowUpRight className="size-[18px]" />
        </BotaoChunky>
      </Magnetico>
      <p className="text-center text-[12.5px] text-tinta-2">{w.rodape}</p>
    </div>
  );
}
