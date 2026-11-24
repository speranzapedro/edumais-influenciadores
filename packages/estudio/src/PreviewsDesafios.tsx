"use client";

import type { Aula, BlocoAberta, BlocoCompletar, BlocoOrdenar } from "@edu/core";
import { LIMITES } from "@edu/core";
import { Botao, cn, lerEventosSSE, TextoComNegrito } from "@edu/ui";
import { AlertTriangle, ChevronDown, FlaskConical, ListOrdered, Loader2, PenLine, Sparkles, TextCursorInput } from "lucide-react";
import { useState } from "react";
import { Editavel } from "./comum";

type Editar<T> = (f: (b: T) => void, resumo: string) => void;

function Cabecalho({ icone, id, rotulo, card }: { icone: React.ReactNode; id: string; rotulo: string; card?: string }) {
  return (
    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-marca-600">
      {icone} {id} · {rotulo} {card && <span className="truncate font-medium text-suave">· {card}</span>}
    </div>
  );
}

/** Lista editável item a item (passos, distratores, erros comuns, alertas). */
function ListaEditavel({
  itens,
  editavel,
  onSalvar,
  numerada = false,
  classeItem,
}: {
  itens: string[];
  editavel: boolean;
  onSalvar: (i: number, v: string) => void;
  numerada?: boolean;
  classeItem?: string;
}) {
  return (
    <ul className="space-y-1">
      {itens.map((t, i) => (
        <li key={i} className={cn("flex gap-1.5 text-[12px] leading-snug", classeItem)}>
          <span className="shrink-0 font-bold text-suave">{numerada ? `${i + 1}.` : "•"}</span>
          <Editavel valor={t} multilinha desabilitado={!editavel} onSalvar={(v) => onSalvar(i, v)} />
        </li>
      ))}
    </ul>
  );
}

export function CompletarPreview({
  bloco,
  card,
  editavel,
  onEditar,
}: {
  bloco: BlocoCompletar;
  card?: string;
  editavel: boolean;
  onEditar: Editar<BlocoCompletar>;
}) {
  return (
    <div className="rounded-2xl border-2 border-marca-100 bg-superficie p-4 shadow-card">
      <Cabecalho icone={<TextCursorInput className="size-3" />} id={bloco.id} rotulo="COMPLETAR" card={card} />
      <div className="text-[14px] font-semibold leading-relaxed">
        <Editavel valor={bloco.texto} multilinha desabilitado={!editavel} onSalvar={(v) => onEditar((b) => (b.texto = v), `Editou o texto de ${bloco.id}`)} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {bloco.lacunas.map((l, i) => (
          <span
            key={`l${i}`}
            className="inline-flex items-center gap-1 rounded-lg border-2 border-verde bg-verde-bg/60 px-2 py-0.5 text-[12px] font-semibold text-[#11733f]"
          >
            <span className="text-[10px] opacity-70">[[{i + 1}]]</span>
            <Editavel
              valor={l.resposta}
              desabilitado={!editavel}
              onSalvar={(v) => onEditar((b) => (b.lacunas[i].resposta = v), `Editou a lacuna ${i + 1} de ${bloco.id}`)}
            />
          </span>
        ))}
        {bloco.distratores.map((d, i) => (
          <span key={`d${i}`} className="rounded-lg border-2 border-linha px-2 py-0.5 text-[12px] font-medium text-suave">
            <Editavel valor={d} desabilitado={!editavel} onSalvar={(v) => onEditar((b) => (b.distratores[i] = v), `Editou um distrator de ${bloco.id}`)} />
          </span>
        ))}
      </div>
      <div className="mt-2 text-[11px] leading-snug text-suave">
        <Editavel
          valor={bloco.explicacao}
          multilinha
          desabilitado={!editavel}
          onSalvar={(v) => onEditar((b) => (b.explicacao = v), `Editou a explicação de ${bloco.id}`)}
        />
      </div>
    </div>
  );
}

