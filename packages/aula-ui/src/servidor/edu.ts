import { type FimTutor, fontesDaResposta, MAX_TROCAS_HISTORICO, responderTutor } from "@edu/ai/tutor";
import { ConsultorTutorDb, ErroEdu, type FonteEdu, prepararPerguntaEdu, registrarTrocaEdu, type Usuario } from "@edu/db";
import { z } from "zod";

/** Eventos do stream do Edu (consumidos pelo PainelEdu). */
export type EventoEdu =
  | { tipo: "texto"; delta: string }
  | { tipo: "fim"; resposta: string; fontes: FonteEdu[]; relacionado: boolean; geral: boolean; mensagemId: string; conversaId: string; restantes: number }
  | { tipo: "erro"; mensagem: string };

const Corpo = z.object({
  pergunta: z.string().trim().min(2).max(500),
  conversaId: z.string().uuid().nullable(),
  aulaId: z.string().uuid().nullable(),
});

function mensagemAmigavel(erro: unknown) {
  const s = erro instanceof Error ? erro.message : String(erro);
  if (/rate.?limit|429|overloaded|529/i.test(s)) return "O Edu está com muitos pedidos agora. Espere alguns segundos e pergunte de novo.";
  return "Não consegui responder agora. Sua pergunta não foi contada: tente de novo.";
}

/**
 * Pergunta ao Edu (SSE): valida acesso e limite, busca na trilha e transmite a resposta. A troca só é
 * gravada (e só conta no limite do dia) quando a resposta chega inteira.
 */
export function rotaEdu(cfg: { sessao(): Promise<Usuario | null> }) {
  return async function rota(req: Request, ctx: { params: Promise<{ trilhaId: string }> }) {
    const aluno = await cfg.sessao();
    if (!aluno) return new Response("Não autorizado", { status: 401 });
    const { trilhaId } = await ctx.params;
    if (!z.string().uuid().safeParse(trilhaId).success) return new Response("Trilha inválida", { status: 400 });
    const corpo = Corpo.safeParse(await req.json().catch(() => null));
    if (!corpo.success) return new Response("Escreva uma pergunta com até 500 caracteres.", { status: 400 });
    const { pergunta, conversaId, aulaId } = corpo.data;

    let preparo: Awaited<ReturnType<typeof prepararPerguntaEdu>>;
    try {
      preparo = await prepararPerguntaEdu({ aluno, trilhaId, conversaId, aulaId, historico: MAX_TROCAS_HISTORICO });
    } catch (e) {
      if (e instanceof ErroEdu) return new Response(e.message, { status: 409 });
      throw e;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enviar = (e: EventoEdu) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
          } catch {
            // cliente desconectou
          }
        };
        try {
          let fim: FimTutor | null = null;
          for await (const ev of responderTutor({
            consultor: new ConsultorTutorDb(),
            trilha: preparo.trilha,
            historico: preparo.historico,
            pergunta,
            aulaAtual: preparo.aulaAtual,
            signal: req.signal,
          })) {
            if (ev.tipo === "texto") enviar(ev);
            else if (ev.tipo === "fim") fim = ev;
          }
          if (!fim) throw new Error("Resposta incompleta.");
          const fontes = fontesDaResposta(fim.citacoes);
          const mensagemId = await registrarTrocaEdu({
            aluno,
            trilhaId,
            conversaId: preparo.conversaId,
            aulaId: preparo.aulaId ?? fontes.find((f) => f.aulaId)?.aulaId ?? null,
            pergunta,
            resposta: fim.resposta,
            detalhes: {
              consulta: fim.consulta,
              trechos: fim.trechos,
              citacoes: fim.citacoes,
              fontes,
              relacionado: fim.confiancaBaixa,
              confiancaBaixa: fim.confiancaBaixa,
              conhecimentoGeral: fim.conhecimentoGeral,
              recusada: fim.recusada,
            },
            uso: { modelo: fim.modelo, custo_usd: fim.custo_usd, ms: fim.ms, tokens: fim.uso },
          });
          enviar({
            tipo: "fim",
            resposta: fim.resposta,
            fontes,
            relacionado: fim.confiancaBaixa,
            geral: fim.conhecimentoGeral,
            mensagemId,
            conversaId: preparo.conversaId,
            restantes: preparo.restantesDepois,
          });
        } catch (e) {
          if (!req.signal.aborted) console.error("[edu] falha ao responder:", e);
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
