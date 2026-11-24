import { describe, expect, it } from "vitest";
import { type AssinaturaVenda, chaveConfere, mensagemCotaAgente, resumirVendas, temAcesso, usoDoAssinante } from "./vendas";

const agora = new Date("2026-11-20T15:00:00Z");
const diasAtras = (n: number) => new Date(agora.getTime() - n * 86_400_000).toISOString();

const assinaturas: AssinaturaVenda[] = [
  { aluno_id: "a1", status: "ativa", valor_centavos: 2990, origem: "instagram", iniciada_em: diasAtras(0) },
  { aluno_id: "a2", status: "inadimplente", valor_centavos: 2990, origem: "instagram", iniciada_em: diasAtras(2) },
  { aluno_id: "a3", status: "cortesia", valor_centavos: 0, origem: null, iniciada_em: diasAtras(2) },
  { aluno_id: "a4", status: "pendente", valor_centavos: 2990, origem: "tiktok", iniciada_em: diasAtras(1) },
  { aluno_id: "a5", status: "cancelada", valor_centavos: 2990, origem: "tiktok", iniciada_em: diasAtras(40) },
  { aluno_id: "a6", status: "expirada", valor_centavos: 0, origem: null, iniciada_em: diasAtras(10) },
];

describe("resumirVendas", () => {
  const r = resumirVendas({
    dias: 7,
    agora,
    assinaturas,
    trilhas: [
      { id: "t1", titulo: "Começo" },
      { id: "t2", titulo: "Vazia" },
    ],
    aulas: [
      { id: "x1", trilha_id: "t1" },
      { id: "x2", trilha_id: "t1" },
    ],
    conclusoes: [
      { user_id: "a1", aula_id: "x1", concluida_em: diasAtras(1) },
      { user_id: "a1", aula_id: "x2", concluida_em: diasAtras(1) },
      { user_id: "a3", aula_id: "x1", concluida_em: diasAtras(9) },
      // Cancelou: não conta mais no uso.
      { user_id: "a5", aula_id: "x1", concluida_em: diasAtras(1) },
    ],
  });

  it("conta cada status", () => {
    expect(r).toMatchObject({ ativas: 1, inadimplentes: 1, pendentes: 1, cortesias: 1, canceladas: 2 });
  });

  it("soma a receita das pagantes e calcula a parte do criador", () => {
    expect(r.receitaMensal).toBe(5980);
    expect(r.parteCriador).toBe(4186);
  });

  it("monta a série diária do período e as novas no período", () => {
    expect(r.serie).toHaveLength(7);
    expect(r.serie.at(-1)).toEqual({ dia: "2026-11-20", novas: 1 });
    expect(r.serie.reduce((s, d) => s + d.novas, 0)).toBe(4);
    expect(r.novasNoPeriodo).toBe(4);
  });

  it("agrupa as origens de quem tem acesso", () => {
    expect(r.origens).toEqual([
      { origem: "instagram", total: 2 },
      { origem: null, total: 1 },
    ]);
  });

  it("mede o uso: ativos na semana e conclusão por trilha", () => {
    expect(r.alunosAtivos7d).toBe(1);
    expect(r.conclusaoPorTrilha).toEqual([
      { id: "t1", titulo: "Começo", totalAulas: 2, comecaram: 2, concluiram: 1 },
      { id: "t2", titulo: "Vazia", totalAulas: 0, comecaram: 0, concluiram: 0 },
    ]);
  });
});

describe("regras de assinatura", () => {
  it("libera acesso para cortesia, ativa e inadimplente", () => {
    expect(["cortesia", "ativa", "inadimplente"].every((s) => temAcesso(s as never))).toBe(true);
    expect(["pendente", "cancelada", "expirada"].some((s) => temAcesso(s as never))).toBe(false);
  });

  it("resume o uso de um assinante", () => {
    const uso = usoDoAssinante("a1", [
      { user_id: "a1", aula_id: "x1", concluida_em: "2026-11-01T10:00:00Z" },
      { user_id: "a1", aula_id: "x2", concluida_em: "2026-11-03T10:00:00Z" },
      { user_id: "a2", aula_id: "x1", concluida_em: "2026-11-05T10:00:00Z" },
    ]);
    expect(uso).toEqual({ aulasConcluidas: 2, ultimaAula: "2026-11-03T10:00:00Z" });
    expect(usoDoAssinante("a9", [])).toEqual({ aulasConcluidas: 0, ultimaAula: null });
  });

  it("bloqueia o agente ao atingir a cota", () => {
    expect(mensagemCotaAgente(59, 60)).toBeNull();
    expect(mensagemCotaAgente(60, 60)).toContain("limite de 60 execuções");
  });

  it("confere a chave do link de cadastro", () => {
    expect(chaveConfere("abc123", "abc123")).toBe(true);
    expect(chaveConfere("abc124", "abc123")).toBe(false);
    expect(chaveConfere("abc", "abc123")).toBe(false);
    expect(chaveConfere("abc1234", "abc123")).toBe(false);
    expect(chaveConfere(null, "abc123")).toBe(false);
    expect(chaveConfere("", "")).toBe(false);
    expect(chaveConfere("x", undefined)).toBe(false);
  });
});
