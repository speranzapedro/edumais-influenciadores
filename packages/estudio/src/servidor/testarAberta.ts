import { avaliarRespostaAberta } from "@edu/ai/feedback";
import { AulaSchema, LIMITES, montarContextoAberta } from "@edu/core";
import { getEntradaAgente, getEstudio } from "@edu/db";
import { z } from "zod";
import type { ConfigRotasEstudio, Contexto } from "./config";

const Corpo = z.object({
  // A aula vem do rascunho local do estúdio: testa inclusive edições ainda não salvas no gabarito.
  aula: AulaSchema,
  blocoId: z.string(),
  resposta: z.string().trim().min(LIMITES.respostaAluno.min).max(LIMITES.respostaAluno.max),
});

/** "Testar como fã": gera o feedback que o fã receberia, sem gravar nada. */
export function rotaTestarAberta<S>(cfg: ConfigRotasEstudio<S>) {
  return async function rota(req: Request, ctx: Contexto) {
    const s = await cfg.sessao();
    if (!s) return new Response("Não autorizado", { status: 401 });
    const { id: trilhaId } = await ctx.params;
    if (!(await cfg.podeAcessarTrilha(s, trilhaId))) return new Response("Trilha não encontrada", { status: 404 });
    const corpo = Corpo.safeParse(await req.json().catch(() => null));
    if (!corpo.success)
      return new Response(`Escreva uma resposta com ${LIMITES.respostaAluno.min} a ${LIMITES.respostaAluno.max} caracteres.`, { status: 400 });

    const [estudio, entrada] = await Promise.all([getEstudio(trilhaId), getEntradaAgente(trilhaId)]);
    if (!estudio) return new Response("Trilha não encontrada", { status: 404 });
    let contexto: ReturnType<typeof montarContextoAberta>;
    try {
      contexto = montarContextoAberta({
        criador: await cfg.perfilIA(s, estudio),
        produto: estudio.produto.nome,
        trilha: estudio.trilha.titulo,
        ementa: entrada.ementa,
        cards: entrada.cards.cards,
        aula: corpo.data.aula,
        blocoId: corpo.data.blocoId,
      });
    } catch (e) {
      return new Response(e instanceof Error ? e.message : "Pergunta inválida.", { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enviar = (e: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        try {
          for await (const ev of avaliarRespostaAberta(contexto, corpo.data.resposta, { signal: req.signal })) {
            if (ev.tipo === "texto") enviar(ev);
            else enviar({ tipo: "fim", feedback: ev.feedback, classificacao: ev.analise?.classificacao ?? null, custo_usd: ev.custo_usd });
          }
        } catch (e) {
          console.error("[testar-aberta]", e instanceof Error ? e.message : e);
          enviar({ tipo: "erro", mensagem: "Não consegui gerar o feedback agora. Tente de novo em instantes." });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform" } });
  };
}
