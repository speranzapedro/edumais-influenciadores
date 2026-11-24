"use client";

import type { Foco } from "@edu/ai";
import { assinaturaCards, type CardsDraft, cardsDoModulo, type Ementa, LIMITES, type Revisoes, todosTopicos, verificarCoberturaCards } from "@edu/core";
import { AnelProgresso, Cartao, cn, Pill } from "@edu/ui";
import { CheckCircle2, CircleAlert, LayoutGrid, Lightbulb, Plus, Table2, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BotaoComentar, Dica, Editavel } from "./comum";
import { useEstudio } from "./contexto";
import { Fontes, nomesMateriais } from "./PainelEmenta";
import { CabecalhoModulo, ProgressoRevisao, useRevisaoModulos } from "./RevisaoModulos";

const dicaModulo = (id: string) => (
  <>
    <b>{id}</b> é o código do módulo (M de Módulo), definido na Ementa. Os cards desta seção cobrem os tópicos deste módulo.
  </>
);
const dicaCard = (id: string, titulo?: string) => (
  <>
    <b>{id}</b>
    {titulo ? <> · {titulo}</> : null}. É o código deste Card de Conhecimento (C de Card): um conceito pequeno, com pontos-chave e um exemplo. As aulas são
    montadas a partir dos cards, e os desafios avaliam cada um deles. Você pode citar o código no chat com o Edu, por exemplo:{" "}
    <span className="whitespace-nowrap">&quot;simplifique o {id}&quot;.</span>
  </>
);
const dicaTopico = (id: string, titulo?: string) => (
  <>
    <b>{id}</b>
    {titulo ? <> · {titulo}</> : null}. É o código do tópico da Ementa (T de Tópico). Cada tópico precisa estar coberto por pelo menos um card.
  </>
);

