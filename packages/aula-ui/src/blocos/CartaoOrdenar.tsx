import type { BlocoOrdenarAluno, CorrecaoOrdenar } from "@edu/core";
import { cn } from "@edu/ui";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { Explicacao, MolduraDesafio } from "./comum";

/**
 * Ordenar passos: arrastar pela alça (funciona no toque) ou usar as setas. `ordem[k]` é o índice
 * (em `bloco.passos`, como o aluno recebeu) do passo que está na posição k.
 */
export function CartaoOrdenar({
  bloco,
  ordem,
  correcao,
  bloqueado,
  onMudar,
}: {
  bloco: BlocoOrdenarAluno;
  ordem: number[];
  correcao: CorrecaoOrdenar | null;
  bloqueado: boolean;
  onMudar: (ordem: number[]) => void;
}) {
  const travado = bloqueado || !!correcao;
  const mover = (k: number, d: -1 | 1) => {
    const alvo = k + d;
    if (travado || alvo < 0 || alvo >= ordem.length) return;
    const nova = [...ordem];
    [nova[k], nova[alvo]] = [nova[alvo], nova[k]];
    onMudar(nova);
  };

  return (
    <MolduraDesafio rotulo="Coloque em ordem" errou={!!correcao && !correcao.correta}>
      <p className="text-[17px] font-bold leading-snug">{bloco.instrucao}</p>
      {!correcao && <div className="mt-1 text-[13px] font-medium text-suave">Arraste os passos pela alça ou use as setas.</div>}
      <Reorder.Group axis="y" values={ordem} onReorder={(v) => !travado && onMudar(v)} className="mt-4 space-y-2.5">
        {ordem.map((i, k) => (
          <Passo
            key={i}
            valor={i}
            posicao={k}
            texto={bloco.passos[i]}
            total={ordem.length}
            travado={travado}
            certo={correcao ? correcao.posicoesCertas[k] : undefined}
            onMover={(d) => mover(k, d)}
          />
        ))}
      </Reorder.Group>

      <Explicacao visivel={!!correcao} correta={!!correcao?.correta}>
        {correcao && !correcao.correta && (
          <ol className="mb-2 list-decimal space-y-0.5 pl-5 font-semibold">
            {correcao.ordemCorreta.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        )}
        {correcao?.feedback}
      </Explicacao>
    </MolduraDesafio>
  );
}

function Passo({
  valor,
  posicao,
  texto,
  total,
  travado,
  certo,
  onMover,
}: {
  valor: number;
  posicao: number;
  texto: string;
  total: number;
  travado: boolean;
  certo: boolean | undefined;
  onMover: (d: -1 | 1) => void;
}) {
  const controles = useDragControls();
  return (
    <Reorder.Item value={valor} dragListener={false} dragControls={controles} className="flex items-center gap-2.5">
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
          certo === true ? "bg-verde text-white" : certo === false ? "bg-vermelho text-white" : "bg-fundo text-suave",
        )}
      >
        {posicao + 1}
      </span>
      <div
        className={cn(
          "flex flex-1 items-center gap-2 rounded-2xl border-2 bg-superficie py-2.5 pl-2 pr-1.5 text-[15px] font-medium leading-snug",
          certo === true ? "border-verde bg-verde-bg" : certo === false ? "border-vermelho bg-vermelho-bg" : "border-linha",
        )}
      >
        <button
          type="button"
          aria-label="Arrastar"
          disabled={travado}
          onPointerDown={(e) => !travado && controles.start(e)}
          className="shrink-0 cursor-grab touch-none p-1 text-suave active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="flex-1">{texto}</span>
        {/* Travado, as setas somem mas guardam o lugar: o texto não muda de largura e o cartão não encolhe (a tela não pula). */}
        <span className={cn("flex shrink-0 flex-col", travado && "invisible")} aria-hidden={travado}>
          <button
            type="button"
            aria-label="Subir"
            disabled={travado || posicao === 0}
            onClick={() => onMover(-1)}
            className="rounded p-0.5 text-suave hover:bg-marca-50 disabled:opacity-30"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Descer"
            disabled={travado || posicao === total - 1}
            onClick={() => onMover(1)}
            className="rounded p-0.5 text-suave hover:bg-marca-50 disabled:opacity-30"
          >
            <ChevronDown className="size-4" />
          </button>
        </span>
      </div>
    </Reorder.Item>
  );
}
