export type { ContextoTrilha, ExecutarAgenteParams, Foco, MensagemHistorico, ResultadoAgente } from "./agente";
export { blocoContextoTrilha, contextoAprovado, executarAgente, gerarEmParalelo, renumerarAulas, rodarEtapa } from "./agente";
export type { AcaoRegistrada, AvaliacaoQualidade, Emissor, EventoAgente, TipoMudanca } from "./eventos";
export type { FonteMateriais, MaterialInfo, Pagina, TrechoEncontrado } from "./materiais";
export { blocosDeMateriais, FonteEmMemoria } from "./materiais";
export type { Uso } from "./modelo";
export { capacidades, custoUsd, definirClienteAnthropic, MODELO_PADRAO, modeloAtual, modoEconomico } from "./modelo";
export type { PerfilCriadorIA } from "./skills/base";
export { validarWorkspace } from "./validacoes";
