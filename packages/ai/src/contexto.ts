import { LIMITE_CARACTERES_CONTEXTO } from "./materiais";
import { capacidades } from "./modelo";

/**
 * Partes do prompt compartilhadas pelo agente das etapas (agente.ts) e pela geração da visão geral
 * (visao.ts): o bloco "sobre esta trilha" e o limite de materiais inteiros no contexto.
 */

export interface MensagemHistorico {
  role: "user" | "assistant";
  texto: string;
}

export interface Foco {
  id: string;
  descricao: string;
}

/** O que o criador cadastrou sobre a trilha: vale para todas as etapas. */
export interface ContextoTrilha {
  /** Produto do criador ao qual a trilha pertence. */
  produto?: string | null;
  titulo: string;
  descricao?: string | null;
  /** Orientação do professor: o que a trilha deve entregar ao aluno. */
  objetivo?: string | null;
  /** Orientação do professor: recorte do material (capítulos, temas, páginas) a considerar. */
  conteudos?: string | null;
  /** Orientação do professor: conteúdos que o material não traz e devem entrar na trilha. */
  complementos?: string | null;
}

/** Bloco "sobre esta trilha" do prefixo cacheado. Campos vazios ficam de fora. */
export function blocoContextoTrilha(c: ContextoTrilha): string {
  const linhas = [
    ["Produto", c.produto],
    ["Trilha", c.titulo],
    ["Descrição", c.descricao],
    ["Objetivo da trilha", c.objetivo],
    ["Conteúdos a considerar (recorte do material)", c.conteudos],
    ["Conteúdos para complementar (além do material)", c.complementos],
  ]
    .map(([rotulo, valor]) => [rotulo, valor?.trim()] as const)
    .filter(([, valor]) => valor)
    .map(([rotulo, valor]) => `- ${rotulo}: ${valor}`);
  return `SOBRE ESTA TRILHA (cadastrado pelo professor; vale para todas as etapas):\n${linhas.join("\n")}`;
}

/** Materiais inteiros no contexto até ~40% da janela do modelo (≈ 4 caracteres por token); acima disso, modo busca. */
export const limiteCaracteres = (modelo: string) => Math.min(LIMITE_CARACTERES_CONTEXTO, Math.floor(capacidades(modelo).contextoTokens * 0.4 * 4));
