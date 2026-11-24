"use client";

import type { Etapa, Orientacao, PassoTourEstudio } from "@edu/core";
import type { Snapshot } from "@edu/db";
import { createContext, type ReactNode, useContext } from "react";

type Resultado = { erro: string } | { ok: true };

/**
 * Server actions do estúdio. Cada app define as suas (com a própria checagem de permissão) e as
 * entrega ao componente: o estúdio só desenha e chama.
 */
export interface AcoesEstudio {
  aprovar(trilhaId: string, etapa: Etapa): Promise<void>;
  desfazerEtapa(trilhaId: string, etapa: Etapa): Promise<void>;
  salvarEdicao(trilhaId: string, etapa: Etapa, snapshot: Snapshot, resumo: string): Promise<void>;
  revisarModulo(trilhaId: string, etapa: "ementa" | "cards", moduloId: string, revisado: boolean): Promise<Resultado>;
  aplicarVisao(trilhaId: string): Promise<Resultado>;
  salvarOrientacao(trilhaId: string, orientacao: Pick<Orientacao, "conteudos" | "complementos">): Promise<Resultado>;
  editarDados(trilhaId: string, d: { titulo: string; objetivo: string; descricao: string; cor: string; icone: string }): Promise<Resultado>;
  excluirMaterial(trilhaId: string, materialId: string): Promise<void>;
  alternarEdu(trilhaId: string, ativo: boolean): Promise<void>;
  reindexarTutor(trilhaId: string): Promise<"indexada" | "na_fila" | "ignorada">;
  /** Tour de exemplo visto ou pulado (só quando o produto tem o tour). */
  concluirTour?(): Promise<void>;
}

/** Endereços do app que o estúdio usa nos links. */
export interface RotasEstudio {
  /** Lista de trilhas (botão voltar). */
  trilhas: string;
  /** Endereço do estúdio da trilha (padrão: `${trilhas}/${id}`). */
  estudio?: (trilhaId: string) => string;
  /** Destino do botão voltar (padrão: a lista de trilhas). */
  voltar?: (trilha: { id: string; publicada: boolean }) => string;
  /** Tour do estúdio com a trilha de exemplo; ausente = sem o botão "Guia". */
  tour?: (depois: string) => string;
  /** Para onde ir ao terminar o tour de exemplo sem destino definido. */
  depoisDoTour?: string;
}

export interface ConfigEstudio {
  acoes: AcoesEstudio;
  rotas: RotasEstudio;
  /** Passos do tour de exemplo (padrão: TOUR_ESTUDIO do @edu/core). */
  tour?: PassoTourEstudio[];
}

const Contexto = createContext<ConfigEstudio | null>(null);

export function ProvedorEstudio({ config, children }: { config: ConfigEstudio; children: ReactNode }) {
  return <Contexto.Provider value={config}>{children}</Contexto.Provider>;
}

export function useEstudio(): ConfigEstudio {
  const c = useContext(Contexto);
  if (!c) throw new Error("Componente do estúdio fora do <Estudio>.");
  return c;
}
