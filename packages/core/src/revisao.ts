import type { CardsDraft, Ementa, Modulo, SkillCard } from "./conteudo";

/**
 * Revisão por módulo pelo professor (na Ementa, os tópicos do módulo; nos Cards, os cards do módulo):
 * cada módulo marcado como revisado guarda a "assinatura" do conteúdo no momento do check. Se o módulo mudar depois (edição ou ajuste do Edu),
 * a assinatura deixa de bater e ele volta a pedir revisão; os outros continuam revisados.
 */

/** Revisões salvas: id do item → assinatura do conteúdo quando foi marcado como revisado. */
export type Revisoes = Record<string, string>;

/** Hash curto e estável (FNV-1a de 32 bits). */
function hash(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Assinatura do módulo na Ementa (título, descrição e tópicos; as fontes não contam). */
export function assinaturaModulo(m: Modulo): string {
  return hash(JSON.stringify([m.titulo, m.descricao, m.topicos.map((t) => [t.id, t.titulo, t.descricao, t.competencia_ids ?? []])]));
}

/** Cards de um módulo: o card pertence ao módulo do primeiro tópico que ele cobre. */
export function cardsDoModulo(ementa: Ementa, cards: CardsDraft, moduloId: string): SkillCard[] {
  const modulo = new Map(ementa.modulos.flatMap((m) => m.topicos.map((t) => [t.id, m.id] as const)));
  return cards.cards.filter((c) => modulo.get(c.topico_ids[0]) === moduloId);
}

/** Assinatura dos cards de um módulo (incluir, remover ou editar um card muda a assinatura). */
export function assinaturaCards(cards: SkillCard[]): string {
  return hash(JSON.stringify(cards.map((c) => [c.id, c.titulo, c.conceito, c.pontos_chave, c.exemplo, c.topico_ids])));
}

/** Módulos com cards que ainda precisam do check "Revisado" na etapa Cards. */
export function modulosPendentesCards(ementa: Ementa, cards: CardsDraft, revisoes: Revisoes | null | undefined): Modulo[] {
  return ementa.modulos.filter((m) => {
    const doModulo = cardsDoModulo(ementa, cards, m.id);
    return doModulo.length > 0 && revisoes?.[m.id] !== assinaturaCards(doModulo);
  });
}

export const moduloRevisado = (m: Modulo, revisoes: Revisoes | null | undefined) => !!revisoes && revisoes[m.id] === assinaturaModulo(m);

/** Módulos que ainda precisam do check "Revisado" (na ordem da ementa). */
export function modulosPendentes(ementa: Ementa, revisoes: Revisoes | null | undefined): Modulo[] {
  return ementa.modulos.filter((m) => !moduloRevisado(m, revisoes));
}

/** Lê a coluna jsonb `revisoes` sem confiar no formato. */
export function lerRevisoes(valor: unknown): Revisoes {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  return Object.fromEntries(Object.entries(valor).filter(([, v]) => typeof v === "string")) as Revisoes;
}
