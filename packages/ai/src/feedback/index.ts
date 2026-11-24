// Ponto de entrada leve para os apps (aluno e "Testar como aluno" do estúdio): só o feedback da
// pergunta aberta, sem puxar o agente do estúdio nem a ingestão de materiais.

export { modeloFeedback } from "../modelo";
export type { EventoFeedback } from "./avaliar";
export { avaliarRespostaAberta, lerAnalise, SeparadorFeedback } from "./avaliar";
export { contextoDaPergunta, MARCADOR_ANALISE, skillFeedback } from "./prompt";
