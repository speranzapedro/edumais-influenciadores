import { z } from "zod";

/**
 * Formatos do conteúdo produzido no estúdio de criação (visão geral → ementa → skill cards → aulas).
 * Os ids são códigos curtos gerados pelo sistema (K2, M1, T4, C12, A3, B27) — legíveis para o
 * agente e para o professor, e estáveis entre versões para permitir diffs.
 */

export const LIMITES = {
  tituloCurto: 90,
  descricaoTopico: { min: 30, max: 400 },
  conceitoCard: { min: 180, max: 900 },
  pontosChave: { min: 3, max: 5 },
  exemploCard: { min: 30, max: 450 },
  textoBloco: { min: 40, max: 320 },
  pergunta: { min: 15, max: 220 },
  opcao: { max: 140 },
  feedback: { min: 25, max: 280 },
  /** Tamanho pedido ao Edu (Explicação → Prática). */
  blocosPorAula: { min: 8, max: 12 },
  /** Abaixo disso é erro; entre este mínimo e o de `blocosPorAula`, só aviso (aulas do formato anterior seguem aprovando). */
  blocosPorAulaAceito: { min: 6 },
  /** Textos antes do primeiro desafio (a Explicação) e o máximo de textos ou desafios seguidos. */
  explicacao: { min: 3, max: 5 },
  desafiosSeguidos: { max: 5 },
  /** Desafios corrigíveis (quiz, completar, ordenar); a pergunta aberta não conta. */
  desafiosPorAula: { min: 2 },
  abertasPorAula: { max: 1 },
  cardsPorAula: { min: 1, max: 4 },
  textoCompletar: { min: 20, max: 280 },
  lacunas: { min: 1, max: 3 },
  palavraLacuna: { max: 40 },
  distratores: { min: 1, max: 3 },
  passosOrdenar: { min: 3, max: 6 },
  passo: { max: 120 },
  perguntaAberta: { min: 30, max: 400 },
  respostaModelo: { min: 80, max: 800 },
  criteriosAberta: { min: 2, max: 5 },
  criterio: { max: 200 },
  itensGabarito: { max: 4 },
  respostaAluno: { min: 15, max: 1000 },
} as const;

export const FonteSchema = z.object({
  material_id: z.string().describe("id do material de origem"),
  pagina: z.number().int().nullable().describe("página do material (null se não se aplica)"),
});
export type Fonte = z.infer<typeof FonteSchema>;

export const TopicoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  fontes: z.array(FonteSchema),
  /** Competências da visão geral que o tópico desenvolve (ausente nas ementas anteriores à visão). */
  competencia_ids: z.array(z.string()).optional(),
});
export type Topico = z.infer<typeof TopicoSchema>;

export const ModuloSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  topicos: z.array(TopicoSchema),
});
export type Modulo = z.infer<typeof ModuloSchema>;

export const CompetenciaSchema = z.object({
  /** K1, K2… (C já é dos skill cards). */
  id: z.string(),
  texto: z.string(),
});
export type Competencia = z.infer<typeof CompetenciaSchema>;

/** Competências antigas eram só texto: viram {id: K1…, texto} na ordem em que estavam. */
export function normalizarCompetencias(raw: unknown): Competencia[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c, i) =>
    typeof c === "string" ? { id: `K${i + 1}`, texto: c } : { id: String((c as Competencia).id ?? `K${i + 1}`), texto: String((c as Competencia).texto ?? "") },
  );
}

const CompetenciasSchema = z.preprocess(normalizarCompetencias, z.array(CompetenciaSchema));

/** Visão geral da trilha: aprovada pelo professor antes de a estrutura (módulos e tópicos) ser gerada. */
export const VisaoGeralSchema = z.object({
  curso: z.string(),
  objetivo_geral: z.string(),
  publico_alvo: z.string(),
  competencias: CompetenciasSchema,
});
export type VisaoGeral = z.infer<typeof VisaoGeralSchema>;

/** Ementa = visão geral aprovada (copiada) + estrutura. */
export const EmentaSchema = VisaoGeralSchema.extend({
  modulos: z.array(ModuloSchema),
});
export type Ementa = z.infer<typeof EmentaSchema>;

