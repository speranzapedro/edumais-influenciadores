import { avaliarRespostaAberta } from "@edu/ai/feedback";
import { LIMITES } from "@edu/core";
import type { Usuario } from "@edu/db";
import { ErroAula, prepararPerguntaAberta, registrarRespostaAberta } from "@edu/db";
import { z } from "zod";

/** Eventos do stream da pergunta aberta (consumidos pelo CartaoAberta). */
export type EventoAberta = { tipo: "texto"; delta: string } | { tipo: "fim"; feedback: string; jaRegistrada?: boolean } | { tipo: "erro"; mensagem: string };

const Corpo = z.object({
  blocoId: z.string().uuid(),
  tentativa: z.string().uuid(),
  resposta: z.string().trim().min(LIMITES.respostaAluno.min).max(LIMITES.respostaAluno.max),
});

function mensagemAmigavel(erro: unknown) {
  const s = erro instanceof Error ? erro.message : String(erro);
  if (/rate.?limit|429|overloaded|529/i.test(s)) return "O tutor está com muitos pedidos agora. Aguarde alguns segundos e envie de novo.";
  return "Não consegui gerar o feedback agora. Sua resposta não foi perdida: tente enviar de novo.";
}

/**
 * Feedback em tempo real da pergunta aberta (SSE). Envio único por tentativa: um reenvio devolve o
 * feedback já salvo. Se a IA falhar, nada é gravado e o aluno pode tentar de novo.
 */
export function rotaAberta(cfg: { sessao(): Promise<Usuario | null> }) {
  return async function rota(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const aluno = await cfg.sessao();
    if (!aluno) return new Response("Não autorizado", { status: 401 });
    const { id: aulaId } = await ctx.params;
    if (!z.string().uuid().safeParse(aulaId).success) return new Response("Aula inválida", { status: 400 });
    const corpo = Corpo.safeParse(await req.json().catch(() => null));
    if (!corpo.success) {
      return new Response(`Escreva uma resposta com ${LIMITES.respostaAluno.min} a ${LIMITES.respostaAluno.max} caracteres.`, { status: 400 });
    }
    const { blocoId, tentativa, resposta } = corpo.data;

    let preparo: Awaited<ReturnType<typeof prepararPerguntaAberta>>;
    try {
      preparo = await prepararPerguntaAberta({ aluno, aulaId, blocoId, tentativa });
    } catch (e) {
      if (e instanceof ErroAula) return new Response(e.message, { status: 409 });
      throw e;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enviar = (e: EventoAberta) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
          } catch {
            // cliente desconectou
          }
        };
        try {
          if (preparo.tipo === "registrada") {
            enviar({ tipo: "fim", feedback: preparo.feedback, jaRegistrada: true });
            return;
          }
          for await (const ev of avaliarRespostaAberta(preparo.contexto, resposta, { signal: req.signal })) {
            if (ev.tipo === "texto") {
              enviar(ev);
              continue;
            }
            await registrarRespostaAberta({
              aluno,
              aulaId,
              bloco: preparo.bloco,
              tentativa,
              modo: preparo.modo,
              resposta,
              feedback: ev.feedback,
              analise: ev.analise,
              modelo: ev.modelo,
              uso: { entrada: ev.uso.input_tokens, saida: ev.uso.output_tokens, cache: ev.uso.cache_read_tokens + ev.uso.cache_write_tokens },
              custoUsd: ev.custo_usd,
              duracaoMs: ev.duracao_ms,
            });
            enviar({ tipo: "fim", feedback: ev.feedback });
          }
        } catch (e) {
          console.error("[pergunta aberta]", e instanceof Error ? e.message : e);
          enviar({ tipo: "erro", mensagem: mensagemAmigavel(e) });
        } finally {
          try {
            controller.close();
          } catch {
            // já fechado
          }
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
    });
  };
}
