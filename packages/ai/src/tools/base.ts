import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import { desescaparProfundo, type Pendencia } from "@edu/core";
import type { z } from "zod";
import type { AcaoRegistrada, AvaliacaoQualidade, Emissor } from "../eventos";
import type { FonteMateriais } from "../materiais";
import type { Workspace } from "../workspace";

export interface ContextoTools {
  ws: Workspace;
  fonte: FonteMateriais;
  emit: Emissor;
  acoes: AcaoRegistrada[];
  /** Revisor pedagógico (chamada separada ao modelo). */
  revisar: (foco: string | null) => Promise<AvaliacaoQualidade>;
  revisoes: { feitas: number; limite: number; ultima: AvaliacaoQualidade | null };
  /** Para os workers de aulas: módulo pelo qual esta execução responde. */
  escopoModulo: string | null;
  /** Prefixo dos ids gerados nesta execução (workers paralelos não podem colidir). */
  prefixoIds: string;
  rotular: (nome: string, input: unknown) => string;
}

// biome-ignore lint/suspicious/noExplicitAny: cada tool tem o próprio schema de entrada; o SDK só precisa do formato comum.
export type Ferramenta = BetaRunnableTool<any>;

/**
 * Cria uma tool do agente: valida a entrada com Zod, emite eventos de início/fim para a UI
 * (chips "🔎 buscou…", "✅ cobertura 100%"), registra a ação e publica o rascunho se a tool
 * alterou algo. Acentos que o modelo manda escapados (`\u00e7` literal) são decodificados
 * antes de a tool rodar, para não chegarem ao rascunho nem ao aluno.
 */
export function ferramenta<S extends z.ZodType>(
  ctx: ContextoTools,
  def: {
    name: string;
    description: string;
    inputSchema: S;
    altera?: boolean;
    run: (input: z.infer<S>) => string | Promise<string>;
  },
): Ferramenta {
  return betaZodTool({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
    run: async (bruto, runCtx) => {
      const input = desescaparProfundo(bruto);
      const id = runCtx?.toolUse?.id ?? `${def.name}-${Date.now()}`;
      const rotulo = ctx.rotular(def.name, input);
      ctx.emit({ tipo: "tool_inicio", id, nome: def.name, rotulo });
      try {
        const resultado = await def.run(input);
        if (def.altera) ctx.ws.publicar();
        const resumo = primeiraLinha(resultado);
        ctx.acoes.push({ nome: def.name, rotulo, ok: true, resumo });
        ctx.emit({ tipo: "tool_fim", id, nome: def.name, ok: true, resumo });
        return resultado;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ctx.acoes.push({ nome: def.name, rotulo, ok: false, resumo: msg });
        ctx.emit({ tipo: "tool_fim", id, nome: def.name, ok: false, resumo: msg });
        throw e;
      }
    },
  });
}

function primeiraLinha(s: string) {
  const l = s.split("\n")[0] ?? "";
  return l.length > 140 ? `${l.slice(0, 137)}…` : l;
}

export function formatarPendencias(p: Pendencia[], limite = 40): string {
  if (p.length === 0) return "✅ Nenhuma pendência — tudo certo.";
  const erros = p.filter((x) => x.nivel === "erro");
  const avisos = p.filter((x) => x.nivel === "aviso");
  const linhas = [...erros, ...avisos].slice(0, limite).map((x) => `- [${x.nivel}] ${x.alvo} · ${x.mensagem}`);
  const resto = p.length > limite ? `\n… e mais ${p.length - limite} pendência(s).` : "";
  return `${erros.length ? "❌" : "⚠️"} ${erros.length} erro(s), ${avisos.length} aviso(s):\n${linhas.join("\n")}${resto}`;
}

/** Erro de uso da tool: o texto volta ao agente como resultado com is_error. */
export class ErroTool extends Error {}

export function exigir<T>(valor: T | null | undefined, mensagem: string): T {
  if (valor === null || valor === undefined) throw new ErroTool(mensagem);
  return valor;
}
