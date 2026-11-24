/**
 * Rotas de servidor do estúdio (route handlers). Cada app monta as suas com a própria sessão e
 * regra de acesso: `export const POST = rotaAgente(config)`.
 */

export { type EventoStream, rotaAgente } from "./agente";
export type { ConfigRotasEstudio } from "./config";
export { rotaMateriais, rotaProcessarMaterial } from "./materiais";
export { rotaTestarAberta } from "./testarAberta";
