/**
 * Orientação da trilha escrita pelo professor para o agente do estúdio: o objetivo (obrigatório para
 * gerar a ementa), o recorte do material a considerar (opcional) e o que acrescentar além do material
 * (opcional). Regras compartilhadas entre as telas, as server actions e a rota do agente.
 */
export const LIMITES_ORIENTACAO = { objetivoMin: 20, objetivoMax: 600, conteudosMax: 1500, complementosMax: 1500 } as const;

export interface Orientacao {
  objetivo: string;
  /** Recorte do material: em que parte focar e o que deixar de fora. */
  conteudos: string;
  /** Conteúdos que o material não traz e devem entrar na trilha. */
  complementos: string;
}

/** Espaços nas pontas fora; texto vazio vira "". */
export function normalizarOrientacao(o: { objetivo?: string | null; conteudos?: string | null; complementos?: string | null }): Orientacao {
  return { objetivo: (o.objetivo ?? "").trim(), conteudos: (o.conteudos ?? "").trim(), complementos: (o.complementos ?? "").trim() };
}

/** Mensagem de erro, ou null se a orientação pode ser salva. Objetivo vazio é permitido (rascunho). */
export function erroOrientacao(o: Orientacao): string | null {
  if (o.objetivo && o.objetivo.length < LIMITES_ORIENTACAO.objetivoMin)
    return `Descreva o objetivo com pelo menos ${LIMITES_ORIENTACAO.objetivoMin} caracteres.`;
  if (o.objetivo.length > LIMITES_ORIENTACAO.objetivoMax) return `O objetivo pode ter até ${LIMITES_ORIENTACAO.objetivoMax} caracteres.`;
  if (o.conteudos.length > LIMITES_ORIENTACAO.conteudosMax) return `Os conteúdos podem ter até ${LIMITES_ORIENTACAO.conteudosMax} caracteres.`;
  if (o.complementos.length > LIMITES_ORIENTACAO.complementosMax) return `Os complementos podem ter até ${LIMITES_ORIENTACAO.complementosMax} caracteres.`;
  return null;
}

/** A trilha tem objetivo suficiente para gerar a ementa? */
export const objetivoDefinido = (objetivo: string | null | undefined) => (objetivo ?? "").trim().length >= LIMITES_ORIENTACAO.objetivoMin;
