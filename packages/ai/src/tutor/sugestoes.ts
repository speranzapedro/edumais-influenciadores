import { createHash } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic, capacidades, MODELO_PADRAO, somarUso, type Uso, usoVazio } from "../modelo";
import { type ConteudoTrilha, montarMapa } from "./trechos";

/** Perguntas sugeridas ao abrir o Edu: 3 da trilha e 2 por aula (chave = id da aula). */
export interface SugestoesEdu {
  trilha: string[];
  aulas: Record<string, string[]>;
}

const MODELO_SUGESTOES = MODELO_PADRAO;

const Saida = z.object({
  trilha: z.array(z.string()),
  aulas: z.array(z.object({ aula: z.number(), perguntas: z.array(z.string()) })),
});
const { $schema: _, ...SCHEMA } = z.toJSONSchema(Saida) as Record<string, unknown>;

const INSTRUCOES = `Você escreve perguntas sugeridas para o Edu, o tutor de IA de uma trilha de estudos. Elas aparecem como botões quando o aluno abre o chat, para ajudar quem não sabe por onde começar.
Regras:
- Perguntas curtas (até 80 caracteres), em português do Brasil, como um aluno curioso escreveria, de forma simples.
- Uma dúvida por pergunta: não junte dois assuntos com "e".
- Cada pergunta deve ser respondível pelo conteúdo descrito (não invente assuntos que a trilha não trata).
- Prefira entender conceitos, aplicar no dia a dia e tirar dúvidas comuns. Nunca peça a resposta de exercícios ou desafios.
- Varie os assuntos; não repita a mesma pergunta com outras palavras.
- "trilha": 3 perguntas sobre a trilha como um todo (de módulos diferentes). "aulas": 2 perguntas para cada aula listada, identificada pelo número.`;

/** Hash do mapa: as sugestões só são regeradas quando a estrutura da trilha muda. */
export const hashSugestoes = (mapa: string) => createHash("sha256").update(`v2\n${mapa}`).digest("hex").slice(0, 32);

const curta = (p: string) => p.trim().replace(/\s+/g, " ");
const valida = (p: string) => p.length >= 8 && p.length <= 120;

export async function gerarSugestoes(conteudo: ConteudoTrilha, opts: { signal?: AbortSignal } = {}): Promise<{ sugestoes: SugestoesEdu; uso: Uso }> {
  const uso = usoVazio();
  const mapa = montarMapa(conteudo);
  const r = await anthropic().beta.messages.create(
    {
      model: MODELO_SUGESTOES,
      // O raciocínio conta no max_tokens; esforço baixo, porque a tarefa é simples.
      max_tokens: 8000,
      system: INSTRUCOES,
      messages: [{ role: "user", content: mapa }],
      output_config: { ...(capacidades(MODELO_SUGESTOES).effort ? { effort: "low" as const } : {}), format: { type: "json_schema", schema: SCHEMA } },
    },
    { signal: opts.signal },
  );
  somarUso(uso, r.usage);
  if (r.stop_reason !== "end_turn") throw new Error(`Sugestões interrompidas: ${r.stop_reason}`);
  const saida = Saida.parse(JSON.parse(r.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text ?? ""));
  const porOrdem = new Map(conteudo.aulas.map((a) => [a.ordem, a.id]));
  const aulas: Record<string, string[]> = {};
  for (const a of saida.aulas) {
    const id = porOrdem.get(a.aula);
    if (id) aulas[id] = a.perguntas.map(curta).filter(valida).slice(0, 2);
  }
  return { sugestoes: { trilha: saida.trilha.map(curta).filter(valida).slice(0, 3), aulas }, uso };
}

/** Persistência das sugestões. Implementado sobre o Postgres em @edu/db (ArmazemTutorDb). */
export interface ArmazemSugestoes {
  carregarConteudo(trilhaId: string): Promise<ConteudoTrilha>;
  hashSugestoes(trilhaId: string): Promise<string | null>;
  gravarSugestoes(trilhaId: string, sugestoes: SugestoesEdu, hash: string): Promise<void>;
}

/** Regera as sugestões só quando o mapa da trilha mudou (custo: uma chamada barata ao Haiku). */
export async function atualizarSugestoes(armazem: ArmazemSugestoes, trilhaId: string, opts: { signal?: AbortSignal } = {}) {
  const conteudo = await armazem.carregarConteudo(trilhaId);
  const hash = hashSugestoes(montarMapa(conteudo));
  if ((await armazem.hashSugestoes(trilhaId)) === hash) return "iguais" as const;
  const { sugestoes } = await gerarSugestoes(conteudo, opts);
  await armazem.gravarSugestoes(trilhaId, sugestoes, hash);
  return "atualizadas" as const;
}
