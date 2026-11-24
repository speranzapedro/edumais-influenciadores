import { type CookieMethodsServer, createServerClient } from "@supabase/ssr";

/**
 * Os dois apps: o painel do criador e o app do fã. Cada um guarda a sessão num cookie próprio
 * (em localhost as portas compartilham cookies), com um prefixo por ambiente.
 */
export type AppSessao = "painel" | "app";

export function clienteSessao(app: AppSessao, cookies: CookieMethodsServer) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env.local.");
  return createServerClient(url, chave, { cookies, cookieOptions: { name: `${process.env.SESSAO_COOKIE_PREFIXO || "edu"}-${app}` } });
}
