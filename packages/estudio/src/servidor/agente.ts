/** Agente do estúdio por SSE. O app monta: `export const POST = rotaAgente(config)`. */
import { type EventoAgente, type Foco, rodarEtapa } from "@edu/ai";
import { type Etapa, objetivoDefinido } from "@edu/core";
import {
  FonteMateriaisDb,
  finalizarExecucao,
  getEntradaAgente,
  getEstudio,
  historicoChat,
  marcarStatusEtapa,
  registrarExecucao,
  registrarMensagem,
  salvarVersao,
  tentarTravarEtapa,
} from "@edu/db";
import type { ConfigRotasEstudio, Contexto } from "./config";

const ETAPAS: Etapa[] = ["visao", "ementa", "cards", "aulas"];
const PEDIDO_GERACAO: Record<Etapa, string> = {
  visao: "Gere a visão geral a partir dos materiais e da orientação.",
  ementa: "Gere a ementa a partir da visão geral aprovada.",
  cards: "Gere os Cards de Conhecimento a partir da ementa aprovada.",
  aulas: "Gere as aulas a partir dos Cards de Conhecimento aprovados.",
};

function mensagemAmigavel(erro: string) {
  if (/credit balance/i.test(erro))
    return "Os créditos da API do agente acabaram. Recarregue a conta da Anthropic e tente novamente — nada do rascunho salvo foi perdido.";
  if (/rate.?limit|429|overloaded|529/i.test(erro)) return "O serviço de IA está sobrecarregado agora. Aguarde alguns segundos e tente de novo.";
  if (/api.?key|authentication|401/i.test(erro)) return "A chave da API do agente é inválida. Confira ANTHROPIC_API_KEY.";
  return `O agente encontrou um problema e parou: ${erro.slice(0, 200)}`;
}

export type EventoStream = EventoAgente | { tipo: "salvo"; versao: number; mensagemId: string };

/**
 * Executa o agente da etapa e transmite o progresso via Server-Sent Events.
 * body: { etapa, modo: "geracao" | "refinamento", mensagem?, foco? }
 */
export function rotaAgente<S>(cfg: ConfigRotasEstudio<S>) {
  return async function rota(req: Request, ctx: Contexto) {
    const sessao = await cfg.sessao();
    if (!sessao) return new Response("Não autorizado", { status: 401 });
    const { id: trilhaId } = await ctx.params;
    if (!(await cfg.podeAcessarTrilha(sessao, trilhaId))) return new Response("Trilha não encontrada", { status: 404 });
    const body = (await req.json()) as { etapa: Etapa; modo: "geracao" | "refinamento"; mensagem?: string; foco?: Foco | null };
    if (!ETAPAS.includes(body.etapa)) return new Response("Etapa inválida", { status: 400 });

    const estudio = await getEstudio(trilhaId);
    if (!estudio) return new Response("Trilha não encontrada", { status: 404 });
    if (!estudio.materiais.some((m) => m.status === "pronto")) return new Response("Envie ao menos um material antes.", { status: 400 });
    const bloqueio = cfg.antesDoAgente ? await cfg.antesDoAgente(sessao, trilhaId) : null;
    if (bloqueio) return new Response(bloqueio, { status: 429 });
    const perfil = await cfg.perfilIA(sessao, estudio);

    const modo = body.modo === "refinamento" ? "refinamento" : "geracao";
    // A orientação do criador delimita a trilha; sem ela o agente cobriria o material inteiro.
    if (modo === "geracao" && body.etapa === "visao" && !objetivoDefinido(estudio.trilha.orientacao_objetivo)) {
      return new Response("Descreva o objetivo da trilha antes de gerar a visão geral.", { status: 400 });
    }
    // A estrutura parte da visão aprovada pelo criador.
    if (modo === "geracao" && body.etapa === "ementa" && estudio.etapas.visao?.status !== "aprovada") {
      return new Response("Aprove a visão geral antes de gerar a ementa.", { status: 409 });
    }
    const historico = modo === "refinamento" ? await historicoChat(trilhaId, body.etapa) : [];
    const textoUsuario = modo === "refinamento" ? (body.mensagem ?? "").trim() : PEDIDO_GERACAO[body.etapa];
    if (!textoUsuario) return new Response("Mensagem vazia", { status: 400 });

    const statusAnterior = estudio.etapas[body.etapa]?.status ?? "pendente";
    // Uma execução por etapa: evita duas pessoas (ou duas abas) gerando a mesma etapa ao mesmo tempo.
    if (!(await tentarTravarEtapa(trilhaId, body.etapa))) {
      return new Response("O agente já está trabalhando nesta etapa. Aguarde terminar.", { status: 409 });
    }
    await registrarMensagem({ trilhaId, etapa: body.etapa, role: "user", texto: textoUsuario.slice(0, 4000), foco: body.foco ?? null });
    const execucao = await registrarExecucao({ trilhaId, etapa: body.etapa, tipo: modo });
    const inicio = Date.now();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fechado = false;
        const enviar = (e: EventoStream) => {
          if (fechado) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
          } catch {
            fechado = true;
          }
        };
        const pulso = setInterval(() => {
          if (!fechado) controller.enqueue(encoder.encode(`: ping\n\n`));
        }, 15000);

        try {
          const entrada = await getEntradaAgente(trilhaId);
          const r = await rodarEtapa({
            etapa: body.etapa,
            modo,
            inicial: entrada,
            fonte: new FonteMateriaisDb(trilhaId),
            emit: enviar,
            historico,
            mensagem: body.mensagem,
            foco: body.foco ?? null,
            signal: req.signal,
            contextoTrilha: entrada.contexto,
            perfil,
          });
          const snapshot = { visao: r.visao, ementa: r.ementa, cards: r.cards, aulas: r.aulas }[body.etapa];
          const versao = await salvarVersao({
            trilhaId,
            etapa: body.etapa,
            snapshot,
            autor: "agente",
            resumo: r.resumo,
            ...(r.qualidade ? { qualidade: r.qualidade } : {}),
          });
          const msg = await registrarMensagem({
            trilhaId,
            etapa: body.etapa,
            role: "assistant",
            texto: r.resumo,
            eventos: { acoes: r.acoes, mudancas: r.mudancas, qualidade: r.qualidade, custo_usd: r.custo_usd },
            versao,
          });
          await finalizarExecucao(execucao, { ok: true, modelo: r.modelo, uso: r.uso, custo: r.custo_usd, duracaoMs: Date.now() - inicio });
          enviar({ tipo: "salvo", versao, mensagemId: msg.id });
          if (modo === "geracao" && cfg.aoGerar) {
            await cfg.aoGerar(sessao, { trilhaId, etapa: body.etapa, estudio }).catch(() => {});
          }
        } catch (e) {
          const mensagem = e instanceof Error ? e.message : String(e);
          console.error("[agente]", mensagem);
          enviar({ tipo: "erro", mensagem: req.signal.aborted ? "Execução cancelada." : mensagemAmigavel(mensagem) });
          await marcarStatusEtapa(trilhaId, body.etapa, statusAnterior === "gerando" ? "pendente" : statusAnterior).catch(() => {});
          await registrarMensagem({ trilhaId, etapa: body.etapa, role: "assistant", texto: "⚠️ Não consegui concluir esta execução. Tente novamente." }).catch(
            () => {},
          );
          await finalizarExecucao(execucao, { ok: false, modelo: "", duracaoMs: Date.now() - inicio, erro: mensagem }).catch(() => {});
        } finally {
          clearInterval(pulso);
          if (!fechado) {
            fechado = true;
            controller.close();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  };
}
