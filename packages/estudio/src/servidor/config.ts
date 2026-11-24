import type { PerfilCriadorIA } from "@edu/ai";
import type { Etapa } from "@edu/core";
import type { EstadoEstudio } from "@edu/db";

/**
 * O que o app informa às rotas do estúdio. `S` é a sessão do app (escopo do criador): as rotas só
 * repassam, quem decide permissão e contexto é o app.
 */
export interface ConfigRotasEstudio<S> {
  /** Sessão de quem usa o painel; null responde 401. */
  sessao(): Promise<S | null>;
  podeAcessarTrilha(s: S, trilhaId: string): Promise<boolean>;
  /** Público e tom para os prompts do agente e do feedback de pergunta aberta. */
  perfilIA(s: S, estudio: EstadoEstudio): PerfilCriadorIA | Promise<PerfilCriadorIA>;
  /** Antes de rodar o agente: devolve uma mensagem para bloquear (ex.: cota esgotada) ou null. */
  antesDoAgente?(s: S, trilhaId: string): Promise<string | null>;
  /** Fim de uma geração bem-sucedida (aviso ao criador). Erros aqui são ignorados. */
  aoGerar?(s: S, p: { trilhaId: string; etapa: Etapa; estudio: EstadoEstudio }): Promise<void>;
  /** Materiais mudaram: o app reindexa o Edu depois da resposta. */
  aoMudarMateriais?(trilhaId: string): void;
}

export type Contexto = { params: Promise<{ id: string }> };
