import { ErroPermissao, type EscopoCriador, escopoCriador } from "@edu/db";
import { usuarioDaSessao } from "@edu/db/next";
import { redirect } from "next/navigation";
import { cache } from "react";

/** Criador logado (conta + perfil + produto); null sem sessão válida ou se a conta não é de criador. */
export const criadorAtual = cache(async (): Promise<EscopoCriador | null> => {
  const usuario = await usuarioDaSessao("painel");
  if (!usuario) return null;
  return escopoCriador(usuario);
});

/** Páginas e actions do painel: sem criador logado, volta para /login. */
export async function exigirCriador(): Promise<EscopoCriador> {
  const e = await criadorAtual();
  if (!e) redirect("/login");
  return e;
}

/** Versão para route handlers: devolve null em vez de redirecionar. */
export const criadorOuNulo = criadorAtual;

/** Executa uma action convertendo erros de permissão/validação em mensagem para o formulário. */
export async function tentar<T>(fn: () => Promise<T>): Promise<{ erro: string } | { ok: true; dados: T }> {
  try {
    return { ok: true, dados: await fn() };
  } catch (e) {
    if (e instanceof ErroPermissao || (e instanceof Error && (e.name === "ErroAcesso" || e.name === "ErroValidacao"))) return { erro: e.message };
    throw e;
  }
}

/** Endereço do app dos fãs (página pública do criador). */
export const urlAluno = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3007").replace(/\/$/, "");

/** Link público do criador, com a origem de divulgação opcional. */
export const linkPublico = (handle: string, origem?: string) => `${urlAluno()}/c/${handle}${origem ? `?origem=${origem}` : ""}`;

/** Endereço público deste painel (links de e-mail). */
export const urlPainel = () => (process.env.NEXT_PUBLIC_PAINEL_URL ?? "http://localhost:3006").replace(/\/$/, "");
