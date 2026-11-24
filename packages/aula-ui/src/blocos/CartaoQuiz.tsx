import type { BlocoQuizAluno, CorrecaoQuiz } from "@edu/core";
import { cn } from "@edu/ui";
import { Loader2 } from "lucide-react";
import { Explicacao, MolduraDesafio } from "./comum";

const LETRAS = ["A", "B", "C", "D", "E", "F"];

/** A escolha é imediata; a correção chega do servidor. */
export function CartaoQuiz({
  bloco,
  escolha,
  correcao,
  onEscolher,
}: {
  bloco: BlocoQuizAluno;
  escolha: number | undefined;
  correcao: CorrecaoQuiz | null;
  onEscolher: (i: number) => void;
}) {
  const respondido = escolha !== undefined;
  return (
    <MolduraDesafio rotulo="Desafio" errou={!!correcao && !correcao.correta}>
      <p className="text-[17px] font-bold leading-snug">{bloco.pergunta}</p>
      <div className="mt-4 space-y-2.5">
        {bloco.opcoes.map((o, i) => {
          const marcada = escolha === i;
          const mostrarCerta = !!correcao && correcao.indiceCorreto === i;
          const errada = !!correcao && marcada && !correcao.correta;
          const verificando = marcada && !correcao;
          return (
            <button
              type="button"
              key={i}
              disabled={respondido}
              onClick={() => onEscolher(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 px-3.5 py-3 text-left text-[15px] font-medium transition",
                !respondido && "border-linha bg-superficie hover:border-marca-300 hover:bg-marca-50 active:translate-y-0.5 active:border-b-2",
                respondido && !marcada && !mostrarCerta && "border-linha bg-superficie opacity-60",
                verificando && "border-marca-300 bg-marca-50",
                mostrarCerta && "border-verde bg-verde-bg text-[#11733f]",
                errada && "border-vermelho bg-vermelho-bg text-[#b42323]",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg border-2 text-xs font-bold",
                  mostrarCerta
                    ? "border-verde bg-verde text-white"
                    : errada
                      ? "border-vermelho bg-vermelho text-white"
                      : verificando
                        ? "border-marca-400 text-marca-600"
                        : "border-linha text-suave",
                )}
              >
                {verificando ? <Loader2 className="size-3.5 animate-spin" /> : LETRAS[i]}
              </span>
              <span className="flex-1">{o.texto}</span>
            </button>
          );
        })}
      </div>
      <Explicacao visivel={!!correcao} correta={!!correcao?.correta}>
        {correcao?.feedback}
      </Explicacao>
    </MolduraDesafio>
  );
}
