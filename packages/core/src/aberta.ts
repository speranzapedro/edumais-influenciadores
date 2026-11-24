import type { Bloco, BlocoAberta, BlocoDesafio, Ementa, GabaritoAberta } from "./conteudo";

/**
 * Contexto que o tutor de IA recebe para dar feedback a uma pergunta aberta: onde o aluno está
 * (produto → trilha → módulo → aula), o que ele acabou de estudar (skill cards e textos da aula)
 * e o gabarito escrito na criação da aula. Montado igual a partir do rascunho (estúdio) ou do
 * conteúdo publicado (app do aluno).
 */
export interface ContextoAberta {
  /** Quem criou a trilha e para quem ela é (os seguidores dele). */
  criador: { nome: string; publico: string };
  /** Produto do criador ao qual a trilha pertence. */
  produto: string | null;
  trilha: string;
  modulo: { titulo: string; topicos: { titulo: string; descricao: string }[] } | null;
  aula: { titulo: string; objetivo: string | null };
  cards: { titulo: string; conceito: string; pontos_chave: string[]; exemplo: string | null; avaliado: boolean }[];
  /** Blocos de texto da aula que vêm antes da pergunta, na ordem. */
  textosAnteriores: string[];
  pergunta: string;
  dica: string | null;
  gabarito: GabaritoAberta;
}

export type ClassificacaoAberta = "adequada" | "parcial" | "inadequada";

/** Análise interna que acompanha o feedback (não é mostrada ao aluno como nota). */
export interface AnaliseAberta {
  classificacao: ClassificacaoAberta;
  criterios: { indice: number; atendido: boolean }[];
}

export interface CardContexto {
  id: string;
  titulo: string;
  conceito: string;
  pontos_chave: string[];
  exemplo: string | null;
}

export function montarContextoAberta(p: {
  criador: ContextoAberta["criador"];
  produto: string | null;
  trilha: string;
  ementa: Ementa | null;
  cards: CardContexto[];
  aula: { titulo: string; objetivo: string | null; modulo_id: string; modulo_titulo?: string | null; skill_card_ids: string[]; blocos: Bloco[] };
  blocoId: string;
}): ContextoAberta {
  const i = p.aula.blocos.findIndex((b) => b.id === p.blocoId);
  const bloco = p.aula.blocos[i];
  if (bloco?.tipo !== "aberta") throw new Error("Pergunta aberta não encontrada na aula.");
  const modulo = p.ementa?.modulos.find((m) => m.id === p.aula.modulo_id) ?? null;
  const idsCards = new Set([...p.aula.skill_card_ids, bloco.skill_card_id]);
  return {
    criador: p.criador,
    produto: p.produto,
    trilha: p.trilha,
    modulo: modulo
      ? { titulo: modulo.titulo, topicos: modulo.topicos.map((t) => ({ titulo: t.titulo, descricao: t.descricao })) }
      : p.aula.modulo_titulo
        ? { titulo: p.aula.modulo_titulo, topicos: [] }
        : null,
    aula: { titulo: p.aula.titulo, objetivo: p.aula.objetivo },
    cards: p.cards
      .filter((c) => idsCards.has(c.id))
      .map((c) => ({ titulo: c.titulo, conceito: c.conceito, pontos_chave: c.pontos_chave, exemplo: c.exemplo, avaliado: c.id === bloco.skill_card_id })),
    textosAnteriores: p.aula.blocos
      .slice(0, i)
      .flatMap((b) => (b.tipo === "texto" ? [`${b.titulo ? `${b.titulo}: ` : ""}${b.texto}${b.dica ? ` (Dica: ${b.dica})` : ""}`] : [])),
    pergunta: (bloco as BlocoAberta).pergunta,
    dica: bloco.dica,
    gabarito: bloco.gabarito,
  };
}

/** Enunciado curto de um desafio (snapshot nas respostas e listas de revisão). */
export function enunciadoDesafio(b: BlocoDesafio): string {
  switch (b.tipo) {
    case "quiz":
    case "aberta":
      return b.pergunta;
    case "completar":
      return b.texto.replace(/\[\[\d+\]\]/g, "___");
    case "ordenar":
      return b.instrucao;
  }
}
