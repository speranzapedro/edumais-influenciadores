import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type Db = SupabaseClient<Database>;

let cliente: Db | null = null;

/** Cliente server-side com a secret key. Nunca importar em componentes de cliente. */
export function db(): Db {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local da raiz do monorepo.");
  }
  cliente = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cliente;
}

/**
 * Lança erro legível quando uma query do Supabase falha. Sem erro, listas e single() sempre
 * trazem dados; mutações sem .select() devolvem null (o chamador ignora o retorno).
 */
export function ok<T>(res: { data: T; error: { message: string } | null }, contexto: string): NonNullable<T> {
  if (res.error) throw new Error(`[db] ${contexto}: ${res.error.message}`);
  return res.data as NonNullable<T>;
}

/** Busca todas as linhas de uma consulta, paginando de 1000 em 1000 (limite do PostgREST). */
export async function todas<T>(
  consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  contexto: string,
): Promise<T[]> {
  const saida: T[] = [];
  for (let de = 0; ; de += 1000) {
    const r = await consulta(de, de + 999);
    if (r.error) throw new Error(`[db] ${contexto}: ${r.error.message}`);
    saida.push(...(r.data ?? []));
    if (!r.data || r.data.length < 1000) return saida;
  }
}

/** Para consultas maybeSingle(): devolve null quando o registro não existe. */
export function talvez<R extends { data: unknown; error: { message: string } | null }>(res: R, contexto: string): NonNullable<R["data"]> | null {
  if (res.error) throw new Error(`[db] ${contexto}: ${res.error.message}`);
  return (res.data ?? null) as NonNullable<R["data"]> | null;
}
