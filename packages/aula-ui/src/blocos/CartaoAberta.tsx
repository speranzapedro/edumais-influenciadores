import { type BlocoAbertaAluno, LIMITES } from "@edu/core";
import { cn, TextoComNegrito } from "@edu/ui";
import { History, Lightbulb, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export interface EstadoAberta {
  texto: string;
  status: "editando" | "enviando" | "pronto" | "erro";
  /** Resposta enviada (fica fixa acima do feedback). */
  enviada: string;
  feedback: string;
  falhas: number;
  erro: string | null;
}

export const estadoAbertaInicial = (): EstadoAberta => ({ texto: "", status: "editando", enviada: "", feedback: "", falhas: 0, erro: null });

/** Pergunta aberta: o fã escreve, envia uma vez e recebe o feedback do tutor em tempo real. */
export function CartaoAberta({
  bloco,
  estado,
  anterior,
  onTexto,
}: {
  bloco: BlocoAbertaAluno;
  estado: EstadoAberta;
  anterior?: { resposta: string; feedback: string };
  onTexto: (texto: string) => void;
}) {
  const editavel = estado.status === "editando" || estado.status === "erro";
  const n = estado.texto.trim().length;
  return (
    <div className="rounded-card border-2 border-marca-100 bg-superficie p-5 shadow-card">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-marca-600">
        <Sparkles className="size-3.5" /> Pergunta aberta
      </div>
      <p className="text-[17px] font-bold leading-snug">{bloco.pergunta}</p>
      {bloco.dica && (
        <div className="mt-3 flex gap-2.5 rounded-2xl bg-ambar-bg px-3.5 py-2.5 text-sm leading-snug text-[#8a6100]">
          <Lightbulb className="mt-0.5 size-4 shrink-0" />
          <span>{bloco.dica}</span>
        </div>
      )}

      {anterior && editavel && (
        <details className="mt-3 rounded-2xl bg-fundo px-3.5 py-2.5 text-sm">
          <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-suave">
            <History className="size-3.5" /> Sua resposta da última vez
          </summary>
          <p className="mt-2 italic text-tinta">“{anterior.resposta}”</p>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-suave">
            <TextoComNegrito texto={anterior.feedback} />
          </p>
        </details>
      )}

      {editavel ? (
        <div className="mt-4">
          <textarea
            value={estado.texto}
            onChange={(e) => onTexto(e.target.value.slice(0, LIMITES.respostaAluno.max))}
            rows={4}
            placeholder="Escreva com suas palavras o que você faria e por quê…"
            className="w-full resize-none rounded-2xl border-2 border-linha bg-superficie px-3.5 py-3 text-[15px] leading-relaxed outline-none transition focus:border-marca-300"
          />
          <div className="mt-1 flex justify-between text-[12px] text-suave">
            <span>
              {n < LIMITES.respostaAluno.min ? `Escreva pelo menos ${LIMITES.respostaAluno.min} caracteres` : "Você recebe um feedback do Edu ao enviar"}
            </span>
            <span>
              {estado.texto.length}/{LIMITES.respostaAluno.max}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="ml-6 rounded-2xl rounded-br-md bg-marca-50 px-4 py-3 text-[15px] leading-relaxed text-tinta">{estado.enviada}</div>
          {/* Alvo da rolagem automática do player: mostra o começo do feedback, não o fim. */}
          <motion.div
            data-rolagem-alvo
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl rounded-bl-md border border-marca-100 bg-fundo px-4 py-3"
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-marca-600">
              <Sparkles className="size-3.5" /> Feedback do Edu
            </div>
            {estado.feedback ? (
              <p
                className={cn(
                  "whitespace-pre-line text-[15px] leading-relaxed text-tinta",
                  estado.status === "enviando" && "after:ml-0.5 after:animate-pulse after:content-['▍']",
                )}
              >
                <TextoComNegrito texto={estado.feedback} />
              </p>
            ) : (
              <div className="flex items-center gap-1.5 py-1 text-sm text-suave" aria-live="polite">
                Analisando sua resposta
                <span className="inline-flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="size-1.5 rounded-full bg-marca-400"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      )}
      {estado.status === "erro" && estado.erro && <div className="mt-2 text-sm font-semibold text-vermelho">{estado.erro}</div>}
    </div>
  );
}
