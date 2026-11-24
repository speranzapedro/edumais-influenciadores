"use client";

import type { Foco } from "@edu/ai";
import { LIMITES_VISAO, proximoCodigo, type VisaoGeral } from "@edu/core";
import { Cartao, cn } from "@edu/ui";
import { ArrowDown, ArrowUp, GraduationCap, Plus, Target, Trash2, Users } from "lucide-react";
import { BotaoComentar, Dica, Editavel } from "./comum";

/**
 * Visão geral da trilha (etapa aprovada antes da ementa): nome, objetivo geral, público-alvo e
 * competências. Tudo editável; as competências têm ids estáveis (K1…) porque os tópicos da ementa
 * apontam para eles.
 */
export function PainelVisao({
  visao,
  editavel,
  foco,
  onFoco,
  onEditar,
  aprovada,
}: {
  visao: VisaoGeral;
  editavel: boolean;
  foco: Foco | null;
  onFoco: (f: Foco) => void;
  onEditar: (v: VisaoGeral, resumo: string) => void;
  /** A etapa já foi aprovada (muda o texto de orientação do painel). */
  aprovada?: boolean;
}) {
  const editar = (f: (v: VisaoGeral) => void, resumo: string) => {
    const nova = structuredClone(visao);
    f(nova);
    onEditar(nova, resumo);
  };
  const mover = (i: number, delta: -1 | 1) =>
    editar((v) => {
      const [c] = v.competencias.splice(i, 1);
      v.competencias.splice(i + delta, 0, c);
    }, `Reordenou a competência ${visao.competencias[i].id}`);
  const n = visao.competencias.length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Cartao className={cn("p-6")} data-tour="visao-cartao">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-marca-600">Visão geral da trilha</div>
        <h2 className="mt-1 text-xl font-extrabold">
          <Editavel valor={visao.curso} desabilitado={!editavel} placeholder="Nome da trilha" onSalvar={(v) => editar((x) => (x.curso = v), "Editou o nome")} />
        </h2>
        <p className="mt-1 text-sm text-suave">
          {aprovada
            ? "Visão aprovada: é a base da ementa. Se mudar algo aqui, a ementa fica marcada para revisão."
            : "Revise e ajuste antes de aprovar: a ementa (módulos e tópicos) será montada a partir desta visão."}
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="flex gap-3">
            <Target className="mt-0.5 size-4 shrink-0 text-marca-500" />
            <div className="min-w-0 flex-1 text-sm leading-relaxed text-tinta-2">
              <div className="text-xs font-bold text-tinta">Objetivo geral</div>
              <Editavel
                valor={visao.objetivo_geral}
                multilinha
                desabilitado={!editavel}
                placeholder="O que o fã consegue fazer ao fim da trilha"
                onSalvar={(v) => editar((x) => (x.objetivo_geral = v), "Editou o objetivo geral")}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Users className="mt-0.5 size-4 shrink-0 text-marca-500" />
            <div className="min-w-0 flex-1 text-sm leading-relaxed text-tinta-2">
              <div className="text-xs font-bold text-tinta">Público-alvo</div>
              <Editavel
                valor={visao.publico_alvo}
                multilinha
                desabilitado={!editavel}
                placeholder="Quem é o fã e o que ele já precisa saber"
                onSalvar={(v) => editar((x) => (x.publico_alvo = v), "Editou o público-alvo")}
              />
            </div>
          </div>
        </div>
      </Cartao>

      <Cartao className="overflow-hidden" data-tour="visao-competencias">
        <div className="flex items-center gap-3 border-b border-linha bg-fundo/60 px-6 py-4">
          <GraduationCap className="size-5 text-marca-600" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-bold">
              Competências
              <Dica
                texto={
                  <>
                    <b>Competências</b> são o que o fã vai saber fazer ao fim da trilha: capacidades que dá para observar, como &quot;Calcular a corrente de um
                    circuito&quot;. Cada uma ganha um código com K (K1, K2, K3…). Na Ementa, cada tópico indica, por esses códigos, quais competências ele
                    desenvolve.
                  </>
                }
              >
                <span className="font-semibold text-suave hover:text-tinta-2">(K)</span>
              </Dica>
            </div>
            <div className="text-xs text-suave">
              O que o fã vai saber fazer ao fim da trilha. Recomendamos de {LIMITES_VISAO.competencias.min} a {LIMITES_VISAO.competencias.max}. Cada tópico da
              ementa vai se ligar a pelo menos uma delas.
            </div>
          </div>
          <span
            className={cn("text-xs font-semibold", n < LIMITES_VISAO.competencias.min || n > LIMITES_VISAO.competencias.max ? "text-[#8a6100]" : "text-suave")}
          >
            {n}
          </span>
        </div>
        <ul className="divide-y divide-linha">
          {visao.competencias.map((c, i) => (
            <li key={c.id} className={cn("group flex items-start gap-3 px-6 py-3", foco?.id === c.id && "bg-marca-50/60")}>
              <span className="mt-0.5 shrink-0">
                <Dica
                  alinhar="inicio"
                  texto={
                    <>
                      <b>{c.id}</b> é o código desta competência: algo que o fã vai conseguir fazer ao fim da trilha. Na Ementa, os tópicos que a desenvolvem
                      aparecem marcados com {c.id}.
                    </>
                  }
                >
                  <span className="block rounded-md bg-marca-50 px-1.5 py-0.5 text-[11px] font-bold text-marca-700">{c.id}</span>
                </Dica>
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <Editavel
                  valor={c.texto}
                  multilinha
                  desabilitado={!editavel}
                  placeholder="Clique para escrever a competência (ex.: Calcular a corrente de um circuito)"
                  onSalvar={(v) => editar((x) => (x.competencias[i].texto = v), `Editou a competência ${c.id}`)}
                />
              </div>
              {editavel && (
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <BotaoIcone titulo="Subir" desabilitado={i === 0} onClick={() => mover(i, -1)}>
                    <ArrowUp className="size-3.5" />
                  </BotaoIcone>
                  <BotaoIcone titulo="Descer" desabilitado={i === n - 1} onClick={() => mover(i, 1)}>
                    <ArrowDown className="size-3.5" />
                  </BotaoIcone>
                  <BotaoIcone titulo="Remover" perigo onClick={() => editar((x) => x.competencias.splice(i, 1), `Removeu a competência ${c.id}`)}>
                    <Trash2 className="size-3.5" />
                  </BotaoIcone>
                </div>
              )}
              <BotaoComentar ativo={foco?.id === c.id} onClick={() => onFoco({ id: c.id, descricao: `Competência ${c.id} "${c.texto}"` })} />
            </li>
          ))}
        </ul>
        {editavel && (
          <div className="border-t border-linha px-6 py-3">
            <button
              type="button"
              onClick={() =>
                editar((x) => {
                  x.competencias.push({
                    id: proximoCodigo(
                      "K",
                      x.competencias.map((k) => k.id),
                    ),
                    texto: "",
                  });
                }, "Adicionou uma competência")
              }
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-marca-700 hover:underline"
            >
              <Plus className="size-4" /> Adicionar competência
            </button>
          </div>
        )}
      </Cartao>
    </div>
  );
}

function BotaoIcone({
  titulo,
  onClick,
  desabilitado,
  perigo,
  children,
}: {
  titulo: string;
  onClick: () => void;
  desabilitado?: boolean;
  perigo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={titulo}
      disabled={desabilitado}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-lg text-suave transition disabled:opacity-30",
        perigo ? "hover:bg-vermelho-bg hover:text-vermelho" : "hover:bg-fundo hover:text-tinta",
      )}
    >
      {children}
    </button>
  );
}
