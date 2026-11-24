"use client";

import type { Foco } from "@edu/ai";
import { type Competencia, type Ementa, ementaComVinculos, moduloRevisado, type Revisoes, todosTopicos, verificarCoberturaCompetencias } from "@edu/core";
import { Botao, Cartao, cn, Pill } from "@edu/ui";
import { AlertTriangle, BookMarked, ChevronDown, FileText, GraduationCap, RefreshCw, Sparkles, Target, Users } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { BotaoComentar, Dica, Editavel } from "./comum";
import { useEstudio } from "./contexto";
import { CabecalhoModulo, ProgressoRevisao, useRevisaoModulos } from "./RevisaoModulos";

export function nomesMateriais(materiais: { id: string; nome: string }[]) {
  return new Map(materiais.map((m) => [m.id, m.nome.replace(/\.(pdf|docx|md|txt)$/i, "")]));
}

export function Fontes({ fontes, nomes }: { fontes: { material_id: string; pagina: number | null }[]; nomes: Map<string, string> }) {
  if (!fontes.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {fontes.slice(0, 4).map((f, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-azul-bg px-1.5 py-0.5 text-[10px] font-medium text-azul">
          <FileText className="size-3" />
          <span className="max-w-[160px] truncate">{nomes.get(f.material_id) ?? "material"}</span>
          {f.pagina ? ` · p. ${f.pagina}` : ""}
        </span>
      ))}
    </div>
  );
}

