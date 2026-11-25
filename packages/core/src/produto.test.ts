import { describe, expect, it } from "vitest";
import { normalizarSlug, SLUG_REGEX, SLUGS_RESERVADOS, slugDoNome, slugNumerado, validarSlugProduto } from "./produto";

describe("slug do produto", () => {
  it("normaliza o que a pessoa digitou", () => {
    expect(normalizarSlug("  Inglês  do Zero! ")).toBe("ingles-do-zero");
    expect(normalizarSlug("--Ação__Já--")).toBe("acao-ja");
    expect(normalizarSlug("x".repeat(60))).toHaveLength(40);
    expect(normalizarSlug(`${"a".repeat(39)} b`)).toBe("a".repeat(39));
  });

  it("valida formato, tamanho e nomes reservados", () => {
    expect(validarSlugProduto("ingles-do-zero")).toBeNull();
    expect(validarSlugProduto("ab")).toMatch("pelo menos 3");
    expect(validarSlugProduto("a".repeat(41))).toMatch("no máximo 40");
    expect(validarSlugProduto("-abc")).toMatch("hífen");
    expect(validarSlugProduto("Abc")).toMatch("minúsculas");
    expect(validarSlugProduto("entrar")).toMatch("reservado");
  });

  it("sugere um slug sempre válido a partir do nome", () => {
    for (const nome of ["Inglês do Zero", "TI", "", "!!!", "Perfil", "Trilhas", "Ação e Reação em 2026", "ç".repeat(80)]) {
      const s = slugDoNome(nome);
      expect(validarSlugProduto(s), `${nome} → ${s}`).toBeNull();
    }
    expect(slugDoNome("Perfil")).toBe("perfil-curso");
    expect(slugDoNome("")).toBe("curso");
  });

  it("numera para desempatar sem passar de 40 caracteres", () => {
    expect(slugNumerado("ingles", 1)).toBe("ingles");
    expect(slugNumerado("ingles", 2)).toBe("ingles-2");
    const longo = slugNumerado(`${"a".repeat(37)}-bc`, 12);
    expect(longo).toHaveLength(40);
    expect(SLUG_REGEX.test(longo)).toBe(true);
    expect(longo).toBe(`${"a".repeat(37)}-12`);
    expect(slugNumerado(`${"a".repeat(36)}-xyz`, 3)).toBe(`${"a".repeat(36)}-x-3`);
  });

  it("os reservados cobrem as rotas do app do fã", () => {
    for (const r of ["entrar", "progresso", "perfil", "notificacoes", "trilha", "aula", "marca", "api"]) expect(SLUGS_RESERVADOS.has(r)).toBe(true);
  });
});
