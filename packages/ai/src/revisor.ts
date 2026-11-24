import type Anthropic from "@anthropic-ai/sdk";
import type { Etapa } from "@edu/core";
import { z } from "zod";
import type { AvaliacaoQualidade } from "./eventos";
import { anthropic, capacidades, somarUso, type Uso } from "./modelo";
import type { PerfilCriadorIA } from "./skills/base";
import { promptRevisor } from "./skills/revisor";

const AvaliacaoSchema = z.object({
  nota_geral: z.number().describe("1 a 5"),
  criterios: z.array(z.object({ criterio: z.string(), nota: z.number().describe("1 a 5"), comentario: z.string() })),
  problemas: z.array(
    z.object({
      alvo: z.string().describe("id do item (ex.: T4, C12, A3, B27)"),
      gravidade: z.enum(["alta", "media", "baixa"]),
      problema: z.string(),
      sugestao: z.string(),
    }),
  ),
  pontos_fortes: z.array(z.string()),
});

/**
 * Schema da saída estruturada enviado à API. Não usamos `betaZodOutputFormat` do SDK: a transformação dele
 * (0.131) descarta `enum` e o rebaixa a texto na `description`, então a API não restringia a gravidade e o
 * modelo às vezes devolvia valores fora da lista. O JSON Schema gerado pelo Zod já é aceito como está
 * (objetos com `additionalProperties: false`, `required` e `enum`) — só tiramos o `$schema`.
 * Atenção: restrições numéricas, de tamanho de string ou de array (`.min()`, `.max()`) não são suportadas pela API.
 */
export const SCHEMA_AVALIACAO = (({ $schema: _, ...schema }) => schema)(z.toJSONSchema(AvaliacaoSchema));

/** Revisor pedagógico: chamada independente com saída estruturada (rubrica por etapa). */
export async function revisarQualidade(p: {
  perfil: PerfilCriadorIA;
  etapa: Etapa;
  modelo: string;
  materiais: Anthropic.Beta.BetaContentBlockParam[];
  contexto: string | null;
  draft: unknown;
  foco: string | null;
  uso: Uso;
  signal?: AbortSignal;
}): Promise<AvaliacaoQualidade> {
  // Prefixo estável (cacheado): rubrica + materiais + etapas aprovadas. Ele se repete entre as revisões
  // de uma execução e entre os workers paralelos; só o rascunho muda. A marcação vai numa cópia do bloco
  // porque os blocos de materiais são compartilhados com o prompt do agente.
  const conteudo: Anthropic.Beta.BetaContentBlockParam[] = [...p.materiais];
  if (p.contexto) conteudo.push({ type: "text", text: p.contexto });
  if (conteudo.length > 0)
    conteudo[conteudo.length - 1] = { ...conteudo[conteudo.length - 1], cache_control: { type: "ephemeral" } } as Anthropic.Beta.BetaContentBlockParam;
  conteudo.push({
    type: "text",
    text: `Rascunho da etapa "${p.etapa}" a avaliar:\n\`\`\`json\n${JSON.stringify(p.draft)}\n\`\`\`${p.foco ? `\n\nFoco pedido pelo autor: ${p.foco}` : ""}`,
  });

  const resposta = await anthropic().beta.messages.create(
    {
      model: p.modelo,
      max_tokens: 12000,
      system: promptRevisor(p.etapa, p.perfil),
      messages: [{ role: "user", content: conteudo }],
      output_config: {
        ...(capacidades(p.modelo).effort ? { effort: "medium" as const } : {}),
        format: { type: "json_schema", schema: SCHEMA_AVALIACAO },
      },
    },
    { signal: p.signal },
  );
  // Contabiliza antes de validar: a chamada foi cobrada mesmo que a avaliação seja descartada.
  somarUso(p.uso, resposta.usage);
  if (resposta.stop_reason === "refusal") throw new Error("O revisor recusou a avaliação.");
  if (resposta.stop_reason === "max_tokens") throw new Error("A avaliação do revisor foi cortada por exceder o limite de tokens.");

  const texto = resposta.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text ?? "";
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error("O revisor não devolveu um JSON válido.");
  }
  const r = AvaliacaoSchema.safeParse(json);
  if (!r.success)
    throw new Error(`O revisor devolveu uma avaliação fora do formato: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const av = r.data;
  // O limite de 12 problemas é do prompt; a API não impõe tamanho de array.
  return { ...av, nota_geral: Math.round(av.nota_geral * 10) / 10, problemas: av.problemas.slice(0, 12) };
}