export function PainelEmenta({
  trilhaId,
  ementa,
  materiais,
  editavel,
  foco,
  onFoco,
  onEditar,
  visaoMudou,
  onGerarDeNovo,
  onEditarVisao,
  revisoes,
  temEdicaoNaoSalva,
  onSalvarEdicoes,
}: {
  trilhaId: string;
  ementa: Ementa;
  materiais: { id: string; nome: string }[];
  editavel: boolean;
  foco: Foco | null;
  onFoco: (f: Foco) => void;
  onEditar: (e: Ementa, resumo: string) => void;
  /** A visão aprovada mudou depois que esta ementa foi gerada. */
  visaoMudou?: boolean;
  onGerarDeNovo: () => void;
  onEditarVisao: () => void;
  /** Checks "Revisado" salvos (id do módulo → assinatura do conteúdo revisado). */
  revisoes: Revisoes;
  /** Há edições manuais não salvas: o check só vale para o conteúdo salvo. */
  temEdicaoNaoSalva: boolean;
  /** Salva as edições manuais da etapa (marcar como revisado salva antes, para o check valer para elas). */
  onSalvarEdicoes: () => Promise<void>;
}) {
  const { aplicarVisao, revisarModulo } = useEstudio().acoes;
  const nomes = nomesMateriais(materiais);
  const total = todosTopicos(ementa).length;
  const comVinculos = ementaComVinculos(ementa);
  const cobertura = verificarCoberturaCompetencias(ementa);
  const [aplicando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  // Sanfona + check "Revisado" por módulo (componente compartilhado com a etapa Cards).
  const rev = useRevisaoModulos({
    ids: ementa.modulos.map((m) => m.id),
    revisadoSalvo: (id) => {
      const m = ementa.modulos.find((x) => x.id === id);
      return !!m && moduloRevisado(m, revisoes);
    },
    chaveRevisoes: JSON.stringify(revisoes),
    salvar: async (id, valor) => {
      // Revisar também salva: o criador não precisa clicar em "Salvar alterações" antes.
      if (valor && temEdicaoNaoSalva) await onSalvarEdicoes();
      return revisarModulo(trilhaId, "ementa", id, valor);
    },
    onErro: setErro,
  });
  // Comentar um tópico (ou o Edu focar um item) dentro de um módulo fechado abre o módulo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: abre o módulo só quando o foco muda de item
  useEffect(() => {
    if (!foco) return;
    const m = ementa.modulos.find((x) => x.id === foco.id || x.topicos.some((t) => t.id === foco.id));
    if (m) rev.abrir(m.id);
  }, [foco?.id]);
  // Os dados da visão geral já foram aprovados: o cartão começa recolhido, só com o título.
  const [resumoAberto, setResumoAberto] = useState(false);
  const editar = (f: (e: Ementa) => void, resumo: string) => {
    const nova = structuredClone(ementa);
    f(nova);
    onEditar(nova, resumo);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {visaoMudou && (
        <div className="rounded-card border border-ambar/40 bg-ambar-bg px-5 py-4 text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ambar" />
            <div className="min-w-0 flex-1">
              <div className="font-bold">A visão geral mudou depois que esta ementa foi gerada.</div>
              <div className="mt-0.5 text-tinta-2">
                Se você só ajustou a redação, aplique as mudanças aqui. Se mudou o rumo (competências novas ou removidas), gere a ementa de novo.
              </div>
              {erro && <div className="mt-1 text-xs font-semibold text-vermelho">{erro}</div>}
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Botao
              variante="contorno"
              tamanho="sm"
              disabled={aplicando || !editavel}
              onClick={() =>
                iniciar(async () => {
                  setErro(null);
                  const r = await aplicarVisao(trilhaId);
                  if ("erro" in r) setErro(r.erro);
                })
              }
            >
              <RefreshCw className="size-3.5" /> Aplicar mudanças da visão
            </Botao>
            <Botao tamanho="sm" disabled={aplicando || !editavel} onClick={onGerarDeNovo}>
              <Sparkles className="size-3.5" /> Gerar ementa de novo
            </Botao>
          </div>
        </div>
      )}
      <Cartao className="p-6" data-tour="ementa-resumo">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-marca-600">
              Ementa da trilha
              <span className="font-semibold normal-case tracking-normal text-suave">· dados da visão geral aprovada</span>
            </div>
            <h2 className="mt-1 text-xl font-extrabold">{ementa.curso}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Pill tom="lilas">{ementa.modulos.length} módulos</Pill>
            <Pill tom="azul">{total} tópicos</Pill>
            <button
              type="button"
              onClick={() => setResumoAberto((v) => !v)}
              aria-expanded={resumoAberto}
              className="flex items-center gap-1 rounded-full border border-linha bg-superficie px-3 py-1.5 text-xs font-bold text-tinta-2 transition hover:border-marca-300 hover:text-marca-700"
            >
              {resumoAberto ? "Recolher" : "Ver detalhes"}
              <ChevronDown className={cn("size-4 transition", resumoAberto && "rotate-180")} />
            </button>
          </div>
        </div>
        {resumoAberto && (
          <>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="flex gap-3">
                <Target className="mt-0.5 size-4 shrink-0 text-marca-500" />
                <div className="text-sm leading-relaxed text-tinta-2">
                  <div className="text-xs font-bold text-tinta">Objetivo geral</div>
                  {ementa.objetivo_geral}
                </div>
              </div>
              <div className="flex gap-3">
                <Users className="mt-0.5 size-4 shrink-0 text-marca-500" />
                <div className="text-sm leading-relaxed text-tinta-2">
                  <div className="text-xs font-bold text-tinta">Público-alvo</div>
                  {ementa.publico_alvo}
                </div>
              </div>
            </div>
            {ementa.competencias.length > 0 && (
              <div className="mt-4 flex gap-3">
                <GraduationCap className="mt-0.5 size-4 shrink-0 text-marca-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    Competências
                    <Dica
                      texto={
                        <>
                          <b>Competências</b> são o que o fã vai saber fazer ao fim da trilha, definidas na Visão geral. Cada tópico da ementa indica, pelos
                          códigos K1, K2…, quais competências ele desenvolve.
                        </>
                      }
                    >
                      <span className="font-semibold text-suave hover:text-tinta-2">(K)</span>
                    </Dica>
                    {comVinculos && <span className="font-semibold text-suave">· {cobertura.percentual}% com tópicos</span>}
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {ementa.competencias.map((c) => {
                      const n = cobertura.matriz[c.id]?.length ?? 0;
                      return (
                        <li key={c.id} className="flex items-start gap-2 text-xs text-tinta-2">
                          <span className="mt-px shrink-0">
                            <Dica
                              alinhar="inicio"
                              texto={
                                <>
                                  <b>{c.id}</b> é o código desta competência: algo que o fã vai conseguir fazer ao fim da trilha. Os tópicos que a desenvolvem
                                  aparecem marcados com {c.id}.
                                </>
                              }
                            >
                              <span className="block rounded-md bg-marca-50 px-1.5 py-0.5 text-[10px] font-bold text-marca-700">{c.id}</span>
                            </Dica>
                          </span>
                          <span className="flex-1">{c.texto}</span>
                          {comVinculos && (
                            <span className={cn("shrink-0 text-[11px] font-semibold", n === 0 ? "text-vermelho" : "text-suave")}>
                              {n === 0 ? "nenhum tópico" : `${n} tópico${n === 1 ? "" : "s"}`}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
            <div className="mt-4 border-t border-linha pt-3 text-xs text-suave">
              Nome, objetivo, público e competências são definidos na{" "}
              <button type="button" onClick={onEditarVisao} className="font-semibold text-marca-700 hover:underline">
                Visão geral
              </button>
              .
            </div>
          </>
        )}
      </Cartao>

      <ProgressoRevisao revisados={rev.revisados} total={ementa.modulos.length} depois="os cards" />

      {ementa.modulos.map((m, mi) => {
        const aberto = rev.aberto(m.id);
        return (
          <Cartao key={m.id} className={cn("overflow-hidden")}>
            <CabecalhoModulo
              id={m.id}
              numero={mi + 1}
              dicaCodigo={
                <>
                  <b>{m.id}</b> é o código deste módulo (M de Módulo). Os tópicos dentro dele usam T (T1, T2…). Você pode citar esses códigos no chat com o Edu,
                  por exemplo: &quot;junte {m.id} com o próximo módulo&quot;.
                </>
              }
              titulo={
                <Editavel valor={m.titulo} desabilitado={!editavel} onSalvar={(v) => editar((e) => (e.modulos[mi].titulo = v), `Renomeou o módulo ${m.id}`)} />
              }
              descricao={
                <Editavel
                  valor={m.descricao}
                  multilinha
                  desabilitado={!editavel}
                  onSalvar={(v) => editar((e) => (e.modulos[mi].descricao = v), `Editou a descrição de ${m.id}`)}
                />
              }
              aberto={aberto}
              onAlternar={() => rev.alternar(m.id)}
              revisado={rev.revisado(m.id)}
              onRevisado={() => rev.marcar(m.id, !rev.revisado(m.id))}
              revisaoBloqueada={!editavel || rev.marcando}
              rotuloAbrir="Ver tópicos"
              acoes={<BotaoComentar ativo={foco?.id === m.id} onClick={() => onFoco({ id: m.id, descricao: `Módulo "${m.titulo}"` })} />}
            />
            {aberto && (
              <ul className="divide-y divide-linha">
                {m.topicos.map((t, ti) => (
                  <li key={t.id} className={cn("group flex gap-3 px-6 py-3.5 transition", foco?.id === t.id && "bg-marca-50/60")}>
                    <BookMarked className="mt-0.5 size-4 shrink-0 text-marca-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Dica
                          alinhar="inicio"
                          texto={
                            <>
                              <b>{t.id}</b> é o código deste tópico (T de Tópico): um assunto que o fã vai estudar. Na próxima etapa, cada tópico vira Cards de
                              Conhecimento. Você pode citar o código no chat com o Edu, por exemplo: &quot;detalhe mais o {t.id}&quot;.
                            </>
                          }
                        >
                          <span className="text-[11px] font-bold text-suave">{t.id}</span>
                        </Dica>
                        <span className="text-sm font-semibold">
                          <Editavel
                            valor={t.titulo}
                            desabilitado={!editavel}
                            onSalvar={(v) => editar((e) => (e.modulos[mi].topicos[ti].titulo = v), `Editou o tópico ${t.id}`)}
                          />
                        </span>
                      </div>
                      <div className="mt-0.5 text-[13px] leading-relaxed text-tinta-2">
                        <Editavel
                          valor={t.descricao}
                          multilinha
                          desabilitado={!editavel}
                          onSalvar={(v) => editar((e) => (e.modulos[mi].topicos[ti].descricao = v), `Editou a descrição de ${t.id}`)}
                        />
                      </div>
                      <Fontes fontes={t.fontes} nomes={nomes} />
                      {(comVinculos || t.competencia_ids) && ementa.competencias.length > 0 && (
                        <CompetenciasDoTopico competencias={ementa.competencias} ids={t.competencia_ids ?? []} />
                      )}
                    </div>
                    <BotaoComentar ativo={foco?.id === t.id} onClick={() => onFoco({ id: t.id, descricao: `Tópico "${t.titulo}"` })} />
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        );
      })}
    </div>
  );
}

/**
 * Competências que o tópico desenvolve, só para leitura (passar o mouse mostra o texto de cada uma).
 * Para mudar os vínculos, o criador pede ao Edu pelo chat.
 */
function CompetenciasDoTopico({ competencias, ids }: { competencias: Competencia[]; ids: string[] }) {
  const texto = new Map(competencias.map((c) => [c.id, c.texto]));
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      <GraduationCap className="size-3 text-marca-500" />
      {ids.length === 0 ? (
        <span className="rounded-md bg-ambar-bg px-1.5 py-0.5 text-[10px] font-semibold text-[#8a6100]">sem competência</span>
      ) : (
        ids.map((k) => (
          <Dica
            key={k}
            alinhar="inicio"
            texto={
              texto.has(k) ? (
                <>
                  <b>{k}</b> · {texto.get(k)}
                </>
              ) : (
                `${k} não existe na visão geral.`
              )
            }
          >
            <span
              className={cn(
                "block rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                texto.has(k) ? "bg-marca-50 text-marca-700" : "bg-vermelho-bg text-vermelho",
              )}
            >
              {k}
            </span>
          </Dica>
        ))
      )}
    </div>
  );
}
