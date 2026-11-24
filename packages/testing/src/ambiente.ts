import { execFileSync } from "node:child_process";

/**
 * Liga os testes de integração ao Supabase local (`pnpm exec supabase start`). Lê URL e chaves de
 * `supabase status -o env` e preenche as variáveis que o `@edu/db` usa. Recusa qualquer endereço que
 * não seja local: os testes apagam dados.
 */

function lerStatus(): Record<string, string> {
  const saida = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const vars: Record<string, string> = {};
  for (const linha of saida.split(/\r?\n/)) {
    const m = linha.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (m) vars[m[1]] = m[2];
  }
  return vars;
}

export function ehLocal(url: string) {
  try {
    return ["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function configurarAmbienteLocal() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    const s = lerStatus();
    process.env.NEXT_PUBLIC_SUPABASE_URL = s.API_URL;
    process.env.SUPABASE_SECRET_KEY = s.SECRET_KEY || s.SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = s.PUBLISHABLE_KEY || s.ANON_KEY;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!ehLocal(url)) throw new Error(`Testes de integração só rodam no Supabase local (recebido: ${url || "nada"}).`);
  if (!process.env.SUPABASE_SECRET_KEY) throw new Error("Sem a chave do Supabase local: rode `pnpm exec supabase start`.");
  process.env.APP_TIMEZONE ??= "America/Sao_Paulo";
}

/** globalSetup do Vitest: roda uma vez antes dos testes de integração. */
export default function setup() {
  configurarAmbienteLocal();
}
