"use client";

import { type PassoTourEstudio, type TelaEstudio, TOUR_ESTUDIO } from "@edu/core";
import { Botao, cn } from "@edu/ui";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const LARGURA = 360;
const TELAS: TelaEstudio[] = ["materiais", "visao", "ementa", "cards", "aulas", "publicar"];
const NOME_TELA: Record<TelaEstudio, string> = {
  materiais: "Materiais",
  visao: "Visão geral",
  ementa: "Ementa",
  cards: "Cards de Conhecimento",
  aulas: "Aulas",
  publicar: "Publicar",
};
const FOLGA = 8;
const ALTURA_BALAO = 300;

/** Primeiro elemento visível com o alvo. */
function elementoDoAlvo(alvo: string) {
  return [...document.querySelectorAll<HTMLElement>(`[data-tour="${alvo}"]`)].find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

/**
 * Tour do estúdio sobre a trilha de exemplo: percorre as seis etapas em sequência, trocando de tela
 * sozinho (`aoTrocarTela`) e destacando cada área. Termina (ou é pulado) com `aoTerminar`.
 */
export function TourEstudio({
  telaAtual,
  aoTrocarTela,
  aoAbrirChat,
  aoTerminar,
  passos = TOUR_ESTUDIO,
}: {
  telaAtual: TelaEstudio;
  aoTrocarTela: (tela: TelaEstudio) => void;
  /** O passo que fala do Edu precisa do chat visível. */
  aoAbrirChat: () => void;
  aoTerminar: () => void;
  /** Passos do tour (padrão: TOUR_ESTUDIO do @edu/core). */
  passos?: PassoTourEstudio[];
}) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [posicionado, setPosicionado] = useState(false);
  const alvoAtual = useRef<HTMLElement | null>(null);
  const p = passos[i];
  const ultimo = i === passos.length - 1;

  // Leva o estúdio para a tela do passo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: troca a tela só quando o passo muda
  useEffect(() => {
    if (p.etapa !== telaAtual) aoTrocarTela(p.etapa);
    if (p.alvo === "estudio-edu") aoAbrirChat();
  }, [i]);

  // Procura o alvo (a tela pode demorar a montar); sem alvo, o balão fica centralizado.
  useEffect(() => {
    setRect(null);
    setPosicionado(false);
    alvoAtual.current = null;
    if (!p.alvo || p.etapa !== telaAtual) {
      if (!p.alvo) setPosicionado(true);
      return;
    }
    let vivo = true;
    const inicio = Date.now();
    const procurar = () => {
      if (!vivo) return;
      const el = elementoDoAlvo(p.alvo);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setTimeout(() => {
          if (!vivo) return;
          alvoAtual.current = el;
          setRect(el.getBoundingClientRect());
          setPosicionado(true);
        }, 350);
      } else if (Date.now() - inicio > 2500) setPosicionado(true);
      else setTimeout(procurar, 150);
    };
    procurar();
    return () => {
      vivo = false;
    };
  }, [p, telaAtual]);

  // Acompanha o alvo quando a tela rola ou muda de tamanho.
  useEffect(() => {
    if (!posicionado) return;
    const atualizar = () => {
      // O alvo pode ter sido trocado na tela (ex.: a faixa do Edu vira o chat aberto): procura de novo.
      if (alvoAtual.current && !alvoAtual.current.isConnected && p.alvo) alvoAtual.current = elementoDoAlvo(p.alvo) ?? null;
      if (alvoAtual.current) setRect(alvoAtual.current.getBoundingClientRect());
    };
    window.addEventListener("resize", atualizar);
    window.addEventListener("scroll", atualizar, true);
    const t = setInterval(atualizar, 500);
    return () => {
      window.removeEventListener("resize", atualizar);
      window.removeEventListener("scroll", atualizar, true);
      clearInterval(t);
    };
  }, [posicionado, p]);

  const avancar = useCallback(() => (ultimo ? aoTerminar() : setI((x) => x + 1)), [ultimo, aoTerminar]);
  const voltar = useCallback(() => setI((x) => Math.max(0, x - 1)), []);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoTerminar();
      else if (e.key === "ArrowRight") avancar();
      else if (e.key === "ArrowLeft") voltar();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [avancar, voltar, aoTerminar]);

  const destaque = rect && { top: rect.top - FOLGA, left: rect.left - FOLGA, width: rect.width + FOLGA * 2, height: rect.height + FOLGA * 2 };
  // Balão abaixo do alvo; sem espaço, acima; alvo alto (como o chat do Edu), ao lado, sempre dentro da tela.
  let estilo: React.CSSProperties | undefined;
  if (rect) {
    const centroX = Math.min(Math.max(16, rect.left + rect.width / 2 - LARGURA / 2), window.innerWidth - LARGURA - 16);
    if (window.innerHeight - rect.bottom > ALTURA_BALAO) {
      estilo = { position: "fixed", left: centroX, top: rect.bottom + FOLGA + 12 };
    } else if (rect.top > ALTURA_BALAO) {
      estilo = { position: "fixed", left: centroX, bottom: window.innerHeight - rect.top + FOLGA + 12 };
    } else {
      const left = rect.left > LARGURA + 40 ? rect.left - LARGURA - 20 : Math.min(rect.right + 20, window.innerWidth - LARGURA - 16);
      const top = Math.min(Math.max(16, rect.top + 40), window.innerHeight - ALTURA_BALAO - 16);
      estilo = { position: "fixed", left, top };
    }
  }

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="tour-estudio-titulo">
      {destaque ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-4 ring-marca-300 transition-all duration-300"
          style={{ ...destaque, boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.55)" }}
        />
      ) : (
        <div className="fixed inset-0 bg-tinta/50" />
      )}
      <div className={cn(!rect && "fixed inset-0 grid place-items-center px-4")}>
        {posicionado && (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-full rounded-card border border-linha bg-superficie p-5 shadow-flutuante"
            style={{ ...estilo, width: LARGURA }}
          >
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/edu.svg" alt="" width={28} height={28} className="size-7 rounded-full bg-[#c7bdff]" />
              <span className="gradiente-marca rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white">
                Etapa {TELAS.indexOf(p.etapa) + 1} de {TELAS.length} · {NOME_TELA[p.etapa]}
              </span>
              <span className="ml-auto text-[11px] font-semibold text-suave">
                {i + 1}/{passos.length}
              </span>
            </div>
            <h2 id="tour-estudio-titulo" className="mt-2 text-lg font-extrabold leading-snug">
              {p.titulo}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-tinta-2">{p.texto}</p>
            <div className="mt-4 flex gap-0.5">
              {passos.map((_x, j) => (
                <span key={j} className={cn("h-1.5 flex-1 rounded-full", j <= i ? "gradiente-marca" : "bg-fundo")} />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              {!ultimo ? (
                <button type="button" onClick={aoTerminar} className="text-xs font-semibold text-suave hover:text-tinta">
                  Pular tour
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                {i > 0 && (
                  <Botao variante="fantasma" tamanho="sm" onClick={voltar}>
                    Anterior
                  </Botao>
                )}
                <Botao tamanho="sm" onClick={avancar} autoFocus>
                  {ultimo ? "Criar minha trilha" : "Próximo"}
                </Botao>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
