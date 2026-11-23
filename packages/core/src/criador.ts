/**
 * Edu+ Criador (influenciadores): regras puras compartilhadas entre o painel do criador, o app do
 * aluno e o banco. A parceria é 70/30: 70% de cada venda ficam com o criador.
 */

/** Parte do criador em cada venda (os outros 30% ficam com a Edu+). */
export const PARTE_CRIADOR = 0.7;

/** Origens de divulgação que o painel sugere (o link público aceita `?origem=`). */
export const ORIGENS_DIVULGACAO = ["instagram", "tiktok", "youtube", "whatsapp"] as const;

/** Nome legível da origem gravada na assinatura. */
export function nomeDaOrigem(origem: string | null | undefined): string {
  if (!origem) return "Link direto";
  const nomes: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", whatsapp: "WhatsApp" };
  return nomes[origem] ?? origem.charAt(0).toUpperCase() + origem.slice(1);
}

/** Normaliza a origem vinda da URL (minúsculas, até 30 caracteres, só letras/números/-/_). */
export function limparOrigem(origem: string | null | undefined): string | null {
  const o = (origem ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 30);
  return o || null;
}

/** @handle: 3 a 30 caracteres, minúsculas, números, ponto e sublinhado (sem o "@"). */
export const HANDLE_REGEX = /^[a-z0-9._]{3,30}$/;

/** Limpa o que a pessoa digitou ("@Maria.Silva " → "maria.silva"). */
export function normalizarHandle(texto: string): string {
  return texto
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9._]/g, "");
}

/** Mensagem de erro do handle (null = válido). */
export function validarHandle(handle: string): string | null {
  if (handle.length < 3) return "O @ precisa ter pelo menos 3 caracteres.";
  if (handle.length > 30) return "O @ pode ter no máximo 30 caracteres.";
  if (!HANDLE_REGEX.test(handle)) return "Use só letras minúsculas, números, ponto e sublinhado.";
  return null;
}

/** Sugestão de @ a partir do nome ("Maria da Silva" → "mariadasilva"). */
export function handleDoNome(nome: string): string {
  const base = normalizarHandle(nome.replace(/\s+/g, ""));
  return (base.length >= 3 ? base : `${base}edu`).slice(0, 30);
}

/** "R$ 29,90" a partir de centavos. */
export function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "29,90" ou "29.90" → centavos (null se vazio; erro se inválido). */
export function lerPrecoEmCentavos(texto: string): number | null {
  const t = texto.trim().replace(/^R\$\s*/i, "");
  if (!t) return null;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const valor = Number(normal);
  if (!Number.isFinite(valor) || valor < 0 || valor > 10_000) throw new Error("Preço inválido. Use um valor como 29,90.");
  return Math.round(valor * 100);
}

/** Parte do criador (centavos) de uma receita bruta. */
export const parteDoCriador = (brutoCentavos: number) => Math.round(brutoCentavos * PARTE_CRIADOR);
