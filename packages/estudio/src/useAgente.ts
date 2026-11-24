"use client";

import type { AvaliacaoQualidade, EventoAgente, Foco, TipoMudanca } from "@edu/ai";
import type { Etapa, Pendencia } from "@edu/core";
import { useCallback, useRef, useState } from "react";

export interface ChipAcao {
  id: string;
  rotulo: string;
  estado: "rodando" | "ok" | "erro";
  resumo?: string;
}

export interface ExecucaoAoVivo {
  etapa: Etapa;
  modo: "geracao" | "refinamento";
  pedido: string;
  foco: Foco | null;
  narracao: string;
  /** Resumo do raciocínio do modelo (streaming), exibido enquanto ele pensa. */
  pensamento: string;
  status: string | null;
  chips: ChipAcao[];
  custo: number;
  tokens: number;
  qualidade: AvaliacaoQualidade | null;
  pendencias: Pendencia[] | null;
  resumo: string | null;
  erro: string | null;
  inicio: number;
  /** Preenchido quando a versão foi salva; a UI troca a execução ao vivo pela mensagem persistida. */
  mensagemId: string | null;
}

type EventoStream = EventoAgente | { tipo: "salvo"; versao: number; mensagemId: string };

/** Cliente SSE do agente: dispara a execução e acompanha os eventos ao vivo. */
export function useAgente(
  trilhaId: string,
  callbacks: {
    onDraft: (etapa: Etapa, draft: unknown, mudancas: Record<string, TipoMudanca>) => void;
    onFim: (etapa: Etapa) => void;
  },
) {
  const [execucao, setExecucao] = useState<ExecucaoAoVivo | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cb = useRef(callbacks);
  cb.current = callbacks;

  const rodar = useCallback(
    async (p: { etapa: Etapa; modo: "geracao" | "refinamento"; mensagem?: string; foco?: Foco | null }) => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setExecucao({
        etapa: p.etapa,
        modo: p.modo,
        pedido: p.mensagem ?? "",
        foco: p.foco ?? null,
        narracao: "",
        pensamento: "",
        status: p.modo === "geracao" ? "Lendo os materiais…" : "Analisando seu pedido…",
        chips: [],
        custo: 0,
        tokens: 0,
        qualidade: null,
        pendencias: null,
        resumo: null,
        erro: null,
        inicio: Date.now(),
        mensagemId: null,
      });
      const aplicar = (f: (e: ExecucaoAoVivo) => ExecucaoAoVivo) => setExecucao((x) => (x ? f(x) : x));

      try {
        const resp = await fetch(`/api/trilhas/${trilhaId}/agente`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
          signal: ctrl.signal,
        });
        if (!resp.ok || !resp.body) throw new Error((await resp.text()) || `Erro ${resp.status}`);
        const leitor = resp.body.getReader();
        const dec = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await leitor.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          const partes = buffer.split("\n\n");
          buffer = partes.pop() ?? "";
          for (const parte of partes) {
            const linha = parte.split("\n").find((l) => l.startsWith("data: "));
            if (!linha) continue;
            const e = JSON.parse(linha.slice(6)) as EventoStream;
            switch (e.tipo) {
              case "texto":
                aplicar((x) => ({ ...x, narracao: (x.narracao + e.delta).slice(-1200), status: null }));
                break;
              case "pensando":
                aplicar((x) => ({ ...x, pensamento: (x.pensamento + e.delta).slice(-600) }));
                break;
              case "escrevendo":
                aplicar((x) => ({ ...x, status: e.rotulo, pensamento: "" }));
                break;
              case "status":
                aplicar((x) => ({ ...x, status: e.texto }));
                break;
              case "tool_inicio":
                aplicar((x) => ({ ...x, status: null, chips: [...x.chips, { id: e.id, rotulo: e.rotulo, estado: "rodando" }] }));
                break;
              case "tool_fim":
                aplicar((x) => ({ ...x, chips: x.chips.map((c) => (c.id === e.id ? { ...c, estado: e.ok ? "ok" : "erro", resumo: e.resumo } : c)) }));
                break;
              case "draft":
                cb.current.onDraft(e.etapa, e.draft, e.mudancas);
                break;
              case "validacao":
                aplicar((x) => ({ ...x, pendencias: e.pendencias }));
                break;
              case "qualidade":
                aplicar((x) => ({ ...x, qualidade: e.avaliacao }));
                break;
              case "uso":
                aplicar((x) => ({
                  ...x,
                  custo: e.custo_usd,
                  tokens: e.uso.input_tokens + e.uso.output_tokens + e.uso.cache_read_tokens + e.uso.cache_write_tokens,
                }));
                break;
              case "fim":
                aplicar((x) => ({ ...x, resumo: e.resumo, status: "Salvando versão…" }));
                break;
              case "erro":
                aplicar((x) => ({ ...x, erro: e.mensagem, status: null }));
                break;
              case "salvo":
                aplicar((x) => ({ ...x, status: null, mensagemId: e.mensagemId }));
                cb.current.onFim(p.etapa);
                break;
            }
          }
        }
        aplicar((x) => (x.mensagemId || x.erro ? x : { ...x, erro: "A conexão com o agente foi encerrada antes do fim. Tente novamente.", status: null }));
      } catch (err) {
        if (!ctrl.signal.aborted) aplicar((x) => ({ ...x, erro: err instanceof Error ? err.message : String(err), status: null }));
      } finally {
        abortRef.current = null;
      }
    },
    [trilhaId],
  );

  const cancelar = useCallback(() => {
    abortRef.current?.abort();
    setExecucao(null);
  }, []);

  return { execucao, rodar, cancelar, limpar: useCallback(() => setExecucao(null), []) };
}
