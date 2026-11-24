import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { cache } from "react";
import {
  CREDENCIAIS_INVALIDAS,
  getUsuarioPorAuth,
  normalizarEmail,
  papelCabeNoApp,
  registrarAcesso,
  registrarTentativa,
  resolverLogin,
  type Usuario,
  validarEmail,
  validarSenha,
  verificarLimite,
} from "./acesso";
import { ErroAcesso } from "./erros";
import { type AppSessao, clienteSessao } from "./sessao";

/**
 * Integração da sessão (Supabase Auth via cookies) com o Next.js — usada pelos dois apps.
 * Importar só em código de servidor (server components, actions, route handlers, proxy).
 */

export async function supabaseServidor(app: AppSessao) {
  const store = await cookies();
  return clienteSessao(app, {
    getAll: () => store.getAll(),
    setAll: (lista) => {
      try {
        for (const { name, value, options } of lista) store.set(name, value, options);
      } catch {
        // Server component não pode gravar cookie; o proxy renova a sessão na próxima request.
      }
    },
  });
}

export async function ipDaRequest() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Usuário da sessão (validada pelo JWT) — null se não logado, conta desativada ou de outro app. */
export const usuarioDaSessao = cache(async (app: AppSessao): Promise<Usuario | null> => {
  const sb = await supabaseServidor(app);
  const { data } = await sb.auth.getClaims();
  const authId = data?.claims?.sub;
  if (!authId) return null;
  const u = await getUsuarioPorAuth(authId);
  return u && u.status === "ativo" && papelCabeNoApp(u.role, app) ? u : null;
});

export type EstadoForm = { erro?: string; ok?: string } | null;

/** Login com e-mail e senha. Devolve a mensagem de erro, ou null quando a sessão foi aberta. */
export async function entrarComSenha(app: AppSessao, email: string, senha: string): Promise<string | null> {
  if (!email.trim() || !senha) return "Preencha os dois campos.";
  try {
    const { usuario, chaves } = await resolverLogin({ email, ip: await ipDaRequest(), app });
    if (!(await abrirSessao(app, usuario.email, senha))) {
      await registrarTentativa(chaves, false);
      return CREDENCIAIS_INVALIDAS;
    }
    await registrarTentativa(chaves, true);
    await registrarAcesso(usuario.id);
    return null;
  } catch (e) {
    if (e instanceof ErroAcesso) return e.message;
    throw e;
  }
}

/** Abre a sessão com e-mail e senha (logo após o cadastro, por exemplo). */
export async function abrirSessao(app: AppSessao, email: string, senha: string) {
  const sb = await supabaseServidor(app);
  const { error } = await sb.auth.signInWithPassword({ email: normalizarEmail(email), password: senha });
  return !error;
}

export async function sairDaSessao(app: AppSessao) {
  const sb = await supabaseServidor(app);
  await sb.auth.signOut();
}

/** Confere a senha atual (reautenticação) antes de trocar. */
export async function conferirSenha(app: AppSessao, usuario: Usuario, senha: string) {
  return abrirSessao(app, usuario.email, senha);
}

// ─────────────────────────── Proxy ───────────────────────────

/**
 * Renova os cookies de sessão a cada request e manda para /login quem não está logado
 * (exceto rotas públicas). A autorização de verdade acontece nas páginas e actions.
 */
export async function proxySessao(app: AppSessao, request: NextRequest, publicas: string[]) {
  let response = NextResponse.next({ request });
  const sb = clienteSessao(app, {
    getAll: () => request.cookies.getAll(),
    setAll: (lista) => {
      for (const { name, value } of lista) request.cookies.set(name, value);
      response = NextResponse.next({ request });
      for (const { name, value, options } of lista) response.cookies.set(name, value, options);
    },
  });
  const { data } = await sb.auth.getClaims();
  const path = request.nextUrl.pathname;
  const publica = publicas.some((p) => path === p || path.startsWith(`${p}/`));
  if (!data?.claims && !publica) {
    if (path.startsWith("/api/")) return new NextResponse("Não autorizado", { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    const redir = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) redir.cookies.set(c);
    return redir;
  }
  return response;
}

/** Só aceita redirecionamentos internos (evita open redirect via ?next=). */
export function destinoSeguro(next: unknown, padrao = "/") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : padrao;
}

// ─────────────────────────── Redefinição de senha por e-mail ───────────────────────────

/** Envia o link de redefinição. Não revela se o e-mail tem conta. */
export async function pedirRedefinicao(app: AppSessao, email: string, urlBase: string) {
  const e = normalizarEmail(email);
  if (validarEmail(e)) return "Informe um e-mail válido.";
  const chave = `reset:${e}`;
  try {
    await verificarLimite(chave, 3, 60);
  } catch (err) {
    if (err instanceof ErroAcesso) return err.message;
    throw err;
  }
  await registrarTentativa([chave], false);
  const sb = await supabaseServidor(app);
  await sb.auth.resetPasswordForEmail(e, { redirectTo: `${urlBase}/auth/confirmar?next=/redefinir-senha` });
  return null;
}

/** Troca o token do link de e-mail (PKCE `code` ou `token_hash`) por uma sessão. */
export async function confirmarLinkEmail(app: AppSessao, params: URLSearchParams) {
  const sb = await supabaseServidor(app);
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const tipo = params.get("type");
  if (code) return !(await sb.auth.exchangeCodeForSession(code)).error;
  if (tokenHash && tipo) return !(await sb.auth.verifyOtp({ token_hash: tokenHash, type: tipo as "recovery" | "email" })).error;
  return false;
}

/** Define a nova senha na sessão aberta pelo link de redefinição. */
export async function redefinirSenha(app: AppSessao, senha: string) {
  const erro = validarSenha(senha);
  if (erro) return erro;
  const sb = await supabaseServidor(app);
  const { error } = await sb.auth.updateUser({ password: senha });
  return error ? "Link expirado ou inválido. Peça um novo e-mail de redefinição." : null;
}
