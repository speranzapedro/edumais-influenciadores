"use client";

import type { AcaoRegistrada, AvaliacaoQualidade, Foco } from "@edu/ai";
import type { MensagemChat } from "@edu/db";
import { Avatar, cn, Pill } from "@edu/ui";
import { ArrowUp, Check, ChevronDown, ChevronsLeft, ChevronsRight, Loader2, Square, Star, X, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ChipAcao, ExecucaoAoVivo } from "./useAgente";

const SUGESTOES: Record<string, string[]> = {
  visao: ["Deixe as competências mais práticas", "Inclua uma competência sobre…", "Ajuste o público-alvo para…", "Objetivo mais direto"],
  ementa: ["Senti falta de um tópico sobre…", "Junte os dois primeiros módulos", "Detalhe mais as descrições", "Reordene do mais simples ao mais complexo"],
  cards: ["Os exemplos podem ser mais do dia a dia", "Divida os cards muito longos", "Linguagem mais simples", "Mais detalhes técnicos"],
  aulas: ["Deixe as aulas mais curtas", "Inclua uma pergunta aberta de aplicação prática", "Linguagem mais simples", "Distratores mais desafiadores"],
};

/** Markdown mínimo: **negrito** e quebras de linha. */
function Texto({ texto }: { texto: string }) {
  return (
    <>
      {texto.split("\n").map((linha, i) => (
        <p key={i} className={cn(i > 0 && "mt-1.5", !linha.trim() && "h-1")}>
          {linha
            .split(/(\*\*[^*]+\*\*)/g)
            .map((parte, j) => (parte.startsWith("**") && parte.endsWith("**") ? <b key={j}>{parte.slice(2, -2)}</b> : <span key={j}>{parte}</span>))}
        </p>
      ))}
    </>
  );
}

function SeloQualidade({ q }: { q: AvaliacaoQualidade }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="mt-2 rounded-xl border border-ambar/30 bg-ambar-bg/60">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-[#8a6100]"
      >
        <Star className="size-3.5 fill-ambar text-ambar" />
        Revisor pedagógico: {q.nota_geral.toFixed(1)}/5
        <ChevronDown className={cn("ml-auto size-3.5 transition", aberto && "rotate-180")} />
      </button>
      {aberto && (
        <div className="space-y-1 px-3 pb-3 text-[11px] text-tinta-2">
          {q.criterios.map((c) => (
            <div key={c.criterio} className="flex justify-between gap-2">
              <span className="capitalize">{c.criterio.replace(/_/g, " ")}</span>
              <span className="font-bold">{c.nota}/5</span>
            </div>
          ))}
          {q.pontos_fortes.length > 0 && <div className="pt-1 text-verde">✓ {q.pontos_fortes[0]}</div>}
        </div>
      )}
    </div>
  );
}

