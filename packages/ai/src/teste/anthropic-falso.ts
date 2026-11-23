import type Anthropic from "@anthropic-ai/sdk";

/** Chamada de tool que o "modelo" falso faz num turno. */
export interface ChamadaFalsa {
  nome: string;
  input: unknown;
}

/** Um turno do agente: as tools chamadas e o texto final da mensagem. */
export interface TurnoFalso {
  chamadas?: ChamadaFalsa[];
  texto?: string;
  stopReason?: "end_turn" | "tool_use" | "refusal" | "max_tokens";
}

const usoFalso = { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };

function mensagem(texto: string, stopReason: TurnoFalso["stopReason"] = "end_turn") {
  return { content: texto ? [{ type: "text", text: texto }] : [], stop_reason: stopReason, usage: usoFalso };
}

type ToolExecutavel = { name: string; run: (input: unknown) => unknown };

/**
 * Cliente da API Anthropic sem rede, para testes. Cada lista é consumida em ordem:
 * - `rodadas`: execuções do toolRunner do agente (uma por rodada de correção), cada uma com seus turnos;
 * - `respostas`: textos de `messages.create`/`beta.messages.create` (visão geral, revisor, tutor);
 * - `fluxos`: textos de `messages.stream` (feedback e tutor), entregues em pedaços.
 * Também guarda os parâmetros recebidos para o teste conferir prompts.
 */
export function clienteAnthropicFalso(roteiro: { rodadas?: TurnoFalso[][]; respostas?: string[]; fluxos?: string[]; stopReason?: TurnoFalso["stopReason"] }) {
  const rodadas = [...(roteiro.rodadas ?? [])];
  const respostas = [...(roteiro.respostas ?? [])];
  const fluxos = [...(roteiro.fluxos ?? [])];
  const chamadas: { tipo: "runner" | "create" | "stream"; params: Record<string, unknown> }[] = [];

  const create = async (params: Record<string, unknown>) => {
    chamadas.push({ tipo: "create", params });
    const texto = respostas.shift();
    if (texto === undefined) throw new Error("Cliente falso: nenhuma resposta restante para messages.create.");
    return mensagem(texto, roteiro.stopReason);
  };

  const stream = (params: Record<string, unknown>) => {
    chamadas.push({ tipo: "stream", params });
    const texto = fluxos.shift() ?? "";
    const pedacos = texto.match(/.{1,12}/gs) ?? [];
    const ouvintes: Record<string, ((x: string) => void)[]> = {};
    return {
      on(evento: string, f: (x: string) => void) {
        ouvintes[evento] ??= [];
        ouvintes[evento].push(f);
        return this;
      },
      async *[Symbol.asyncIterator]() {
        for (const p of pedacos) {
          for (const f of ouvintes.text ?? []) f(p);
          yield { type: "content_block_delta", delta: { type: "text_delta", text: p } };
        }
      },
      async finalMessage() {
        return mensagem(texto, roteiro.stopReason);
      },
    };
  };

  const toolRunner = (params: { tools: ToolExecutavel[]; messages: unknown[] }) => {
    chamadas.push({ tipo: "runner", params: params as unknown as Record<string, unknown> });
    const turnos = rodadas.shift() ?? [{ texto: "Pronto." }];
    const porNome = new Map(params.tools.map((t) => [t.name, t]));
    return {
      params,
      async *[Symbol.asyncIterator]() {
        for (const turno of turnos) {
          for (const c of turno.chamadas ?? []) {
            const tool = porNome.get(c.nome);
            if (!tool) throw new Error(`Cliente falso: tool ${c.nome} não existe nesta etapa.`);
            try {
              await tool.run(c.input);
            } catch {
              // O runner real devolve o erro ao modelo e segue; o falso também.
            }
          }
          const fim = turno.stopReason ?? (turno.chamadas?.length ? "tool_use" : "end_turn");
          const ouvintes: Record<string, ((x: unknown) => void)[]> = {};
          yield {
            on(evento: string, f: (x: unknown) => void) {
              ouvintes[evento] ??= [];
              ouvintes[evento].push(f);
            },
            async finalMessage() {
              for (const f of ouvintes.streamEvent ?? []) f({ type: "message_start" });
              if (turno.texto) for (const f of ouvintes.text ?? []) f(turno.texto);
              return mensagem(turno.texto ?? "", fim);
            },
          };
        }
      },
    };
  };

  const cliente = {
    messages: { create, stream },
    beta: { messages: { create, toolRunner } },
  };
  return { cliente: cliente as unknown as Anthropic, chamadas };
}