export function OrdenarPreview({ bloco, card, editavel, onEditar }: { bloco: BlocoOrdenar; card?: string; editavel: boolean; onEditar: Editar<BlocoOrdenar> }) {
  return (
    <div className="rounded-2xl border-2 border-marca-100 bg-superficie p-4 shadow-card">
      <Cabecalho icone={<ListOrdered className="size-3" />} id={bloco.id} rotulo="ORDENAR" card={card} />
      <div className="text-[14px] font-bold leading-snug">
        <Editavel
          valor={bloco.instrucao}
          multilinha
          desabilitado={!editavel}
          onSalvar={(v) => onEditar((b) => (b.instrucao = v), `Editou a instrução de ${bloco.id}`)}
        />
      </div>
      <div className="mt-1 text-[10px] text-suave">Ordem correta (o fã recebe embaralhado):</div>
      <div className="mt-1.5 rounded-xl border-2 border-linha px-3 py-2">
        <ListaEditavel
          itens={bloco.passos}
          numerada
          editavel={editavel}
          onSalvar={(i, v) => onEditar((b) => (b.passos[i] = v), `Editou o passo ${i + 1} de ${bloco.id}`)}
        />
      </div>
      <div className="mt-2 text-[11px] leading-snug text-suave">
        <Editavel
          valor={bloco.explicacao}
          multilinha
          desabilitado={!editavel}
          onSalvar={(v) => onEditar((b) => (b.explicacao = v), `Editou a explicação de ${bloco.id}`)}
        />
      </div>
    </div>
  );
}

export function AbertaPreview({
  bloco,
  aula,
  trilhaId,
  card,
  editavel,
  onEditar,
}: {
  bloco: BlocoAberta;
  aula: Aula;
  trilhaId: string;
  card?: string;
  editavel: boolean;
  onEditar: Editar<BlocoAberta>;
}) {
  const [aberto, setAberto] = useState(false);
  const g = bloco.gabarito;
  return (
    <div className="rounded-2xl border-2 border-marca-200 bg-superficie p-4 shadow-card">
      <Cabecalho icone={<PenLine className="size-3" />} id={bloco.id} rotulo="PERGUNTA ABERTA · FEEDBACK DO EDU" card={card} />
      <div className="text-[14px] font-bold leading-snug">
        <Editavel
          valor={bloco.pergunta}
          multilinha
          desabilitado={!editavel}
          onSalvar={(v) => onEditar((b) => (b.pergunta = v), `Editou a pergunta ${bloco.id}`)}
        />
      </div>
      {bloco.dica && <div className="mt-1.5 rounded-lg bg-ambar-bg px-2 py-1 text-[11px] text-[#8a6100]">Dica: {bloco.dica}</div>}

      <button
        type="button"
        onClick={() => setAberto((x) => !x)}
        className="mt-3 flex w-full items-center justify-between rounded-xl bg-marca-50 px-3 py-2 text-[11px] font-bold text-marca-700"
      >
        Gabarito (só você vê)
        <ChevronDown className={cn("size-3.5 transition", aberto && "rotate-180")} />
      </button>
      {aberto && (
        <div className="mt-2 space-y-2.5 rounded-xl border border-linha px-3 py-2.5">
          <div>
            <div className="text-[10px] font-bold uppercase text-suave">Resposta modelo</div>
            <div className="text-[12px] leading-snug">
              <Editavel
                valor={g.resposta_modelo}
                multilinha
                desabilitado={!editavel}
                onSalvar={(v) => onEditar((b) => (b.gabarito.resposta_modelo = v), `Editou a resposta modelo de ${bloco.id}`)}
              />
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-suave">Critérios</div>
            <ul className="mt-0.5 space-y-1">
              {g.criterios.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug">
                  <button
                    type="button"
                    disabled={!editavel}
                    title={editavel ? "Clique para alternar essencial" : undefined}
                    onClick={() =>
                      onEditar((b) => (b.gabarito.criterios[i].essencial = !b.gabarito.criterios[i].essencial), `Alterou critério essencial de ${bloco.id}`)
                    }
                    className={cn("mt-0.5 shrink-0 rounded px-1 text-[9px] font-bold", c.essencial ? "bg-marca-600 text-white" : "bg-fundo text-suave")}
                  >
                    {c.essencial ? "ESSENCIAL" : "desejável"}
                  </button>
                  <Editavel
                    valor={c.descricao}
                    multilinha
                    desabilitado={!editavel}
                    onSalvar={(v) => onEditar((b) => (b.gabarito.criterios[i].descricao = v), `Editou um critério de ${bloco.id}`)}
                  />
                </li>
              ))}
            </ul>
          </div>
          {g.erros_comuns.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase text-suave">Erros comuns</div>
              <ListaEditavel
                itens={g.erros_comuns}
                editavel={editavel}
                onSalvar={(i, v) => onEditar((b) => (b.gabarito.erros_comuns[i] = v), `Editou um erro comum de ${bloco.id}`)}
              />
            </div>
          )}
          {g.alertas_criticos.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-vermelho">
                <AlertTriangle className="size-3" /> Alertas críticos
              </div>
              <ListaEditavel
                itens={g.alertas_criticos}
                editavel={editavel}
                classeItem="text-[#a32020]"
                onSalvar={(i, v) => onEditar((b) => (b.gabarito.alertas_criticos[i] = v), `Editou um alerta crítico de ${bloco.id}`)}
              />
            </div>
          )}
        </div>
      )}
      <TestarComoAluno trilhaId={trilhaId} aula={aula} blocoId={bloco.id} />
    </div>
  );
}