function ListaAcoes({ acoes }: { acoes: (AcaoRegistrada | ChipAcao)[] }) {
  const [aberto, setAberto] = useState(false);
  if (!acoes.length) return null;
  const visiveis = aberto ? acoes : acoes.slice(-4);
  return (
    <div className="mt-2">
      {acoes.length > 4 && (
        <button type="button" onClick={() => setAberto((a) => !a)} className="mb-1 text-[11px] font-semibold text-marca-600">
          {aberto ? "Mostrar menos" : `Ver todas as ${acoes.length} ações`}
        </button>
      )}
      <div className="flex flex-wrap gap-1.5">
        {visiveis.map((a, i) => {
          const estado = "estado" in a ? a.estado : a.ok ? "ok" : "erro";
          return (
            <span
              key={i}
              title={a.resumo}
              className={cn(
                "inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[11px] font-medium",
                estado === "rodando" && "border-marca-200 bg-marca-50 text-marca-700",
                estado === "ok" && "border-linha bg-superficie text-tinta-2",
                estado === "erro" && "border-vermelho/30 bg-vermelho-bg text-vermelho",
              )}
            >
              {estado === "rodando" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : estado === "ok" ? (
                <Check className="size-3 text-verde" />
              ) : (
                <XCircle className="size-3" />
              )}
              <span className="truncate">{a.rotulo}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Avatar do Edu (o mesmo do app do fã) nas mensagens e no cabeçalho do chat do estúdio. */
export function AvatarAgente({ pulsando }: { pulsando?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/edu.svg" alt="Edu" width={32} height={32} className={cn("size-8 shrink-0 rounded-full bg-[#c7bdff]", pulsando && "animate-pulsar")} />
  );
}

/**
 * Chat recolhido: faixa fina na borda direita do estúdio, no lugar do chat aberto. Mostra que o Edu
 * continua ali, se está trabalhando e se há resposta nova; um clique abre o chat.
 */
export function TrilhoEdu({ trabalhando, novas, onAbrir }: { trabalhando: boolean; novas: number; onAbrir: () => void }) {
  return (
    <div className="group/trilho relative h-full" data-tour="estudio-edu">
      <button
        type="button"
        onClick={onAbrir}
        aria-label={novas > 0 ? `Abrir o chat com o Edu (${novas} resposta(s) nova(s))` : "Abrir o chat com o Edu"}
        className="flex h-full w-full flex-col items-center gap-2 border-l border-marca-100 bg-marca-50/70 px-2 py-5 transition hover:bg-marca-100/70"
      >
        <span className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/edu.svg"
            alt=""
            width={44}
            height={44}
            className={cn("size-11 rounded-full bg-[#c7bdff] ring-2 ring-white shadow-card", trabalhando && "animate-pulsar")}
          />
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-verde" />
          {novas > 0 && (
            <span className="absolute -right-2 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-marca-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {novas}
            </span>
          )}
        </span>
        <span className="text-xs font-extrabold text-tinta">Edu</span>
        {trabalhando ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-marca-700">
            <Loader2 className="size-3 animate-spin" /> gerando
          </span>
        ) : (
          <span className="flex items-center gap-0.5 rounded-full border border-marca-200 bg-superficie px-2 py-0.5 text-[10px] font-bold text-marca-700 shadow-card transition group-hover/trilho:border-marca-400">
            <ChevronsLeft className="size-3" /> Abrir
          </span>
        )}
      </button>
      {/* Dica ao passar o mouse, à esquerda da faixa. */}
      <span
        role="tooltip"
        className="pointer-events-none absolute right-full top-6 z-30 mr-2 whitespace-nowrap rounded-xl bg-tinta px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-flutuante transition group-hover/trilho:opacity-100"
      >
        {trabalhando ? "O Edu está trabalhando — abrir o chat" : "Abrir o chat com o Edu"}
      </span>
    </div>
  );
}

export function ChatAgente({
  etapaNome,
  etapa,
  mensagens,
  execucao,
  foco,
  onLimparFoco,
  onEnviar,
  onCancelar,
  podeConversar,
  usuario,
  onRecolher,
}: {
  etapaNome: string;
  etapa: string;
  mensagens: MensagemChat[];
  execucao: ExecucaoAoVivo | null;
  foco: Foco | null;
  onLimparFoco: () => void;
  onEnviar: (texto: string) => void;
  onCancelar: () => void;
  podeConversar: boolean;
  usuario: { id: string; nome: string };
  /** Recolhe o chat para a faixa lateral. */
  onRecolher: () => void;
}) {
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rodando = !!execucao && !execucao.mensagemId && !execucao.erro;

  // biome-ignore lint/correctness/useExhaustiveDependencies: rola até o fim quando chegam mensagens ou progresso do agente
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens.length, execucao?.chips.length, execucao?.narracao, execucao?.erro]);
  useEffect(() => {
    if (foco) inputRef.current?.focus();
  }, [foco]);

  const enviar = () => {
    const t = texto.trim();
    if (!t || rodando || !podeConversar) return;
    onEnviar(t);
    setTexto("");
  };

  return (
    <aside className="flex h-full flex-col border-l border-linha bg-superficie" data-tour="estudio-edu">
      <div className="flex items-center gap-3 border-b border-linha px-5 py-4">
        <AvatarAgente pulsando={rodando} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">Edu, copiloto da trilha</div>
          <div className="text-[11px] text-suave">{rodando ? "trabalhando…" : `Etapa: ${etapaNome}`}</div>
        </div>
        {execucao && (execucao.custo > 0 || execucao.tokens > 0) && (
          <Pill tom="neutro" title="Custo estimado desta execução">
            US$ {execucao.custo.toFixed(2)}
          </Pill>
        )}
        <button
          type="button"
          onClick={onRecolher}
          aria-label="Esconder o chat"
          className="flex shrink-0 items-center gap-1 rounded-full border border-marca-200 bg-superficie px-3 py-1.5 text-xs font-bold text-marca-700 shadow-card transition hover:border-marca-400 hover:bg-marca-50"
        >
          Esconder <ChevronsRight className="size-4" />
        </button>
      </div>

      <div className="rolagem-fina flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {mensagens.length === 0 && !execucao && (
          <div className="rounded-2xl bg-marca-50 p-4 text-sm text-marca-800">
            <b>Oi! Eu sou o copiloto desta trilha.</b>
            <p className="mt-1.5 text-[13px] leading-relaxed text-marca-800/80">
              {podeConversar
                ? "Revise o rascunho ao lado. Se sentir falta de algo, quiser simplificar ou mudar a ordem, é só me dizer aqui — eu ajusto só o necessário."
                : "Quando houver um rascunho nesta etapa, você pode me pedir ajustes por aqui. Também dá para clicar no 💬 de qualquer item para comentar só sobre ele."}
            </p>
          </div>
        )}

        {mensagens.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end gap-2">
              <div className="max-w-[85%]">
                {m.foco && typeof m.foco === "object" && "id" in m.foco && (
                  <div className="mb-1 text-right text-[10px] font-semibold text-marca-600">sobre {(m.foco as unknown as Foco).id}</div>
                )}
                <div className="rounded-2xl rounded-tr-md bg-marca-600 px-3.5 py-2.5 text-[13px] leading-relaxed text-white">{m.texto}</div>
              </div>
              <Avatar nome={usuario.nome} semente={usuario.id} tamanho={28} />
            </div>
          ) : (
            <div key={m.id} className="flex gap-2">
              <AvatarAgente />
              <div className="min-w-0 max-w-[88%] flex-1">
                <div className="rounded-2xl rounded-tl-md border border-linha bg-fundo px-3.5 py-2.5 text-[13px] leading-relaxed text-tinta">
                  <Texto texto={m.texto} />
                </div>
                {(() => {
                  const ev = (m.eventos ?? {}) as { acoes?: AcaoRegistrada[]; qualidade?: AvaliacaoQualidade | null };
                  return (
                    <>
                      {ev.qualidade && <SeloQualidade q={ev.qualidade} />}
                      {ev.acoes && <ListaAcoes acoes={ev.acoes} />}
                    </>
                  );
                })()}
                {m.versao && <div className="mt-1 text-[10px] text-suave">versão {m.versao}</div>}
              </div>
            </div>
          ),
        )}

        <AnimatePresence>
          {execucao && !execucao.mensagemId && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {execucao.modo === "refinamento" && execucao.pedido && !mensagens.some((m) => m.texto === execucao.pedido) && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-marca-600 px-3.5 py-2.5 text-[13px] text-white">{execucao.pedido}</div>
                </div>
              )}
              <div className="flex gap-2">
                <AvatarAgente pulsando={!execucao.erro} />
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl rounded-tl-md border border-marca-100 bg-marca-50/60 px-3.5 py-2.5 text-[13px] leading-relaxed">
                    {execucao.erro ? (
                      <span className="text-vermelho">{execucao.erro}</span>
                    ) : execucao.resumo ? (
                      <Texto texto={execucao.resumo} />
                    ) : execucao.narracao ? (
                      <span className="text-tinta-2">
                        <Texto texto={execucao.narracao.split("\n\n").filter(Boolean).slice(-1)[0] ?? ""} />
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-marca-700">
                        <Loader2 className="size-3.5 animate-spin" /> {execucao.status ?? "Trabalhando…"}
                      </span>
                    )}
                    {!execucao.resumo && !execucao.erro && execucao.pensamento && (
                      <div className="mt-2 border-l-2 border-marca-200 pl-2.5 text-[11px] italic leading-relaxed text-suave">
                        {execucao.pensamento.replace(/\s+/g, " ").trim().slice(-240)}
                      </div>
                    )}
                    {execucao.status && (execucao.narracao || execucao.resumo) && (
                      <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-marca-700">
                        <Loader2 className="size-3 animate-spin" /> {execucao.status}
                      </div>
                    )}
                  </div>
                  {execucao.qualidade && <SeloQualidade q={execucao.qualidade} />}
                  <ListaAcoes acoes={execucao.chips} />
                  {!execucao.erro && (
                    <button
                      type="button"
                      onClick={onCancelar}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-suave hover:text-vermelho"
                    >
                      <Square className="size-3" /> Parar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={fimRef} />
      </div>

      <div className="border-t border-linha p-4">
        {podeConversar && !rodando && SUGESTOES[etapa] && (
          <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1 rolagem-fina">
            {SUGESTOES[etapa].map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => {
                  setTexto(s.endsWith("…") ? s.slice(0, -1) : s);
                  inputRef.current?.focus();
                }}
                className="shrink-0 rounded-full border border-linha px-2.5 py-1 text-[11px] font-medium text-tinta-2 transition hover:border-marca-300 hover:bg-marca-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {foco && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-marca-50 px-3 py-1.5 text-xs text-marca-800">
            <span className="font-bold">{foco.id}</span>
            <span className="min-w-0 flex-1 truncate">{foco.descricao}</span>
            <button type="button" onClick={onLimparFoco} className="text-marca-600 hover:text-vermelho">
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border border-linha bg-fundo p-2 transition focus-within:border-marca-300 focus-within:bg-superficie",
            !podeConversar && "opacity-60",
          )}
        >
          <textarea
            ref={inputRef}
            value={texto}
            disabled={!podeConversar || rodando}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            rows={2}
            placeholder={podeConversar ? (foco ? `O que mudar em ${foco.id}?` : "Peça um ajuste ao Edu…") : "Gere o rascunho para conversar"}
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-suave"
          />
          <button
            type="button"
            onClick={enviar}
            disabled={!texto.trim() || rodando || !podeConversar}
            className="gradiente-marca grid size-9 shrink-0 place-items-center rounded-xl text-white transition disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
