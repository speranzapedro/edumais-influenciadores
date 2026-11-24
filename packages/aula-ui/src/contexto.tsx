"use client";

import type { CorrecaoDesafio, RespostaDesafio } from "@edu/core";
import type { EstadoEdu, RecompensaAula } from "@edu/db";
import { createContext, type ReactNode, useContext } from "react";

/**
 * Server actions do app do fã. O app define as suas (com a própria sessão) e as entrega pelo
 * <ProvedorAula>: o player e o Edu só desenham e chamam (a prévia do painel usa outras ações).
 */
export interface AcoesAula {
  responder(
    aulaId: string,
    blocoId: string,
    resposta: RespostaDesafio,
    tentativa: string,
  ): Promise<{ readonly erro: string } | { readonly correcao: CorrecaoDesafio }>;
  concluirAula(
    aulaId: string,
    trilhaId: string,
    tentativa: string,
  ): Promise<{ readonly erro: string } | { readonly recompensa: RecompensaAula; readonly proxima: { id: string; titulo: string } | null }>;
  eduAbrir(trilhaId: string, aulaId: string | null): Promise<EstadoEdu | null>;
  eduAvaliar(mensagemId: string, avaliacao: "util" | "nao_ajudou" | null, motivo: string | null): Promise<void>;
  eduConfirmarAviso(): Promise<void>;
}

/** Textos que mudam conforme quem usa o player (app do fã ou prévia do criador). */
export interface TextosAula {
  /** Linha do aviso de primeira vez do Edu sobre o que acontece com as perguntas. */
  avisoEduRegistro: string;
}

export const TEXTOS_FA: TextosAula = {
  avisoEduRegistro: "Suas perguntas ficam registradas para melhorar as trilhas. O Edu usa IA e pode errar.",
};

/** Endereços que o player usa para sair, seguir e enviar a pergunta aberta (os padrões são os do app). */
export interface RotasAula {
  trilha(trilhaId: string): string;
  aula(aulaId: string): string;
  aberta(aulaId: string): string;
  progresso: string;
}

export const ROTAS_APP: RotasAula = {
  trilha: (id) => `/trilhas/${id}`,
  aula: (id) => `/aula/${id}`,
  aberta: (id) => `/aula/${id}/aberta`,
  progresso: "/progresso",
};

export interface ConfigAula {
  acoes: AcoesAula;
  textos: TextosAula;
  /** Só a demo da landing troca: os apps usam as rotas padrão. */
  rotas?: RotasAula;
}

const Contexto = createContext<ConfigAula | null>(null);

export function ProvedorAula({ config, children }: { config: ConfigAula; children: ReactNode }) {
  return <Contexto.Provider value={config}>{children}</Contexto.Provider>;
}

export function useAula(): ConfigAula & { rotas: RotasAula } {
  const c = useContext(Contexto);
  if (!c) throw new Error("Player/Edu fora do <ProvedorAula>.");
  return { ...c, rotas: c.rotas ?? ROTAS_APP };
}