/** Ementa ou visão lida do banco/fixture em formato antigo (competências em texto). */
export function normalizarEmenta<T extends { competencias?: unknown }>(raw: T): T & { competencias: Competencia[] } {
  return { ...raw, competencias: normalizarCompetencias(raw.competencias) };
}

/** Dados gerais da ementa (a parte que vem da visão). */
export function visaoDaEmenta(e: Ementa): VisaoGeral {
  return { curso: e.curso, objetivo_geral: e.objetivo_geral, publico_alvo: e.publico_alvo, competencias: e.competencias };
}

export const SkillCardSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  conceito: z.string(),
  pontos_chave: z.array(z.string()),
  exemplo: z.string(),
  topico_ids: z.array(z.string()),
  fontes: z.array(FonteSchema),
});
export type SkillCard = z.infer<typeof SkillCardSchema>;

export const CardsDraftSchema = z.object({ cards: z.array(SkillCardSchema) });
export type CardsDraft = z.infer<typeof CardsDraftSchema>;

export const BlocoTextoSchema = z.object({
  id: z.string(),
  tipo: z.literal("texto"),
  titulo: z.string().nullable(),
  texto: z.string(),
  dica: z.string().nullable(),
});
export type BlocoTexto = z.infer<typeof BlocoTextoSchema>;

export const OpcaoQuizSchema = z.object({
  texto: z.string(),
  correta: z.boolean(),
  feedback: z.string(),
});
export type OpcaoQuiz = z.infer<typeof OpcaoQuizSchema>;

export const BlocoQuizSchema = z.object({
  id: z.string(),
  tipo: z.literal("quiz"),
  pergunta: z.string(),
  opcoes: z.array(OpcaoQuizSchema),
  skill_card_id: z.string(),
});
export type BlocoQuiz = z.infer<typeof BlocoQuizSchema>;

/** Completar lacunas: o texto marca cada lacuna como [[1]], [[2]]… na ordem de `lacunas`. */
export const BlocoCompletarSchema = z.object({
  id: z.string(),
  tipo: z.literal("completar"),
  texto: z.string(),
  lacunas: z.array(z.object({ resposta: z.string() })),
  distratores: z.array(z.string()),
  explicacao: z.string(),
  skill_card_id: z.string(),
});
export type BlocoCompletar = z.infer<typeof BlocoCompletarSchema>;

/** Ordenar passos: `passos` fica guardado na ordem correta; o aluno recebe embaralhado. */
export const BlocoOrdenarSchema = z.object({
  id: z.string(),
  tipo: z.literal("ordenar"),
  instrucao: z.string(),
  passos: z.array(z.string()),
  explicacao: z.string(),
  skill_card_id: z.string(),
});
export type BlocoOrdenar = z.infer<typeof BlocoOrdenarSchema>;

export const CriterioAbertaSchema = z.object({
  descricao: z.string(),
  essencial: z.boolean(),
});
export type CriterioAberta = z.infer<typeof CriterioAbertaSchema>;

/** Gabarito da pergunta aberta: nunca vai para o navegador; orienta o feedback da IA. */
export const GabaritoAbertaSchema = z.object({
  resposta_modelo: z.string(),
  criterios: z.array(CriterioAbertaSchema),
  erros_comuns: z.array(z.string()),
  alertas_criticos: z.array(z.string()),
});
export type GabaritoAberta = z.infer<typeof GabaritoAbertaSchema>;

/** Pergunta aberta (formativa): o aluno escreve e recebe feedback da IA; não entra na nota. */
export const BlocoAbertaSchema = z.object({
  id: z.string(),
  tipo: z.literal("aberta"),
  pergunta: z.string(),
  dica: z.string().nullable(),
  gabarito: GabaritoAbertaSchema,
  skill_card_id: z.string(),
});
export type BlocoAberta = z.infer<typeof BlocoAbertaSchema>;

export const BlocoSchema = z.discriminatedUnion("tipo", [BlocoTextoSchema, BlocoQuizSchema, BlocoCompletarSchema, BlocoOrdenarSchema, BlocoAbertaSchema]);
export type Bloco = z.infer<typeof BlocoSchema>;
export type TipoBloco = Bloco["tipo"];
export type BlocoCorrigivel = BlocoQuiz | BlocoCompletar | BlocoOrdenar;
export type BlocoDesafio = BlocoCorrigivel | BlocoAberta;

