import type Anthropic from "@anthropic-ai/sdk";
import { type Competencia, desescaparProfundo, proximoCodigo, type VisaoGeral, validarVisao } from "@edu/core";
import { z } from "zod";
import type { ExecutarAgenteParams, ResultadoAgente } from "./agente";
import { blocoContextoTrilha, limiteCaracteres } from "./contexto";
import type { TipoMudanca } from "./eventos";
import { blocosDeMateriais } from "./materiais";
import { anthropic, capacidades, custoUsd, modeloPlanejamento, somarUso, usoVazio } from "./modelo";
import { skillBase } from "./skills/base";
import { SKILL_VISAO } from "./skills/visao";

const SaidaSchema = z.object({
  curso: z.string(),
  objetivo_geral: z.string(),
  publico_alvo: z.string(),
  competencias: z.array(
    z.object({
      id: z.string().nullable().describe("id existente (K1…) da competência que continua; null para competência nova"),
      texto: z.string(),
    }),
  ),
  resumo: z.string().describe("1 a 3 frases para o professor"),
});

/** JSON Schema da saída estruturada (mesmo tratamento do revisor: o do Zod vai como está, sem o $schema). */
export const SCHEMA_VISAO = (({ $schema: _, ...schema }) => schema)(z.toJSONSchema(SaidaSchema));

/**
 * Ids estáveis: a competência que o modelo devolveu com um id existente o mantém (os tópicos da ementa
 * apontam para ele); as novas, e ids repetidos ou desconhecidos, ganham o próximo K livre.
 */
export function atribuirIds(saida: { id: string | null; texto: string }[], atuais: Competencia[]): Competencia[] {
  const conhecidos = new Set(atuais.map((c) => c.id));
  const usados = new Set<string>();
  const pendentes: number[] = [];
  const out = saida.map((c, i) => {
    const id = c.id && conhecidos.has(c.id) && !usados.has(c.id) ? c.id : null;
    if (id) usados.add(id);
    else pendentes.push(i);
    return { id: id ?? "", texto: c.texto.trim() };
  });
  for (const i of pendentes) {
    const id = proximoCodigo("K", [...conhecidos, ...usados]);
    usados.add(id);
    out[i].id = id;
  }
  return out;
}

/** O que mudou da visão anterior para a nova (para os selos "novo"/"alterado" na tela). */
export function mudancasVisao(antes: VisaoGeral, depois: VisaoGeral): Record<string, TipoMudanca> {
  const m: Record<string, TipoMudanca> = {};
  const gerais = ["curso", "objetivo_geral", "publico_alvo"] as const;
  const primeira = !antes.objetivo_geral && antes.competencias.length === 0;
  if (primeira) m.visao = "adicionado";
  else if (gerais.some((k) => antes[k] !== depois[k])) m.visao = "alterado";
  const anteriores = new Map(antes.competencias.map((c) => [c.id, c.texto]));
  for (const c of depois.competencias) {
    if (!anteriores.has(c.id)) m[c.id] = "adicionado";
    else if (anteriores.get(c.id) !== c.texto) m[c.id] = "alterado";
  }
  for (const c of antes.competencias) if (!depois.competencias.some((x) => x.id === c.id)) m[c.id] = "removido";
  return m;
}

function instrucao(p: ExecutarAgenteParams, atual: VisaoGeral): string {
  const vazia = !atual.objetivo_geral && atual.competencias.length === 0;
  if (p.modo === "refinamento") {
    const foco = p.foco ? `\nItem em foco: ${p.foco.id} — ${p.foco.descricao}` : "";
    return `Visão geral atual (é o que o professor está vendo):\n\`\`\`json\n${JSON.stringify(atual)}\n\`\`\`\n\nPedido do professor:${foco}\n«${p.mensagem ?? ""}»\n\nDevolva a visão completa com o ajuste.`;
  }
  return vazia
    ? "Proponha a visão geral desta trilha a partir da orientação do professor e dos materiais."
    : `Proponha uma nova visão geral desta trilha a partir da orientação do professor e dos materiais. Ela substitui a atual:\n\`\`\`json\n${JSON.stringify(atual)}\n\`\`\``;
}

