"use client";

import type { EstadoEdu, FonteEdu, TrocaEdu } from "@edu/db";
import { cn, lerEventosSSE, TextoComNegrito } from "@edu/ui";
import { BookOpen, ChevronDown, ChevronRight, Clock, FileText, Layers, Lightbulb, RotateCcw, Search, SendHorizonal, ThumbsDown, ThumbsUp } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAula } from "../contexto";
import type { EventoEdu } from "../servidor/edu";
import { AvatarEdu } from "./AvatarEdu";

const MAX_PERGUNTA = 500;
const MOTIVOS = ["Não respondeu minha dúvida", "Informação errada", "Difícil de entender", "Outro"];

type Fase = "buscando" | "escrevendo" | "pronto" | "erro";
interface Troca extends Omit<TrocaEdu, "id"> {
  chave: string;
  id: string | null;
  fase: Fase;
  erro?: string;
  motivosAbertos?: boolean;
}

/**
 * Painel do Edu (tela cheia): aviso da primeira vez, sugestões, conversa com resposta em tempo real,
 * fontes, avaliação e limite do dia. Abre a partir da trilha (aula = null) ou de uma aula.
 */
export function PainelEdu({
  trilha,
  aula,
  onFechar,
}: {
  trilha: { id: string; titulo: string };
  aula: { id: string; titulo: string; ordem: number } | null;
  onFechar: () => void;
}) {
  const { acoes, textos } = useAula();
  const { eduAbrir: abrir, eduAvaliar: avaliar, eduConfirmarAviso: confirmarAviso } = acoes;
  const [estado, setEstado] = useState<EstadoEdu | "carregando" | "indisponivel">("carregando");
  const [trocas, setTrocas] = useState<Troca[]>([]);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [restantes, setRestantes] = useState(0);
  const [avisoVisto, setAvisoVisto] = useState(true);
  const [rascunho, setRascunho] = useState("");
  const corpoRef = useRef<HTMLDivElement>(null);
  const ocupado = trocas.some((t) => t.fase === "buscando" || t.fase === "escrevendo");

  // biome-ignore lint/correctness/useExhaustiveDependencies: reabre só quando muda a trilha ou a aula; `abrir` vem do contexto
  useEffect(() => {
    let vivo = true;
    abrir(trilha.id, aula?.id ?? null)
      .then((e) => {
        if (!vivo) return;
        if (!e) return setEstado("indisponivel");
        setEstado(e);
        setTrocas(e.trocas.map((t) => ({ ...t, chave: t.id, fase: "pronto" })));
        setConversaId(e.conversaId);
        setRestantes(e.restantes);
        setAvisoVisto(e.avisoVisto);
      })
      .catch(() => vivo && setEstado("indisponivel"));
    return () => {
      vivo = false;
    };
  }, [trilha.id, aula?.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rola até o fim sempre que a conversa muda
  useEffect(() => {
    const el = corpoRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [trocas]);

  // Tela cheia: trava a rolagem da página de trás e fecha com Esc.
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", esc);
    };
  }, [onFechar]);

  const mudar = (chave: string, f: (t: Troca) => Partial<Troca>) => setTrocas((ts) => ts.map((t) => (t.chave === chave ? { ...t, ...f(t) } : t)));

  const enviar = async (texto: string) => {
    const pergunta = texto.trim();
    if (pergunta.length < 2 || ocupado || restantes <= 0) return;
    const chave = crypto.randomUUID();
    setRascunho("");
    setTrocas((ts) => [
      ...ts.filter((t) => t.fase !== "erro"),
      { chave, id: null, pergunta, resposta: "", fontes: [], relacionado: false, geral: false, avaliacao: null, motivo: null, fase: "buscando" },
    ]);
    try {
      const resp = await fetch(`/edu/${trilha.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta, conversaId, aulaId: aula?.id ?? null }),
      });
      if (!resp.ok) {
        const msg = (await resp.text()) || "Não consegui enviar sua pergunta.";
        if (resp.status === 409 && /perguntas de hoje/.test(msg)) setRestantes(0);
        mudar(chave, () => ({ fase: "erro", erro: msg }));
        return;
      }
      let terminou = false;
      await lerEventosSSE<EventoEdu>(resp, (ev) => {
        if (ev.tipo === "texto") mudar(chave, (t) => ({ fase: "escrevendo", resposta: t.resposta + ev.delta }));
        else if (ev.tipo === "fim") {
          terminou = true;
          mudar(chave, () => ({ fase: "pronto", id: ev.mensagemId, resposta: ev.resposta, fontes: ev.fontes, relacionado: ev.relacionado, geral: ev.geral }));
          setConversaId(ev.conversaId);
          setRestantes(ev.restantes);
        } else throw new Error(ev.mensagem);
      });
      if (!terminou) throw new Error("A conexão caiu antes do fim da resposta. Tente de novo.");
    } catch (e) {
      mudar(chave, () => ({ fase: "erro", resposta: "", erro: e instanceof Error && e.message ? e.message : "Sem conexão. Tente de novo." }));
    }
  };

  const avaliarTroca = (t: Troca, avaliacao: "util" | "nao_ajudou" | null, motivo: string | null, abrirMotivos = false) => {
    if (!t.id) return;
    mudar(t.chave, () => ({ avaliacao, motivo, motivosAbertos: abrirMotivos }));
    void avaliar(t.id, avaliacao, motivo).catch(() => {});
  };

  const entendi = () => {
    setAvisoVisto(true);
    void confirmarAviso().catch(() => {});
  };

  const novaConversa = () => {
    if (ocupado) return;
    setConversaId(null);
    setTrocas([]);
  };

  const sugestoes = typeof estado === "object" ? estado.sugestoes : [];
  const pronto = typeof estado === "object";
  const semPerguntas = pronto && restantes <= 0;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Edu, tutor da trilha"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="fixed inset-0 z-50 mx-auto flex max-w-[440px] flex-col bg-fundo"
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b border-linha bg-superficie px-3 pb-3 pt-[max(env(safe-area-inset-top),14px)]">
        <button type="button" onClick={onFechar} aria-label="Fechar o Edu" className="grid size-11 place-items-center rounded-full text-tinta-2 hover:bg-fundo">
          <ChevronDown className="size-6" />
        </button>
        <AvatarEdu tamanho={40} ponto />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold">Edu</div>
          <div className="truncate text-xs text-suave">{aula ? `Tutor da trilha · sobre a Aula ${aula.ordem}` : `Tutor da trilha · ${trilha.titulo}`}</div>
        </div>
        <button
          type="button"
          onClick={novaConversa}
          disabled={ocupado || trocas.length === 0}
          aria-label="Nova conversa"
          title="Nova conversa"
          className="grid size-11 place-items-center rounded-full text-tinta-2 hover:bg-fundo disabled:opacity-40"
        >
          <RotateCcw className="size-5" />
        </button>
      </header>

      <div ref={corpoRef} className="rolagem-fina flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 pb-5 pt-4">
        {estado === "carregando" && (
          <div className="mt-6 space-y-3">
            <div className="esqueleto h-24 rounded-card" />
            <div className="esqueleto h-12 rounded-2xl" />
            <div className="esqueleto h-12 rounded-2xl" />
          </div>
        )}

        {estado === "indisponivel" && (
          <div className="mt-10 text-center text-sm text-suave">O Edu não está disponível nesta trilha agora. Tente de novo mais tarde.</div>
        )}

        {pronto && !avisoVisto && (
          <div className="mt-6 rounded-card border border-linha bg-superficie p-5 shadow-card">
            <AvatarEdu tamanho={72} />
            <h2 className="mb-1.5 mt-3.5 text-lg font-extrabold">Oi! Eu sou o Edu</h2>
            <p className="text-sm leading-relaxed text-tinta-2">
              Sou o tutor de inteligência artificial desta trilha e respondo com base no conteúdo dela: as aulas, os Cards de Conhecimento e os materiais do
              criador. Quando explico algo básico que não está na trilha, eu aviso. Posso errar — na dúvida, confira na aula indicada.
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-tinta-2">{textos.avisoEduRegistro}</p>
            <button type="button" onClick={entendi} className="gradiente-marca mt-4 h-12 w-full rounded-2xl text-[15px] font-bold text-white">
              Entendi, vamos lá
            </button>
          </div>
        )}

        {pronto && avisoVisto && trocas.length === 0 && (
          <>
            <div className="mt-5 text-center">
              <AvatarEdu tamanho={72} ponto />
              <div className="mt-3 text-[17px] font-extrabold">Oi! Qual é a sua dúvida?</div>
              <div className="mx-auto mt-1 max-w-[280px] text-[13px] leading-relaxed text-suave">
                {aula ? "Pergunte sobre esta aula ou sobre qualquer assunto da trilha." : `Pergunte qualquer coisa sobre ${trilha.titulo}.`}
              </div>
            </div>
            {sugestoes.length > 0 && !semPerguntas && (
              <div className="mt-2 flex flex-col gap-2.5">
                <div className="text-xs font-bold text-suave">Sugestões</div>
                {sugestoes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void enviar(s)}
                    className="min-h-12 rounded-2xl border border-marca-200 bg-superficie px-3.5 py-3 text-left text-sm font-semibold leading-snug text-marca-800 transition active:scale-[0.99]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {avisoVisto &&
          trocas.map((t) => (
            <div key={t.chave} className="flex flex-col gap-3.5">
              <div className="max-w-[82%] self-end whitespace-pre-line rounded-[18px] rounded-br-md bg-marca-600 px-3.5 py-2.5 text-sm leading-relaxed text-white">
                {t.pergunta}
              </div>
              <div className="flex max-w-[96%] items-start gap-2 self-start">
                <AvatarEdu tamanho={28} className="mt-0.5" />
                <div className="flex min-w-0 flex-col gap-2">
                  {t.fase === "buscando" && (
                    <div className="inline-flex items-center gap-2 rounded-[18px] rounded-bl-md border border-linha bg-superficie px-3.5 py-3 text-[13px] text-suave">
                      <Search className="size-4" /> Procurando na trilha
                      <span className="inline-flex gap-[3px]">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="size-[5px] animate-pulse rounded-full bg-marca-600" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </span>
                    </div>
                  )}
                  {(t.fase === "escrevendo" || t.fase === "pronto") && (
                    <div className="whitespace-pre-line rounded-[18px] rounded-bl-md border border-linha bg-superficie px-3.5 py-3 text-sm leading-relaxed text-tinta">
                      <TextoComNegrito texto={t.resposta} />
                    </div>
                  )}
                  {t.fase === "erro" && (
                    <div className="rounded-[18px] rounded-bl-md border border-vermelho/30 bg-vermelho-bg px-3.5 py-3 text-sm leading-relaxed text-[#9b1c1c]">
                      {t.erro}
                      {!semPerguntas && (
                        <button type="button" onClick={() => void enviar(t.pergunta)} className="mt-2 block font-bold text-[#7f1414] underline">
                          Tentar de novo
                        </button>
                      )}
                    </div>
                  )}
                  {t.fase === "pronto" && t.geral && <SeloGeral parcial={t.fontes.length > 0} />}
                  {t.fase === "pronto" && t.fontes.length > 0 && <Fontes fontes={t.fontes} relacionado={t.relacionado} onAbrirAula={onFechar} />}
                  {t.fase === "pronto" && t.id && (
                    <div className="flex items-center gap-1 pl-0.5">
                      <button
                        type="button"
                        aria-label="Resposta útil"
                        aria-pressed={t.avaliacao === "util"}
                        onClick={() => avaliarTroca(t, t.avaliacao === "util" ? null : "util", null)}
                        className={cn(
                          "grid size-9 place-items-center rounded-xl",
                          t.avaliacao === "util" ? "bg-verde-bg text-[#0f7a43]" : "text-suave hover:bg-superficie",
                        )}
                      >
                        <ThumbsUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Resposta não ajudou"
                        aria-pressed={t.avaliacao === "nao_ajudou"}
                        onClick={() => (t.avaliacao === "nao_ajudou" ? avaliarTroca(t, null, null) : avaliarTroca(t, "nao_ajudou", null, true))}
                        className={cn(
                          "grid size-9 place-items-center rounded-xl",
                          t.avaliacao === "nao_ajudou" ? "bg-vermelho-bg text-[#b42323]" : "text-suave hover:bg-superficie",
                        )}
                      >
                        <ThumbsDown className="size-4" />
                      </button>
                      {t.avaliacao && !t.motivosAbertos && <span className="ml-1 text-xs text-suave">Obrigado pelo retorno!</span>}
                    </div>
                  )}
                  {t.motivosAbertos && (
                    <div className="rounded-2xl border border-linha bg-superficie p-3">
                      <div className="text-[13px] font-bold">
                        O que não ajudou? <span className="font-medium text-suave">(opcional)</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {MOTIVOS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => avaliarTroca(t, "nao_ajudou", m)}
                            className="min-h-9 rounded-full border border-linha bg-superficie px-3 text-xs font-semibold text-tinta-2 hover:border-marca-300"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      <footer className="shrink-0 border-t border-linha bg-superficie px-3 pb-[max(env(safe-area-inset-bottom),14px)] pt-2.5">
        {semPerguntas ? (
          <div className="flex items-start gap-2.5 rounded-2xl bg-ambar-bg px-3.5 py-3 text-[13px] leading-relaxed text-[#5c4400]">
            <Clock className="mt-0.5 size-[18px] shrink-0" />
            <div>
              <strong>Você usou as perguntas de hoje.</strong> Amanhã tem mais! Enquanto isso, que tal revisar a aula ou anotar a dúvida para amanhã?
            </div>
          </div>
        ) : (
          <>
            {pronto && restantes <= 5 && <div className="mx-1 mb-2 text-xs font-semibold text-[#8a6200]">Restam {restantes} perguntas hoje</div>}
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void enviar(rascunho);
              }}
            >
              <label htmlFor="pergunta-edu" className="sr-only">
                Sua pergunta
              </label>
              <textarea
                id="pergunta-edu"
                rows={1}
                value={rascunho}
                disabled={!pronto || !avisoVisto}
                maxLength={MAX_PERGUNTA}
                onChange={(e) => setRascunho(e.target.value.slice(0, MAX_PERGUNTA))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void enviar(rascunho);
                  }
                }}
                placeholder="Pergunte ao Edu sobre a trilha…"
                className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-marca-200 bg-fundo px-3.5 py-3 text-[15px] leading-snug outline-none focus:border-marca-400 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={ocupado || rascunho.trim().length < 2 || !avisoVisto}
                aria-label="Enviar pergunta"
                className="gradiente-marca grid size-12 shrink-0 place-items-center rounded-2xl text-white disabled:opacity-45"
              >
                <SendHorizonal className="size-5" />
              </button>
            </form>
            <div className="mx-1 mt-1.5 flex justify-between text-[11px] text-suave">
              <span>O Edu responde com base na trilha e pode errar.</span>
              <span>
                {rascunho.length}/{MAX_PERGUNTA}
              </span>
            </div>
          </>
        )}
      </footer>
    </motion.div>
  );
}

/** Aviso de que a resposta (ou parte dela) é conhecimento geral, não o material da trilha. */
function SeloGeral({ parcial }: { parcial: boolean }) {
  return (
    <div className="inline-flex max-w-full items-center gap-1.5 self-start rounded-[10px] border border-linha bg-superficie px-2.5 py-1.5 text-xs font-semibold text-suave">
      <Lightbulb className="size-3.5 shrink-0" />
      {parcial ? "Parte da resposta vem de fora do material da trilha" : "Explicação geral, fora do material da trilha"}
    </div>
  );
}

function Fontes({ fontes, relacionado, onAbrirAula }: { fontes: FonteEdu[]; relacionado: boolean; onAbrirAula: () => void }) {
  return (
    <div className="flex flex-col gap-1.5 pl-1">
      <div className="text-[11px] font-bold uppercase tracking-wider text-suave">{relacionado ? "Relacionado na trilha" : "Fontes"}</div>
      <div className="flex flex-wrap gap-1.5">
        {fontes.map((f) =>
          f.tipo === "aula" && f.aulaId ? (
            <Link
              key={`${f.tipo}${f.rotulo}`}
              href={`/aula/${f.aulaId}`}
              onClick={onAbrirAula}
              className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-[10px] border border-marca-200 bg-marca-50 px-2.5 py-1.5 text-xs font-bold text-marca-800"
            >
              <BookOpen className="size-3.5 shrink-0" />
              <span className="truncate">{f.rotulo}</span>
              <ChevronRight className="size-3 shrink-0" />
            </Link>
          ) : (
            <span
              key={`${f.tipo}${f.rotulo}`}
              className={cn(
                "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-[10px] bg-superficie px-2.5 py-1.5 text-xs font-semibold text-tinta-2",
                f.tipo === "material" ? "border border-dashed border-[#d6d5e3]" : "border border-linha",
              )}
            >
              {f.tipo === "material" ? <FileText className="size-3.5 shrink-0" /> : <Layers className="size-3.5 shrink-0" />}
              <span className="truncate">{f.rotulo}</span>
            </span>
          ),
        )}
      </div>
    </div>
  );
}
