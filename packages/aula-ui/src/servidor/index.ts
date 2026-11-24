/**
 * Rotas de servidor do app do aluno (route handlers). Cada app monta as suas com a própria sessão:
 * `export const POST = rotaEdu({ sessao })`.
 */
export { type EventoAberta, rotaAberta } from "./aberta";
export { type EventoEdu, rotaEdu } from "./edu";
