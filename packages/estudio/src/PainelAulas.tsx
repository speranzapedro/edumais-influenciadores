"use client";

import type { Foco } from "@edu/ai";
import {
  type AulasDraft,
  type Bloco,
  type BlocoQuiz,
  type CardsDraft,
  contarDesafios,
  type Ementa,
  enunciadoDesafio,
  NOME_TIPO_BLOCO,
  rotuloBlocoTexto,
  verificarCoberturaAulas,
} from "@edu/core";
import { Cartao, cn, Pill } from "@edu/ui";
import { CheckCircle2, HelpCircle, Lightbulb, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { BotaoComentar, Editavel } from "./comum";
import { AbertaPreview, CompletarPreview, OrdenarPreview } from "./PreviewsDesafios";

const LETRAS = ["A", "B", "C", "D"];

export function PainelAulas({
  trilhaId,
  ementa,
  cards,
  aulas,
  editavel,
  foco,
  onFoco,
  onEditar,
}: {
  trilhaId: string;
  ementa: Ementa;
  cards: CardsDraft;
  aulas: AulasDraft;
  editavel: boolean;
  foco: Foco | null;
  onFoco: (f: Foco) => void;
  onEditar: (a: AulasDraft, resumo: string) => void;
}) {
  const [selecionada, setSelecionada] = useState<string | null>(aulas.aulas[0]?.id ?? null);
  useEffect(() => {
    if (!selecionada || !aulas.aulas.some((a) => a.id === selecionada)) setSelecionada(aulas.aulas[0]?.id ?? null);
  }, [aulas, selecionada]);

  const cob = verificarCoberturaAulas(ementa, cards, aulas);
  const totais = contarDesafios(aulas.aulas);
  const aula = aulas.aulas.find((a) => a.id === selecionada) ?? null;
  const tituloCard = new Map(cards.cards.map((c) => [c.id, c.titulo]));
  // O guia destaca só o primeiro módulo com aulas (a lista inteira ocupa a tela toda).
  const primeiroModulo = ementa.modulos.find((m) => aulas.aulas.some((a) => a.modulo_id === m.id))?.id;

  const editarBloco = (blocoId: string, f: (b: Bloco) => void, resumo: string) => {
    const novo = structuredClone(aulas);
    for (const a of novo.aulas) {
      const b = a.blocos.find((x) => x.id === blocoId);
      if (b) f(b);
    }
    onEditar(novo, resumo);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4" data-tour="aulas-resumo">
        <Resumo rotulo="Aulas" valor={`${aulas.aulas.length}`} />
        <Resumo
          rotulo="Desafios"
          valor={`${totais.corrigiveis}`}
          detalhe={[
            `${totais.quiz} quiz`,
            totais.completar && `${totais.completar} completar`,
            totais.ordenar && `${totais.ordenar} ordenar`,
            totais.aberta && `${totais.aberta} abertas`,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <Resumo rotulo="Cards em aulas" valor={`${cob.percentualCards}%`} ok={cob.percentualCards === 100} />
        <Resumo rotulo="Cards avaliados por desafios" valor={`${cob.percentualAvaliados}%`} ok={cob.percentualAvaliados === 100} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5">
          {ementa.modulos.map((m) => {
            const lista = aulas.aulas.filter((a) => a.modulo_id === m.id);
            if (!lista.length) return null;
            return (
              <section key={m.id} data-tour={m.id === primeiroModulo ? "aulas-lista" : undefined}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-tinta-2">
                  <span className="rounded-md bg-marca-600 px-1.5 py-0.5 text-[11px] text-white">{m.id}</span> {m.titulo}
                </h3>
                <div className="space-y-2">
                  {lista.map((a) => {
                    const da = contarDesafios([a]);
                    const ordem = aulas.aulas.indexOf(a) + 1;
                    return (
                      // biome-ignore lint/a11y/useSemanticElements: o cartão tem outros controles dentro (não pode ser <button>)
                      <div
                        key={a.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelecionada(a.id)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
                          e.preventDefault();
                          setSelecionada(a.id);
                        }}
                        className={cn(
                          "group flex w-full cursor-pointer items-start gap-3 rounded-2xl border bg-superficie p-3.5 text-left shadow-card transition",
                          selecionada === a.id ? "border-marca-400 ring-4 ring-marca-100" : "border-linha hover:border-marca-200",
                        )}
                      >
                        <div
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold",
                            selecionada === a.id ? "gradiente-marca text-white" : "bg-marca-50 text-marca-700",
                          )}
                        >
                          {ordem}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold">{a.titulo}</span>
                          </div>
                          <div className="mt-0.5 line-clamp-1 text-xs text-suave">{a.objetivo}</div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Pill tom="neutro">{a.blocos.length} blocos</Pill>
                            <Pill tom="lilas">{da.corrigiveis} desafios</Pill>
                            {da.aberta > 0 && <Pill tom="azul">pergunta aberta</Pill>}
                            {a.skill_card_ids.map((c) => (
                              <span key={c} title={tituloCard.get(c)} className="rounded-md bg-fundo px-1.5 py-0.5 text-[10px] font-semibold text-tinta-2">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                        <BotaoComentar ativo={foco?.id === a.id} onClick={() => onFoco({ id: a.id, descricao: `Aula "${a.titulo}"` })} />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Pré-visualização no celular do fã */}
        <div className="xl:sticky xl:top-4 xl:self-start" data-tour="aulas-preview">
          <div className="mb-2 text-center text-xs font-semibold text-suave">Simulação da aula · no app, o fã vê um bloco por vez</div>
          <div className="mx-auto w-[380px] rounded-[44px] border-[10px] border-tinta bg-tinta p-0 shadow-2xl">
            <div className="relative h-[720px] overflow-hidden rounded-[34px] bg-fundo">
              <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-tinta" />
              {aula ? (
                <div className="rolagem-fina h-full overflow-y-auto px-4 pb-8 pt-10">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-marca-600">
                    Aula {aulas.aulas.indexOf(aula) + 1} · {aula.id}
                  </div>
                  <div className="mt-1 text-lg font-extrabold leading-tight">{aula.titulo}</div>
                  <div className="mt-4 space-y-3">
                    {aula.blocos.map((b) => (
                      <div key={b.id} className={cn("group relative rounded-2xl", foco?.id === b.id && "ring-2 ring-marca-400")}>
                        <div className="absolute -right-1 -top-1 z-10">
                          <BotaoComentar
                            ativo={foco?.id === b.id}
                            onClick={() =>
                              onFoco({
                                id: b.id,
                                descricao: `${NOME_TIPO_BLOCO[b.tipo]} "${(b.tipo === "texto" ? b.texto : enunciadoDesafio(b)).slice(0, 50)}"`,
                              })
                            }
                          />
                        </div>
                        {b.tipo === "texto" && (
                          <div className="rounded-2xl border border-linha bg-superficie p-4 shadow-card">
                            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-suave">
                              <Type className="size-3" /> {b.id}
                              {rotuloBlocoTexto(b.titulo) && (
                                <span className="rounded-full bg-marca-50 px-2 py-0.5 text-marca-700">{rotuloBlocoTexto(b.titulo)}</span>
                              )}
                            </div>
                            <div className="text-[14px] leading-relaxed">
                              <Editavel
                                valor={b.texto}
                                multilinha
                                desabilitado={!editavel}
                                onSalvar={(v) =>
                                  editarBloco(
                                    b.id,
                                    (x) => {
                                      if (x.tipo === "texto") x.texto = v;
                                    },
                                    `Editou o texto ${b.id}`,
                                  )
                                }
                              />
                            </div>
                            {b.dica && (
                              <div className="mt-2.5 flex gap-2 rounded-xl bg-ambar-bg px-3 py-2 text-[12px] text-[#8a6100]">
                                <Lightbulb className="mt-0.5 size-3.5 shrink-0" />
                                {b.dica}
                              </div>
                            )}
                          </div>
                        )}
                        {b.tipo === "quiz" && (
                          <QuizPreview
                            quiz={b}
                            editavel={editavel}
                            card={tituloCard.get(b.skill_card_id)}
                            onEditar={(f, r) => editarBloco(b.id, (x) => x.tipo === "quiz" && f(x), r)}
                          />
                        )}
                        {b.tipo === "completar" && (
                          <CompletarPreview
                            bloco={b}
                            editavel={editavel}
                            card={b.skill_card_id}
                            onEditar={(f, r) => editarBloco(b.id, (x) => x.tipo === "completar" && f(x), r)}
                          />
                        )}
                        {b.tipo === "ordenar" && (
                          <OrdenarPreview
                            bloco={b}
                            editavel={editavel}
                            card={b.skill_card_id}
                            onEditar={(f, r) => editarBloco(b.id, (x) => x.tipo === "ordenar" && f(x), r)}
                          />
                        )}
                        {b.tipo === "aberta" && (
                          <AbertaPreview
                            bloco={b}
                            aula={aula}
                            trilhaId={trilhaId}
                            editavel={editavel}
                            card={b.skill_card_id}
                            onEditar={(f, r) => editarBloco(b.id, (x) => x.tipo === "aberta" && f(x), r)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid h-full place-items-center text-sm text-suave">Selecione uma aula</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizPreview({
  quiz,
  card,
  editavel,
  onEditar,
}: {
  quiz: BlocoQuiz;
  card?: string;
  editavel: boolean;
  onEditar: (f: (q: BlocoQuiz) => void, resumo: string) => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-marca-100 bg-superficie p-4 shadow-card">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-marca-600">
        <HelpCircle className="size-3" /> {quiz.id} · DESAFIO {card && <span className="truncate font-medium text-suave">· {quiz.skill_card_id}</span>}
      </div>
      <div className="text-[14px] font-bold leading-snug">
        <Editavel
          valor={quiz.pergunta}
          multilinha
          desabilitado={!editavel}
          onSalvar={(v) => onEditar((q) => (q.pergunta = v), `Editou a pergunta ${quiz.id}`)}
        />
      </div>
      <div className="mt-3 space-y-2">
        {quiz.opcoes.map((o, i) => (
          <div key={i} className={cn("rounded-xl border-2 px-3 py-2", o.correta ? "border-verde bg-verde-bg/60" : "border-linha")}>
            <div className="flex items-start gap-2 text-[13px] font-medium">
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-bold",
                  o.correta ? "bg-verde text-white" : "bg-fundo text-suave",
                )}
              >
                {LETRAS[i]}
              </span>
              <span className="flex-1">
                <Editavel
                  valor={o.texto}
                  desabilitado={!editavel}
                  onSalvar={(v) => onEditar((q) => (q.opcoes[i].texto = v), `Editou a opção ${LETRAS[i]} de ${quiz.id}`)}
                />
              </span>
              {o.correta && <CheckCircle2 className="size-4 shrink-0 text-verde" />}
            </div>
            <div className={cn("mt-1 pl-7 text-[11px] leading-snug", o.correta ? "text-[#11733f]" : "text-suave")}>
              <Editavel
                valor={o.feedback}
                multilinha
                desabilitado={!editavel}
                onSalvar={(v) => onEditar((q) => (q.opcoes[i].feedback = v), `Editou o feedback ${LETRAS[i]} de ${quiz.id}`)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Resumo({ rotulo, valor, ok, detalhe }: { rotulo: string; valor: string; ok?: boolean; detalhe?: string }) {
  return (
    <Cartao className="px-4 py-3">
      <div className="text-[11px] font-medium text-suave">{rotulo}</div>
      <div className={cn("text-xl font-extrabold", ok === true && "text-verde", ok === false && "text-vermelho")}>{valor}</div>
      {detalhe && <div className="truncate text-[10px] text-suave">{detalhe}</div>}
    </Cartao>
  );
}
