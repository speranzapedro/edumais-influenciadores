/**
 * Produto do criador: cada um tem um endereço próprio dentro da página do criador
 * (`/@criador/<slug>`). O slug é único por criador e não pode colidir com as rotas do app do fã.
 */

/** 3 a 40 caracteres: minúsculas, números e hífen, sem hífen nas pontas. Igual ao check do banco. */
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** Caminhos do app do fã dentro de `/@criador/…`: um produto não pode usar esses nomes. */
export const SLUGS_RESERVADOS: ReadonlySet<string> = new Set([
  "api",
  "app",
  "assinar",
  "aula",
  "aulas",
  "cadastro",
  "conquistas",
  "conta",
  "entrar",
  "icone",
  "login",
  "manifest",
  "marca",
  "notificacoes",
  "perfil",
  "produtos",
  "progresso",
  "sair",
  "trilha",
  "trilhas",
]);

/** Limpa o que a pessoa digitou ("Inglês  do Zero!" → "ingles-do-zero"). */
export function normalizarSlug(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
}

/** Mensagem de erro do slug (null = válido). */
export function validarSlugProduto(slug: string): string | null {
  if (slug.length < 3) return "O endereço precisa ter pelo menos 3 caracteres.";
  if (slug.length > 40) return "O endereço pode ter no máximo 40 caracteres.";
  if (!SLUG_REGEX.test(slug)) return "Use só letras minúsculas, números e hífen (sem hífen no começo ou no fim).";
  if (SLUGS_RESERVADOS.has(slug)) return "Este endereço é reservado pela Edu+. Escolha outro.";
  return null;
}

/** Sugestão de slug a partir do nome do produto, sempre válida. */
export function slugDoNome(nome: string): string {
  let s = normalizarSlug(nome);
  if (s.length < 3 || SLUGS_RESERVADOS.has(s)) s = normalizarSlug(`${s}-curso`);
  return s.length >= 3 ? s : "curso";
}

/** Variação numerada para desempatar ("ingles" → "ingles-2"), cabendo nos 40 caracteres. */
export function slugNumerado(base: string, n: number): string {
  if (n <= 1) return base;
  const fim = `-${n}`;
  return `${base.slice(0, 40 - fim.length).replace(/-+$/, "")}${fim}`;
}
