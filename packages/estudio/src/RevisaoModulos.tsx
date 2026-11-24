"use client";

import { cn } from "@edu/ui";
import { CheckCircle2, ChevronDown, Circle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Dica } from "./comum";

/**
 * Revisão módulo a módulo (Ementa e Cards): sanfona com só o primeiro módulo pendente aberto, check
 * "Revisado" com resposta imediata (o servidor confirma em seguida) e, ao revisar, o módulo recolhe e
 * o próximo pendente abre.
 */
export function useRevisaoModulos({
  ids,
  revisadoSalvo,
  chaveRevisoes,
  salvar,
  onErro,
}: {
  /** Módulos na ordem da tela. */
  ids: string[];
  /** O módulo está revisado segundo o que foi salvo no servidor? */
  revisadoSalvo: (id: string) => boolean;
  /** Muda quando o servidor devolve revisões novas (descarta a resposta imediata). */
  chaveRevisoes: string;
  salvar: (id: string, valor: boolean) => Promise<{ erro: string } | { ok: true }>;
  onErro: (mensagem: string) => void;
}) {
  const [abertos, setAbertos] = useState<Set<string>>(() => {
    const primeiro = ids.find((id) => !revisadoSalvo(id)) ?? ids[0];
    return new Set(primeiro ? [primeiro] : []);
  });
  const alternar = (id: string) =>
    setAbertos((a) => {
      const n = new Set(a);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const abrir = (id: string) => setAbertos((a) => (a.has(id) ? a : new Set(a).add(id)));

  const [marcando, iniciar] = useTransition();
  const [otimista, setOtimista] = useState<Record<string, boolean>>({});
  // biome-ignore lint/correctness/useExhaustiveDependencies: descarta o estado otimista quando as revisões salvas mudam
  useEffect(() => setOtimista({}), [chaveRevisoes]);
  const revisado = (id: string) => otimista[id] ?? revisadoSalvo(id);

  const marcar = (id: string, valor: boolean) => {
    setOtimista((o) => ({ ...o, [id]: valor }));
    if (valor) {
      const i = ids.indexOf(id);
      const proximo = ids.find((x, j) => j > i && !revisado(x)) ?? ids.find((x) => x !== id && !revisado(x));
      setAbertos((a) => {
        const n = new Set(a);
        n.delete(id);
        if (proximo) n.add(proximo);
        return n;
      });
    }
    iniciar(async () => {
      const r = await salvar(id, valor);
      if ("erro" in r) {
        onErro(r.erro);
        setOtimista((o) => ({ ...o, [id]: !valor }));
      }
    });
  };

  return { aberto: (id: string) => abertos.has(id), alternar, abrir, revisado, marcar, marcando, revisados: ids.filter(revisado).length };
}

/** "Você revisou X de N módulos": substitui qualquer outro andamento da etapa. */
export function ProgressoRevisao({ revisados, total, depois }: { revisados: number; total: number; depois: string }) {
  if (!total) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 px-1" data-tour="estudio-progresso">
      <div className="text-sm font-bold">Módulos</div>
      <div className="flex items-center gap-2 text-xs text-suave">
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-linha">
          <div className="h-full rounded-full bg-verde transition-all" style={{ width: `${(revisados / total) * 100}%` }} />
        </div>
        {revisados === total ? (
          <span className="font-semibold text-verde">
            Você revisou todos os {total} módulos. Já pode gerar {depois}.
          </span>
        ) : (
          <span>
            Você revisou {revisados} de {total} módulos. Marque cada um como revisado para gerar {depois}.
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Cabeçalho do módulo na sanfona: código (M1…) com dica, "Módulo N", título e ações na mesma linha, e a
 * descrição embaixo com a largura toda. Clicar no cabeçalho abre/fecha; com o módulo aberto, clicar em
 * texto editável continua editando.
 */
export function CabecalhoModulo({
  id,
  numero,
  titulo,
  descricao,
  dicaCodigo,
  aberto,
  onAlternar,
  revisado,
  onRevisado,
  revisaoBloqueada,
  motivoBloqueio,
  rotuloAbrir,
  acoes,
}: {
  id: string;
  numero: number;
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  dicaCodigo: React.ReactNode;
  aberto: boolean;
  onAlternar: () => void;
  revisado: boolean;
  onRevisado: () => void;
  revisaoBloqueada?: boolean;
  motivoBloqueio?: string;
  /** Ex.: "Ver tópicos", "Ver cards". */
  rotuloAbrir: string;
  /** Botões extras antes do check (ex.: comentar com o Edu). */
  acoes?: React.ReactNode;
}) {
  return (
    <div
      data-tour={numero === 1 ? "estudio-modulo" : undefined}
      className={cn("group cursor-pointer bg-fundo/60 px-6 py-4 transition hover:bg-marca-50/50", aberto && "border-b border-linha")}
      onClickCapture={(e) => {
        const alvo = e.target as HTMLElement;
        if (alvo.closest("[data-acao-modulo]") || (aberto && alvo.closest("[data-editavel]"))) return;
        e.stopPropagation();
        onAlternar();
      }}
    >
      <div className="flex items-start gap-3">
        <Dica alinhar="inicio" focavel={false} texto={dicaCodigo}>
          <button
            type="button"
            onClick={onAlternar}
            aria-expanded={aberto}
            aria-label={`${aberto ? "Recolher" : "Abrir"} o módulo ${numero}`}
            className="gradiente-marca grid size-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white"
          >
            {id}
          </button>
        </Dica>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <button type="button" onClick={onAlternar} className="text-[11px] font-bold uppercase tracking-wide text-marca-700 hover:underline">
                Módulo {numero}
              </button>
              <div className="font-bold">{titulo}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2" data-acao-modulo>
              {acoes}
              {/* biome-ignore lint/a11y/useSemanticElements: chip clicável; aria-checked comunica o estado */}
              <button
                type="button"
                role="checkbox"
                aria-checked={revisado}
                disabled={revisaoBloqueada}
                title={motivoBloqueio}
                onClick={onRevisado}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
                  revisado
                    ? "border-verde bg-verde text-white hover:brightness-105"
                    : "border-linha bg-superficie text-tinta-2 hover:border-verde hover:text-verde",
                )}
              >
                {revisado ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                {revisado ? "Revisado" : "Marcar como revisado"}
              </button>
              <button
                type="button"
                onClick={onAlternar}
                aria-expanded={aberto}
                className="flex shrink-0 items-center gap-1 rounded-full border border-linha bg-superficie px-3 py-1.5 text-xs font-bold text-tinta-2 transition hover:border-marca-300 hover:text-marca-700"
              >
                {aberto ? "Recolher" : rotuloAbrir}
                <ChevronDown className={cn("size-4 transition", aberto && "rotate-180")} />
              </button>
            </div>
          </div>
          {descricao && <div className="mt-1 text-sm text-suave">{descricao}</div>}
        </div>
      </div>
    </div>
  );
}
