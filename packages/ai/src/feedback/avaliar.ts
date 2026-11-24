import type { AnaliseAberta, ContextoAberta } from "@edu/core";
import { z } from "zod";
import { anthropic, capacidades, custoUsd, modeloFeedback, somarUso, type Uso, usoVazio } from "../modelo";
import { contextoDaPergunta, MARCADOR_ANALISE, respostaDoAluno, skillFeedback } from "./prompt";

export type EventoFeedback =
  | { tipo: "texto"; delta: string }
  | { tipo: "fim"; feedback: string; analise: AnaliseAberta | null; modelo: string; uso: Uso; custo_usd: number; duracao_ms: number };

const AnaliseSchema = z.object({
  classificacao: z.enum(["adequada", "parcial", "inadequada"]),
  criterios: z.array(z.object({ indice: z.number().int(), atendido: z.boolean() })),
});

/**
 * Separa o texto transmitido ao aluno da análise que vem depois do marcador. O marcador pode
 * chegar quebrado entre deltas, então seguramos o final do buffer até ter certeza.
 */
export class SeparadorFeedback {
  private buffer = "";
  private emitido = 0;
  private achou = false;

  /** Recebe um delta do modelo e devolve o trecho que já pode ir para o aluno. */
  push(delta: string): string {
    if (this.achou) {
      this.buffer += delta;
      return "";
    }
    this.buffer += delta;
    const i = this.buffer.indexOf(MARCADOR_ANALISE);
    let limite: number;
    if (i >= 0) {
      this.achou = true;
      limite = i;
    } else {
      // Segura um possível começo de marcador no fim do buffer.
      limite = this.buffer.length;
      for (let k = Math.min(MARCADOR_ANALISE.length - 1, this.buffer.length); k > 0; k--) {
        if (MARCADOR_ANALISE.startsWith(this.buffer.slice(-k))) {
          limite = this.buffer.length - k;
          break;
        }
      }
    }
    const saida = this.buffer.slice(this.emitido, limite);
    this.emitido = Math.max(this.emitido, limite);
    return saida;
  }

  /** Fecha o stream: devolve o que faltou transmitir, o feedback completo e a análise (ou null). */
  fim(): { resto: string; feedback: string; analise: AnaliseAberta | null } {
    const i = this.buffer.indexOf(MARCADOR_ANALISE);
    const corte = i >= 0 ? i : this.buffer.length;
    const resto = this.buffer.slice(this.emitido, corte);
    this.emitido = corte;
    return { resto, feedback: this.buffer.slice(0, corte).trim(), analise: i >= 0 ? lerAnalise(this.buffer.slice(i + MARCADOR_ANALISE.length)) : null };
  }
}

export function lerAnalise(cauda: string): AnaliseAberta | null {
  const a = cauda.indexOf("{");
  const b = cauda.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    const r = AnaliseSchema.safeParse(JSON.parse(cauda.slice(a, b + 1)));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/**
 * Feedback em tempo real para a pergunta aberta: uma única chamada em streaming (sem agente),
 * com todo o contexto da aula e o gabarito no prompt. O texto chega em deltas; o evento "fim"
 * traz o feedback completo, a análise interna e o custo.
 */
export async function* avaliarRespostaAberta(
  ctx: ContextoAberta,
  resposta: string,
  opts: { signal?: AbortSignal; modelo?: string } = {},
): AsyncGenerator<EventoFeedback> {
  const modelo = opts.modelo ?? modeloFeedback();
  const inicio = Date.now();
  const stream = anthropic().messages.stream(
    {
      model: modelo,
      // O raciocínio conta no max_tokens; esforço baixo para a primeira palavra chegar rápido.
      max_tokens: 3000,
      ...(capacidades(modelo).effort ? { output_config: { effort: "low" as const } } : {}),
      system: [{ type: "text", text: skillFeedback(ctx.criador), cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: [
            // Igual para todos os alunos desta pergunta: cacheável quando passa do mínimo do modelo.
            { type: "text", text: contextoDaPergunta(ctx), cache_control: { type: "ephemeral" } },
            { type: "text", text: respostaDoAluno(resposta) },
          ],
        },
      ],
    },
    { signal: opts.signal },
  );

  const sep = new SeparadorFeedback();
  for await (const ev of stream) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
      const t = sep.push(ev.delta.text);
      if (t) yield { tipo: "texto", delta: t };
    }
  }
  const final = await stream.finalMessage();
  const { resto, feedback, analise } = sep.fim();
  if (resto) yield { tipo: "texto", delta: resto };
  if (!feedback) throw new Error(final.stop_reason === "refusal" ? "O tutor não conseguiu comentar esta resposta." : "O tutor não devolveu feedback.");

  const uso = usoVazio();
  somarUso(uso, final.usage);
  yield { tipo: "fim", feedback, analise, modelo, uso, custo_usd: custoUsd(uso, modelo), duracao_ms: Date.now() - inicio };
}
