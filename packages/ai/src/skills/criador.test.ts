import { describe, expect, it } from "vitest";
import { skillFeedback } from "../feedback/prompt";
import { AJUSTES_CRIADOR, type PerfilCriadorIA, SKILL_REFINAMENTO, skillBase } from "./base";
import { promptRevisor } from "./revisor";

const criador: PerfilCriadorIA = {
  nome: "Bia História",
  publico: 'Seguidores de Bia História (@biahistoria) que assinaram "Revoluções que mudaram o mundo".',
};

const ETAPAS = ["visao", "ementa", "cards", "aulas"] as const;

describe("prompts do estúdio do criador", () => {
  it("o papel fala com o criador de conteúdo e descreve os seguidores", () => {
    const base = skillBase(criador);
    expect(base).toContain("Bia História, criador de conteúdo que vende esta trilha aos próprios seguidores");
    expect(base).toContain(`Quem vai estudar esta trilha: ${criador.publico}`);
    expect(base).toContain("conhecimento consolidado da disciplina");
  });

  it("não sobrou contexto de escola, turma ou aluno particular", () => {
    const tudo = [skillBase(criador), SKILL_REFINAMENTO, ...ETAPAS.map((e) => AJUSTES_CRIADOR[e]), ...ETAPAS.map((e) => promptRevisor(e, criador))].join("\n");
    expect(tudo).not.toMatch(/instituição|turma|aluno particular|curso técnico/i);
  });

  it("há ajustes do criador para as quatro etapas", () => {
    for (const e of ETAPAS) expect(AJUSTES_CRIADOR[e]).toMatch(/^## Trilha do criador/);
  });

  it("o revisor mede a adequação aos seguidores do criador", () => {
    const r = promptRevisor("cards", criador);
    expect(r).toContain("Bia História, criador de conteúdo, vende aos seguidores");
    expect(r).toContain("no jeito de falar do criador");
    expect(promptRevisor("aulas", criador)).toContain("adequados aos seguidores do criador e ao objetivo da trilha");
  });

  it("o feedback da pergunta aberta fala como tutor do criador", () => {
    const f = skillFeedback({ nome: criador.nome, publico: criador.publico });
    expect(f).toContain("Bia História, criador de conteúdo, ensina os próprios seguidores");
    expect(f).toContain("como um bom tutor animado e próximo");
    expect(f).toContain(criador.publico);
    expect(f).not.toContain("curso técnico");
  });
});