type EventoTeste =
  | { tipo: "texto"; delta: string }
  | { tipo: "fim"; feedback: string; classificacao: string | null; custo_usd: number }
  | { tipo: "erro"; mensagem: string };

const NOME_CLASSIFICACAO: Record<string, string> = { adequada: "adequada", parcial: "parcial", inadequada: "inadequada" };

/** O criador escreve uma resposta de teste e vê o feedback que o fã receberia (com o rascunho atual). */
function TestarComoAluno({ trilhaId, aula, blocoId }: { trilhaId: string; aula: Aula; blocoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rodando, setRodando] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const testar = async () => {
    setRodando(true);
    setFeedback("");
    setInfo(null);
    setErro(null);
    try {
      const resp = await fetch(`/api/trilhas/${trilhaId}/testar-aberta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aula, blocoId, resposta: texto.trim() }),
      });
      if (!resp.ok) throw new Error((await resp.text()) || `Erro ${resp.status}`);
      await lerEventosSSE<EventoTeste>(resp, (e) => {
        if (e.tipo === "texto") setFeedback((f) => f + e.delta);
        else if (e.tipo === "fim") {
          setFeedback(e.feedback);
          setInfo(`Classificação interna: ${e.classificacao ? NOME_CLASSIFICACAO[e.classificacao] : "—"} · custo US$ ${e.custo_usd.toFixed(4)}`);
        } else throw new Error(e.mensagem);
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao testar.");
    } finally {
      setRodando(false);
    }
  };

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-marca-300 px-3 py-2 text-[11px] font-bold text-marca-700 hover:bg-marca-50"
      >
        <FlaskConical className="size-3.5" /> Testar como fã
      </button>
    );
  }
  return (
    <div className="mt-2 rounded-xl border border-marca-200 bg-fundo p-2.5">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, LIMITES.respostaAluno.max))}
        rows={3}
        placeholder="Escreva uma resposta como um fã escreveria…"
        className="w-full resize-none rounded-lg border border-linha bg-superficie px-2.5 py-2 text-[12px] outline-none focus:border-marca-300"
      />
      <Botao tamanho="sm" className="mt-1.5 w-full" disabled={rodando || texto.trim().length < LIMITES.respostaAluno.min} onClick={testar}>
        {rodando ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} {rodando ? "Gerando feedback…" : "Ver feedback do tutor"}
      </Botao>
      {(feedback || erro) && (
        <div
          className={cn(
            "mt-2 whitespace-pre-line rounded-lg px-2.5 py-2 text-[12px] leading-relaxed",
            erro ? "bg-vermelho-bg text-vermelho" : "bg-superficie text-tinta",
          )}
        >
          {erro ?? <TextoComNegrito texto={feedback} />}
        </div>
      )}
      {info && <div className="mt-1 text-[10px] text-suave">{info}</div>}
    </div>
  );
}
