import { describe, expect, it } from "vitest";
import { calcularStreak, conquistasAtingidas, diaLocal, recompensasConclusao, somarDias } from "./gamificacao";

const base = { aulaId: "a1", trilhaId: "t1", aulaJaConcluida: false, trilhaCompletaAgora: false };

function diasSeguidos(fim: string, n: number) {
  return Array.from({ length: n }, (_, i) => somarDias(fim, -i));
}

describe("diaLocal", () => {
  it("usa o fuso de São Paulo na virada do dia", () => {
    // 01:30 UTC de 2 de out = 22:30 de 1 de out em São Paulo (UTC-3)
    expect(diaLocal(new Date("2026-10-02T01:30:00Z"))).toBe("2026-10-01");
    expect(diaLocal(new Date("2026-10-02T03:30:00Z"))).toBe("2026-10-02");
  });
});

describe("calcularStreak", () => {
  it("conta dias seguidos terminando hoje", () => {
    expect(calcularStreak(diasSeguidos("2026-10-01", 4), "2026-10-01")).toMatchObject({ atual: 4, ativoHoje: true });
  });
  it("mantém o streak vivo se estudou ontem mas ainda não hoje", () => {
    expect(calcularStreak(diasSeguidos("2026-09-30", 3), "2026-10-01")).toMatchObject({ atual: 3, ativoHoje: false });
  });
  it("zera quando pula um dia, preservando o recorde", () => {
    const s = calcularStreak(diasSeguidos("2026-09-28", 5), "2026-10-01");
    expect(s.atual).toBe(0);
    expect(s.recorde).toBe(5);
  });
});

describe("recompensasConclusao", () => {
  it("primeira aula do dia 1: +10 da aula e +5 do streak", () => {
    const r = recompensasConclusao({ ...base, diasAtivosAntes: [], hoje: "2026-10-01" });
    expect(r.eventos.map((e) => [e.fonte, e.pontos])).toEqual([
      ["aula", 10],
      ["streak", 5],
    ]);
    expect(r.xpGanho).toBe(15);
  });

  it("segunda aula no mesmo dia não repete o +5", () => {
    const r = recompensasConclusao({ ...base, diasAtivosAntes: ["2026-10-01"], hoje: "2026-10-01" });
    expect(r.xpGanho).toBe(10);
  });

  it("refazer aula já concluída não dá XP de aula", () => {
    const r = recompensasConclusao({ ...base, aulaJaConcluida: true, diasAtivosAntes: ["2026-10-01"], hoje: "2026-10-01" });
    expect(r.xpGanho).toBe(0);
  });

  it.each([
    [7, 50],
    [30, 100],
    [180, 250],
  ])("bônus ao atingir %i dias seguidos (+%i)", (n, bonus) => {
    const hoje = "2026-10-01";
    const r = recompensasConclusao({ ...base, diasAtivosAntes: diasSeguidos(somarDias(hoje, -1), n - 1), hoje });
    expect(r.marcoAtingido).toBe(n);
    expect(r.eventos.find((e) => e.fonte === "streak_bonus")?.pontos).toBe(bonus);
    expect(r.xpGanho).toBe(10 + 5 + bonus);
  });

  it("sem bônus no 8º dia", () => {
    const hoje = "2026-10-01";
    const r = recompensasConclusao({ ...base, diasAtivosAntes: diasSeguidos(somarDias(hoje, -1), 7), hoje });
    expect(r.marcoAtingido).toBeNull();
  });

  it("trilha concluída soma +50", () => {
    const r = recompensasConclusao({ ...base, trilhaCompletaAgora: true, diasAtivosAntes: ["2026-10-01"], hoje: "2026-10-01" });
    expect(r.xpGanho).toBe(60);
  });

  it("ref_keys diferentes para bônus de streaks reconstruídos", () => {
    const a = recompensasConclusao({ ...base, diasAtivosAntes: diasSeguidos("2026-09-06", 6), hoje: "2026-09-07" });
    const b = recompensasConclusao({ ...base, diasAtivosAntes: diasSeguidos("2026-09-30", 6), hoje: "2026-10-01" });
    const ka = a.eventos.find((e) => e.fonte === "streak_bonus")!.ref_key;
    const kb = b.eventos.find((e) => e.fonte === "streak_bonus")!.ref_key;
    expect(ka).not.toBe(kb);
  });
});

describe("conquistas", () => {
  it("desbloqueia por métrica", () => {
    const keys = conquistasAtingidas({ aulasConcluidas: 6, trilhasConcluidas: 1, aulasPerfeitas: 0, streakRecorde: 7, xpTotal: 200 });
    expect(keys).toEqual(expect.arrayContaining(["primeira_aula", "aulas_5", "primeira_trilha", "streak_3", "streak_7"]));
    expect(keys).not.toContain("quiz_perfeito");
  });
});