/**
 * Visão geral (nome, objetivo geral, público-alvo e competências): uma chamada única com
 * saída estruturada, sem tools nem revisor — o professor revisa e aprova antes de a ementa ser gerada.
 * Serve à geração e aos ajustes pelo chat (preservando os ids das competências).
 */
export async function gerarVisao(p: ExecutarAgenteParams): Promise<ResultadoAgente> {
  const modelo = p.modelo ?? modeloPlanejamento();
  const uso = usoVazio();
  const atual = p.inicial.visao ?? { curso: "", objetivo_geral: "", publico_alvo: "", competencias: [] };
  p.emit({ tipo: "status", texto: p.modo === "refinamento" ? "Ajustando a visão geral…" : "Lendo os materiais e montando a visão geral…" });

  const { blocos, modoBusca } = await blocosDeMateriais(p.fonte, limiteCaracteres(modelo));
  // Prefixo estável (cacheado): trilha + materiais. Depois: histórico do chat e o pedido.
  const prefixo: Anthropic.Beta.BetaContentBlockParam[] = [
    ...(p.contextoTrilha ? [{ type: "text" as const, text: blocoContextoTrilha(p.contextoTrilha) }] : []),
    {
      type: "text",
      text: `Materiais enviados pelo professor${modoBusca ? " (grandes demais para virem inteiros: há só uma prévia de cada página)" : ""}:`,
    },
    ...blocos,
  ];
  (prefixo[prefixo.length - 1] as { cache_control?: unknown }).cache_control = { type: "ephemeral" };
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prefixo }];
  // A API exige alternância: o histórico começa com o professor, então o prefixo ganha uma resposta curta.
  const historico = (p.historico ?? []).filter((h) => h.texto.trim());
  if (historico.length) {
    messages.push({ role: "assistant", content: "Li a orientação e os materiais." });
    for (const h of historico) messages.push({ role: h.role, content: h.texto });
    if (historico[historico.length - 1].role === "user") messages.push({ role: "assistant", content: "Certo." });
  }
  messages.push({ role: "user", content: instrucao(p, atual) });

  const resposta = await anthropic().beta.messages.create(
    {
      model: modelo,
      max_tokens: 4000,
      system: [{ type: "text", text: `${skillBase(p.perfil)}\n\n${SKILL_VISAO}`, cache_control: { type: "ephemeral" } }],
      messages,
      output_config: {
        ...(capacidades(modelo).effort ? { effort: "medium" as const } : {}),
        format: { type: "json_schema", schema: SCHEMA_VISAO },
      },
    },
    { signal: p.signal },
  );
  somarUso(uso, resposta.usage);
  p.emit({ tipo: "uso", uso: { ...uso }, custo_usd: custoUsd(uso, modelo) });
  if (resposta.stop_reason === "refusal") throw new Error("O modelo recusou a solicitação.");
  if (resposta.stop_reason === "max_tokens") throw new Error("A visão geral foi cortada por exceder o limite de tokens.");

  const texto = resposta.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text ?? "";
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error("O modelo não devolveu um JSON válido para a visão geral.");
  }
  const r = SaidaSchema.safeParse(json);
  if (!r.success) throw new Error(`Visão geral fora do formato: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);

  // Mesmo cuidado das tools: acentos escapados pelo modelo viram o caractere.
  const { resumo, competencias, ...gerais } = desescaparProfundo(r.data);
  const visao: VisaoGeral = {
    ...gerais,
    curso: gerais.curso.trim(),
    objetivo_geral: gerais.objetivo_geral.trim(),
    publico_alvo: gerais.publico_alvo.trim(),
    competencias: atribuirIds(competencias, atual.competencias),
  };
  const mudancas = mudancasVisao(atual, visao);
  const pendencias = validarVisao(visao);
  p.emit({ tipo: "draft", etapa: "visao", draft: visao, mudancas });
  p.emit({ tipo: "validacao", pendencias });
  p.emit({ tipo: "fim", resumo: resumo.trim() || "Visão geral pronta." });

  return {
    etapa: "visao",
    visao,
    ementa: p.inicial.ementa,
    cards: p.inicial.cards,
    aulas: p.inicial.aulas,
    mudancas,
    resumo: resumo.trim() || "Visão geral pronta.",
    acoes: [],
    pendencias,
    qualidade: null,
    uso,
    usoRevisor: usoVazio(),
    custo_usd: custoUsd(uso, modelo),
    modelo,
  };
}
