import { avaliarRespostaAberta } from "@edu/ai/feedback";
import { LIMITES } from "@edu/core";
import { contextoAbertaNaPrevia, ErroAula, ErroPermissao } from "@edu/db";
import { z } from "zod";
import { criadorOuNulo } from "@/lib/sessao";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Corpo = z.object({
  blocoId: z.string().uuid(),
  resposta: z.string().trim().min(LIMITES.respostaAluno.min).max(LIMITES.respostaAluno.max),
});

/**
 * Pergunta aberta na prévia da trilha: o mesmo feedback (SSE) que o aluno recebe no app, com o
 * contexto da aula publicada, sem gravar a resposta.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string; aulaId: string }> }) {
  const e = await criadorOuNulo();
  if (!e) return new Response("Não autorizado", { status: 401 });
  const { id: trilhaId, aulaId } = await ctx.params;
  if (!z.string().uuid().safeParse(trilhaId).success || !z.string().uuid().safeParse(aulaId).success) return new Response("Aula inválida", { status: 400 });
  const corpo = Corpo.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return new Response(`Escreva uma resposta com ${LIMITES.respostaAluno.min} a ${LIMITES.respostaAluno.max} caracteres.`, { status: 400 });

  let contexto: Awaited<ReturnType<typeof contextoAbertaNaPrevia>>;
  try {
    contexto = await contextoAbertaNaPrevia(e, { trilhaId, aulaId, blocoId: corpo.data.blocoId });
  } catch (err) {
    if (err instanceof ErroPermissao || err instanceof ErroAula) return new Response(err.message, { status: 409 });
    throw err;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (ev: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch {
          // cliente desconectou
        }
      };
      try {
        for await (const ev of avaliarRespostaAberta(contexto, corpo.data.resposta, { signal: req.signal })) {
          if (ev.tipo === "texto") enviar(ev);
          else enviar({ tipo: "fim", feedback: ev.feedback });
        }
      } catch (err) {
        console.error("[prévia · pergunta aberta]", err instanceof Error ? err.message : err);
        enviar({ tipo: "erro", mensagem: "Não consegui gerar o feedback agora. Tente de novo em instantes." });
      } finally {
        try {
          controller.close();
        } catch {
          // já fechado
        }
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
}