export function PainelCards({
  trilhaId,
  revisoes,
  temEdicaoNaoSalva,
  onSalvarEdicoes,
  ementa,
  cards,
  materiais,
  editavel,
  foco,
  onFoco,
  onEditar,
}: {
  trilhaId: string;
  /** Checks "Revisado" salvos nesta etapa (id do módulo → assinatura dos cards do módulo). */
  revisoes: Revisoes;
  /** Há edições manuais não salvas: o check só vale para o conteúdo salvo. */
  temEdicaoNaoSalva: boolean;
  /** Salva as edições manuais da etapa (marcar como revisado salva antes, para o check valer para elas). */
  onSalvarEdicoes: () => Promise<void>;
  ementa: Ementa;
  cards: CardsDraft;
  materiais: { id: string; nome: string }[];
  editavel: boolean;
  foco: Foco | null;
  onFoco: (f: Foco) => void;
  onEditar: (c: CardsDraft, resumo: string) => void;
}) {
  const { revisarModulo } = useEstudio().acoes;
  const [visao, setVisao] = useState<"cards" | "matriz">("cards");
  const nomes = nomesMateriais(materiais);
  const cob = verificarCoberturaCards(ementa, cards);
  const tituloCard = new Map(cards.cards.map((c) => [c.id, c.titulo]));
  const topicos = todosTopicos(ementa);
  const moduloDoTopico = new Map(topicos.map((t) => [t.id, t.modulo_id]));
  const tituloTopico = new Map(topicos.map((t) => [t.id, t.titulo]));

  // Módulos com cards: sanfona + check "Revisado" (mesmo componente da Ementa).
  const modulosComCards = ementa.modulos.filter((m) => cardsDoModulo(ementa, cards, m.id).length > 0);
  const [erro, setErro] = useState<string | null>(null);
  const rev = useRevisaoModulos({
    ids: modulosComCards.map((m) => m.id),
    revisadoSalvo: (id) => revisoes[id] === assinaturaCards(cardsDoModulo(ementa, cards, id)),
    chaveRevisoes: JSON.stringify(revisoes),
    salvar: async (id, valor) => {
      // Revisar também salva: o criador não precisa clicar em "Salvar alterações" antes.
      if (valor && temEdicaoNaoSalva) await onSalvarEdicoes();
      return revisarModulo(trilhaId, "cards", id, valor);
    },
    onErro: setErro,
  });
  // Comentar um card (ou o Edu focar um) dentro de um módulo fechado abre o módulo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: abre o módulo só quando o foco muda de item
  useEffect(() => {
    const card = foco && cards.cards.find((c) => c.id === foco.id);
    const modulo = card && moduloDoTopico.get(card.topico_ids[0]);
    if (modulo) rev.abrir(modulo);
  }, [foco?.id]);

  const excluir = (id: string) => onEditar({ cards: cards.cards.filter((c) => c.id !== id) }, `Excluiu o card ${id}`);

  const editar = (id: string, campo: "titulo" | "conceito" | "exemplo", valor: string) => {
    const novo = structuredClone(cards);
    const c = novo.cards.find((x) => x.id === id);
    if (!c) return;
    c[campo] = valor;
    onEditar(novo, `Editou ${campo} do card ${id}`);
  };
  // Pontos-chave: editar, excluir ou adicionar (a validação pede de 3 a 5 por card).
  const editarPontos = (id: string, f: (pontos: string[]) => void, resumo: string) => {
    const novo = structuredClone(cards);
    const c = novo.cards.find((x) => x.id === id);
    if (!c) return;
    f(c.pontos_chave);
    onEditar(novo, resumo);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Cartao className="flex flex-wrap items-center gap-6 p-6" data-tour="cards-cobertura">
        <AnelProgresso
          valor={cob.percentual}
          tamanho={92}
          espessura={10}
          cor={cob.percentual === 100 ? "#1fb768" : "#6c5ce7"}
          trilho={cob.percentual === 100 ? "#ddf6e8" : "#ebe7ff"}
        >
          <span className="text-lg font-extrabold">{cob.percentual}%</span>
        </AnelProgresso>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-marca-600">Cobertura da ementa</div>
          <div className="mt-1 text-lg font-extrabold">
            {cards.cards.length} Cards de Conhecimento cobrem {cob.totalTopicos - cob.topicosSemCard.length} de {cob.totalTopicos} tópicos
          </div>
          {cob.topicosSemCard.length > 0 ? (
            <div className="mt-1 text-sm text-vermelho">Sem card: {cob.topicosSemCard.map((t) => `${t.id} ${t.titulo}`).join(" · ")}</div>
          ) : (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-verde">
              <CheckCircle2 className="size-4" /> A soma dos cards cobre 100% da ementa.
            </div>
          )}
        </div>
        <div className="flex rounded-xl bg-fundo p-1">
          {(
            [
              ["cards", "Cards", LayoutGrid],
              ["matriz", "Matriz de cobertura", Table2],
            ] as const
          ).map(([id, rot, I]) => (
            <button
              type="button"
              key={id}
              onClick={() => setVisao(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                visao === id ? "bg-superficie text-marca-700 shadow-card" : "text-suave",
              )}
            >
              <I className="size-3.5" /> {rot}
            </button>
          ))}
        </div>
      </Cartao>

      {visao === "matriz" ? (
        <Cartao className="overflow-hidden">
          {ementa.modulos.map((m) => (
            <div key={m.id}>
              <div className="flex items-center gap-1 border-y border-linha bg-fundo/70 px-6 py-2 text-xs font-bold text-tinta-2 first:border-t-0">
                <Dica alinhar="inicio" texto={dicaModulo(m.id)}>
                  <span>{m.id}</span>
                </Dica>
                · {m.titulo}
              </div>
              {m.topicos.map((t) => {
                const lista = cob.matriz[t.id] ?? [];
                return (
                  <div key={t.id} className="flex items-center gap-3 border-b border-linha px-6 py-2.5 last:border-b-0">
                    {lista.length ? <CheckCircle2 className="size-4 shrink-0 text-verde" /> : <CircleAlert className="size-4 shrink-0 text-vermelho" />}
                    <span className="w-10 shrink-0">
                      <Dica alinhar="inicio" texto={dicaTopico(t.id, t.titulo)}>
                        <span className="text-[11px] font-bold text-suave">{t.id}</span>
                      </Dica>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{t.titulo}</span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {lista.length ? (
                        lista.map((c) => (
                          <Dica key={c} texto={dicaCard(c, tituloCard.get(c))}>
                            <span className="block rounded-md bg-marca-50 px-1.5 py-0.5 text-[11px] font-bold text-marca-700">{c}</span>
                          </Dica>
                        ))
                      ) : (
                        <Pill tom="vermelho">sem card</Pill>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </Cartao>
      ) : (
        <>
          <ProgressoRevisao revisados={rev.revisados} total={modulosComCards.length} depois="as aulas" />
          {erro && <div className="text-sm font-semibold text-vermelho">{erro}</div>}
          {modulosComCards.map((m) => {
            const doModulo = cardsDoModulo(ementa, cards, m.id);
            const numero = ementa.modulos.indexOf(m) + 1;
            const aberto = rev.aberto(m.id);
            return (
              <Cartao key={m.id} className="overflow-hidden">
                <CabecalhoModulo
                  id={m.id}
                  numero={numero}
                  dicaCodigo={dicaModulo(m.id)}
                  titulo={m.titulo}
                  descricao={`${doModulo.length} card${doModulo.length === 1 ? "" : "s"} de conhecimento neste módulo`}
                  aberto={aberto}
                  onAlternar={() => rev.alternar(m.id)}
                  revisado={rev.revisado(m.id)}
                  onRevisado={() => rev.marcar(m.id, !rev.revisado(m.id))}
                  revisaoBloqueada={!editavel || rev.marcando}
                  rotuloAbrir="Ver cards"
                />
                {aberto && (
                  <div className="p-5">
                    <div className="grid gap-4 lg:grid-cols-2">
                      {doModulo.map((c) => (
                        <Cartao key={c.id} className={cn("group flex flex-col p-5", foco?.id === c.id && "ring-2 ring-marca-300")}>
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 shrink-0">
                              <Dica alinhar="inicio" texto={dicaCard(c.id)}>
                                <span className="block rounded-md bg-marca-50 px-1.5 py-0.5 text-[11px] font-bold text-marca-700">{c.id}</span>
                              </Dica>
                            </span>
                            <div className="min-w-0 flex-1 font-bold leading-snug">
                              <Editavel valor={c.titulo} desabilitado={!editavel} onSalvar={(v) => editar(c.id, "titulo", v)} />
                            </div>
                            <BotaoComentar ativo={foco?.id === c.id} onClick={() => onFoco({ id: c.id, descricao: `Card "${c.titulo}"` })} />
                            {editavel && (
                              <button
                                type="button"
                                onClick={() => excluir(c.id)}
                                title={`Excluir o card ${c.id}`}
                                aria-label={`Excluir o card ${c.id}`}
                                className="grid size-7 shrink-0 place-items-center rounded-lg text-suave transition hover:bg-vermelho-bg hover:text-vermelho"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>
                          <div className="mt-2.5 text-[13px] leading-relaxed text-tinta-2">
                            <Editavel valor={c.conceito} multilinha desabilitado={!editavel} onSalvar={(v) => editar(c.id, "conceito", v)} />
                          </div>
                          <ul className="mt-3 space-y-1">
                            {c.pontos_chave.map((p, i) => (
                              <li key={i} className="group/ponto flex gap-2 text-[12px] text-tinta">
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-marca-500" />
                                <span className="min-w-0 flex-1">
                                  <Editavel
                                    valor={p}
                                    multilinha
                                    desabilitado={!editavel}
                                    placeholder="Escreva o ponto-chave"
                                    onSalvar={(v) => editarPontos(c.id, (pk) => (pk[i] = v), `Editou um ponto-chave do card ${c.id}`)}
                                  />
                                </span>
                                {editavel && (
                                  <button
                                    type="button"
                                    onClick={() => editarPontos(c.id, (pk) => pk.splice(i, 1), `Excluiu um ponto-chave do card ${c.id}`)}
                                    title="Excluir este ponto-chave"
                                    aria-label="Excluir este ponto-chave"
                                    className="grid size-5 shrink-0 place-items-center rounded text-suave opacity-0 transition hover:text-vermelho group-hover/ponto:opacity-100 focus-visible:opacity-100"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                          {editavel && c.pontos_chave.length < LIMITES.pontosChave.max && (
                            <button
                              type="button"
                              onClick={() => editarPontos(c.id, (pk) => pk.push(""), `Adicionou um ponto-chave ao card ${c.id}`)}
                              className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-marca-700 hover:underline"
                            >
                              <Plus className="size-3.5" /> Adicionar ponto-chave
                            </button>
                          )}
                          <div className="mt-3 flex gap-2 rounded-xl bg-ambar-bg/70 px-3 py-2.5 text-[12px] leading-relaxed text-[#7a5600]">
                            <Lightbulb className="mt-0.5 size-3.5 shrink-0" />
                            <Editavel valor={c.exemplo} multilinha desabilitado={!editavel} onSalvar={(v) => editar(c.id, "exemplo", v)} />
                          </div>
                          <div className="mt-auto pt-3">
                            <div className="flex flex-wrap gap-1">
                              {c.topico_ids.map((t) => (
                                <Dica key={t} alinhar="inicio" texto={dicaTopico(t, tituloTopico.get(t))}>
                                  <span className="block rounded-md bg-fundo px-1.5 py-0.5 text-[10px] font-semibold text-tinta-2">
                                    {t} · {tituloTopico.get(t)?.slice(0, 32)}
                                  </span>
                                </Dica>
                              ))}
                            </div>
                            <Fontes fontes={c.fontes} nomes={nomes} />
                          </div>
                        </Cartao>
                      ))}
                    </div>
                  </div>
                )}
              </Cartao>
            );
          })}
        </>
      )}
    </div>
  );
}
