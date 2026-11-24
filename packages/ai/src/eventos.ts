import type { AulasDraft, CardsDraft, Ementa, Etapa, Pendencia, VisaoGeral } from "@edu/core";
import type { Uso } from "./modelo";

export type TipoMudanca = "adicionado" | "alterado" | "removido";

/** Eventos emitidos durante a execução de um agente (enviados à UI via SSE). */
export type EventoAgente =
  | { tipo: "status"; texto: string }
  | { tipo: "texto"; delta: string }
  | { tipo: "pensando"; delta: string }
  | { tipo: "escrevendo"; nome: string; rotulo: string }
  | { tipo: "tool_inicio"; id: string; nome: string; rotulo: string }
  | { tipo: "tool_fim"; id: string; nome: string; ok: boolean; resumo: string }
  | { tipo: "draft"; etapa: Etapa; draft: VisaoGeral | Ementa | CardsDraft | AulasDraft; mudancas: Record<string, TipoMudanca> }
  | { tipo: "validacao"; pendencias: Pendencia[]; cobertura?: number }
  | { tipo: "qualidade"; avaliacao: AvaliacaoQualidade }
  | { tipo: "uso"; uso: Uso; custo_usd: number }
  | { tipo: "fim"; resumo: string }
  | { tipo: "erro"; mensagem: string };

export type Emissor = (e: EventoAgente) => void;

export interface AvaliacaoQualidade {
  nota_geral: number;
  criterios: { criterio: string; nota: number; comentario: string }[];
  problemas: { alvo: string; gravidade: "alta" | "media" | "baixa"; problema: string; sugestao: string }[];
  pontos_fortes: string[];
}

/** Registro compacto das ações do agente, persistido junto da mensagem do chat. */
export interface AcaoRegistrada {
  nome: string;
  rotulo: string;
  ok: boolean;
  resumo: string;
}
