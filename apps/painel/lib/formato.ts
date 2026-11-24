/** "agora", "há 5 min", "há 3 h", "há 2 d" — para atividade e últimos acessos. */
export function haQuanto(iso: string | null | undefined) {
  if (!iso) return "nunca";
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d < 30 ? `há ${d} d` : `há ${Math.round(d / 30)} mês(es)`;
}

/** Dias inteiros desde a data (null = nunca). */
export function diasDesde(iso: string | null | undefined) {
  return iso ? Math.floor((Date.now() - Date.parse(iso)) / 86_400_000) : null;
}

export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export const pct = (feitas: number, total: number) => (total ? Math.round((feitas / total) * 100) : 0);
