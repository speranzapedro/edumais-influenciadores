import { appDoCriador, criadoresDoFa, faTemAcesso } from "@edu/db";
import { usuarioDaSessao } from "@edu/db/next";
import { notFound, redirect } from "next/navigation";

/**
 * Páginas do app de um criador (/@criador/…) para quem assina: sem login, vai ao "entrar" com a marca do
 * criador e volta para `aqui`; sem assinatura, vai à página pública do criador.
 */
export async function exigirAssinante(handle: string, aqui: string) {
  const aluno = await usuarioDaSessao("app");
  if (!aluno) redirect(`/@${encodeURIComponent(handle)}/entrar?next=${encodeURIComponent(aqui)}`);
  const app = await appDoCriador(handle);
  if (!app) notFound();
  if (!(await faTemAcesso(aluno.id, app.criador.id))) redirect(`/@${app.criador.handle}`);
  return { aluno, ...app, base: `/@${app.criador.handle}` };
}

/**
 * Endereços antigos do app (/progresso, /perfil…): com um criador só, leva ao app dele; com vários,
 * ao "/" para escolher.
 */
export async function irParaOCriador(sub: string): Promise<never> {
  const aluno = await usuarioDaSessao("app");
  if (!aluno) redirect(`/login?next=${encodeURIComponent(sub || "/")}`);
  const criadores = await criadoresDoFa(aluno.id);
  redirect(criadores.length === 1 ? `/@${criadores[0].handle}${sub}` : "/");
}
