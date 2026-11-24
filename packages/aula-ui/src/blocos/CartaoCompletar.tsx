import type { BlocoCompletarAluno, CorrecaoCompletar } from "@edu/core";
import { cn } from "@edu/ui";
import { Explicacao, MolduraDesafio } from "./comum";

/**
 * Completar lacunas: tocar numa opção preenche a próxima lacuna vazia; tocar numa lacuna preenchida
 * devolve a palavra para as opções. `lacunas[k]` é o índice (em `bloco.opcoes`) da palavra na lacuna k.
 */
export function CartaoCompletar({
  bloco,
  lacunas,
  correcao,
  bloqueado,
  onMudar,
}: {
  bloco: BlocoCompletarAluno;
  lacunas: (number | null)[];
  correcao: CorrecaoCompletar | null;
  bloqueado: boolean;
  onMudar: (lacunas: (number | null)[]) => void;
}) {
  const travado = bloqueado || !!correcao;
  const usadas = new Set(lacunas.filter((x): x is number => x !== null));
  const partes = bloco.texto.split(/\[\[(\d+)\]\]/);

  const escolher = (opcao: number) => {
    const k = lacunas.indexOf(null);
    if (travado || k < 0) return;
    onMudar(lacunas.map((x, i) => (i === k ? opcao : x)));
  };
  const limpar = (k: number) => {
    if (travado) return;
    onMudar(lacunas.map((x, i) => (i === k ? null : x)));
  };

  return (
    <MolduraDesafio rotulo="Complete a frase" errou={!!correcao && !correcao.correta}>
      <p className="text-[17px] font-semibold leading-[2.3]">
        {partes.map((p, i) => {
          if (i % 2 === 0) return <span key={i}>{p}</span>;
          const k = Number(p) - 1;
          const escolhida = lacunas[k];
          const certa = correcao?.porLacuna[k];
          return (
            <span key={i} className="inline-flex flex-col items-center align-middle">
              <button
                type="button"
                onClick={() => limpar(k)}
                disabled={travado || escolhida === null}
                aria-label={escolhida === null ? `Lacuna ${k + 1} vazia` : `Lacuna ${k + 1}: ${bloco.opcoes[escolhida]} (toque para remover)`}
                className={cn(
                  "mx-1 inline-flex min-h-8 min-w-14 items-center justify-center rounded-lg px-2.5 text-[15px] font-semibold leading-tight transition",
                  escolhida === null && "border-2 border-dashed border-linha bg-fundo",
                  escolhida !== null && correcao === null && "bg-marca-50 text-marca-700",
                  certa === true && "bg-verde-bg text-[#11733f] ring-2 ring-verde",
                  certa === false && "bg-vermelho-bg text-[#b42323] line-through ring-2 ring-vermelho",
                )}
              >
                {escolhida !== null ? bloco.opcoes[escolhida] : " "}
              </button>
              {certa === false && <span className="-mt-1 text-[12px] font-bold leading-none text-[#11733f]">{correcao?.respostasCorretas[k]}</span>}
            </span>
          );
        })}
      </p>

      {!correcao && <div className="mt-4 text-[13px] font-medium text-suave">Toque numa opção para preencher as lacunas:</div>}
      <div className="mt-2.5 flex flex-wrap gap-2.5">
        {bloco.opcoes.map((o, i) => {
          const usada = usadas.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => escolher(i)}
              disabled={travado || usada}
              className={cn(
                "rounded-xl border-2 border-b-4 px-3.5 py-2 text-[15px] font-medium transition",
                usada
                  ? "border-linha bg-fundo text-transparent"
                  : "border-linha bg-superficie hover:border-marca-300 hover:bg-marca-50 active:translate-y-0.5 active:border-b-2",
                travado && !usada && "opacity-60",
              )}
            >
              {o}
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