export const TIPOS_CORRIGIVEIS = ["quiz", "completar", "ordenar"] as const;

/** Desafios com resposta certa/errada — os únicos que entram em acertos/total. */
export function ehCorrigivel(b: Bloco): b is BlocoCorrigivel {
  return b.tipo === "quiz" || b.tipo === "completar" || b.tipo === "ordenar";
}

/** Tudo que pede uma ação do aluno (inclui a pergunta aberta). */
export function ehDesafio(b: Bloco): b is BlocoDesafio {
  return b.tipo !== "texto";
}

export const NOME_TIPO_BLOCO: Record<TipoBloco, string> = {
  texto: "Texto",
  quiz: "Quiz",
  completar: "Completar",
  ordenar: "Ordenar",
  aberta: "Pergunta aberta",
};

/** Marcadores de lacuna ([[1]], [[2]]…) na ordem em que aparecem no texto. */
export function marcadoresLacuna(texto: string): number[] {
  return [...texto.matchAll(/\[\[(\d+)\]\]/g)].map((m) => Number(m[1]));
}

export const AulaSchema = z.object({
  id: z.string(),
  modulo_id: z.string(),
  titulo: z.string(),
  objetivo: z.string(),
  skill_card_ids: z.array(z.string()),
  blocos: z.array(BlocoSchema),
});
export type Aula = z.infer<typeof AulaSchema>;

export const AulasDraftSchema = z.object({ aulas: z.array(AulaSchema) });
export type AulasDraft = z.infer<typeof AulasDraftSchema>;

export type Etapa = "visao" | "ementa" | "cards" | "aulas";

export function visaoVazia(): VisaoGeral {
  return { curso: "", objetivo_geral: "", publico_alvo: "", competencias: [] };
}

export function ementaVazia(): Ementa {
  return {
    curso: "",
    objetivo_geral: "",
    publico_alvo: "",
    competencias: [],
    modulos: [],
  };
}

export function todosTopicos(ementa: Ementa): (Topico & { modulo_id: string })[] {
  return ementa.modulos.flatMap((m) => m.topicos.map((t) => ({ ...t, modulo_id: m.id })));
}

/** Gera o próximo código livre com o prefixo dado (ex.: "C" → "C13"). */
export function proximoCodigo(prefixo: string, existentes: Iterable<string>): string {
  let max = 0;
  for (const id of existentes) {
    if (id.startsWith(prefixo)) {
      const n = Number(id.slice(prefixo.length));
      if (Number.isInteger(n) && n > max) max = n;
    }
  }
  return `${prefixo}${max + 1}`;
}

/** Contagem de desafios por tipo em um conjunto de aulas (resumos do agente, eval e estúdio). */
export function contarDesafios(aulas: Aula[]) {
  const c = { quiz: 0, completar: 0, ordenar: 0, aberta: 0, corrigiveis: 0 };
  for (const a of aulas) {
    for (const b of a.blocos) {
      if (b.tipo === "texto") continue;
      c[b.tipo]++;
      if (b.tipo !== "aberta") c.corrigiveis++;
    }
  }
  return c;
}

/** Ex.: "14 desafios (10 quizzes, 2 completar, 2 ordenar) e 3 perguntas abertas". */
export function resumoDesafios(aulas: Aula[]): string {
  const c = contarDesafios(aulas);
  const tipos = [
    c.quiz && `${c.quiz} ${c.quiz === 1 ? "quiz" : "quizzes"}`,
    c.completar && `${c.completar} completar`,
    c.ordenar && `${c.ordenar} ordenar`,
  ].filter(Boolean);
  const abertas = c.aberta ? ` e ${c.aberta} pergunta${c.aberta === 1 ? "" : "s"} aberta${c.aberta === 1 ? "" : "s"}` : "";
  return `${c.corrigiveis} desafio${c.corrigiveis === 1 ? "" : "s"}${tipos.length ? ` (${tipos.join(", ")})` : ""}${abertas}`;
}
