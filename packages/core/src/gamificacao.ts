/**
 * Regras de gamificação da PoC.
 * - Aula concluída (primeira vez): +10 XP
 * - Trilha concluída: +50 XP
 * - Cada dia ativo do streak: +5 XP (concedido na primeira aula do dia, inclusive o dia 1)
 * - Bônus ao atingir 7 / 30 / 180 dias seguidos: +50 / +100 / +250 XP
 * Dia ativo = concluiu ao menos uma aula naquele dia (fuso da instituição).
 */

export const XP = {
  aula: 10,
  trilha: 50,
  diaStreak: 5,
  bonusStreak: { 7: 50, 30: 100, 180: 250 } as Record<number, number>,
} as const;

export const MARCOS_STREAK = [7, 30, 180] as const;

export const TIMEZONE_PADRAO = "America/Sao_Paulo";

/** Data local (YYYY-MM-DD) de um instante no fuso informado. */
export function diaLocal(instante: Date = new Date(), timeZone: string = TIMEZONE_PADRAO): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instante);
}

export function somarDias(dia: string, delta: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

export interface StreakInfo {
  atual: number;
  recorde: number;
  ativoHoje: boolean;
  inicioAtual: string | null;
}

/**
 * Streak atual: dias consecutivos terminando hoje — ou ontem, se o aluno ainda não
 * estudou hoje (o streak continua "vivo" até o fim do dia).
 */
export function calcularStreak(dias: Iterable<string>, hoje: string): StreakInfo {
  const set = new Set(dias);
  const ordenados = [...set].sort();

  let recorde = 0;
  let corrida = 0;
  let anterior: string | null = null;
  for (const d of ordenados) {
    corrida = anterior && somarDias(anterior, 1) === d ? corrida + 1 : 1;
    recorde = Math.max(recorde, corrida);
    anterior = d;
  }

  const ativoHoje = set.has(hoje);
  let cursor = ativoHoje ? hoje : somarDias(hoje, -1);
  let atual = 0;
  while (set.has(cursor)) {
    atual++;
    cursor = somarDias(cursor, -1);
  }
  return { atual, recorde, ativoHoje, inicioAtual: atual ? somarDias(cursor, 1) : null };
}

export interface EventoXp {
  fonte: "aula" | "trilha" | "streak" | "streak_bonus";
  ref_key: string;
  pontos: number;
  descricao: string;
}

export interface EntradaConclusao {
  aulaId: string;
  trilhaId: string;
  aulaJaConcluida: boolean;
  trilhaCompletaAgora: boolean;
  diasAtivosAntes: Iterable<string>;
  hoje: string;
  /**
   * Placar a que os pontos pertencem (o criador): prefixa as chaves da ofensiva, que não têm id próprio,
   * para o mesmo dia contar uma vez em cada criador. Aula e trilha já têm id único.
   */
  escopo?: string;
}

export interface ResultadoConclusao {
  eventos: EventoXp[];
  xpGanho: number;
  streak: StreakInfo;
  novoDiaAtivo: boolean;
  marcoAtingido: number | null;
}

/** Calcula os eventos de XP de uma conclusão de aula. Idempotência garantida pelos ref_keys. */
export function recompensasConclusao(e: EntradaConclusao): ResultadoConclusao {
  const eventos: EventoXp[] = [];
  const dias = new Set(e.diasAtivosAntes);
  const novoDiaAtivo = !dias.has(e.hoje);

  if (!e.aulaJaConcluida) {
    eventos.push({ fonte: "aula", ref_key: e.aulaId, pontos: XP.aula, descricao: "Aula concluída" });
  }

  dias.add(e.hoje);
  const streak = calcularStreak(dias, e.hoje);
  let marcoAtingido: number | null = null;

  if (novoDiaAtivo) {
    eventos.push({
      fonte: "streak",
      ref_key: `${e.escopo ? `${e.escopo}:` : ""}dia:${e.hoje}`,
      pontos: XP.diaStreak,
      descricao: `Streak de ${streak.atual} ${streak.atual === 1 ? "dia" : "dias"}`,
    });
    if ((MARCOS_STREAK as readonly number[]).includes(streak.atual)) {
      marcoAtingido = streak.atual;
      eventos.push({
        fonte: "streak_bonus",
        ref_key: `${e.escopo ? `${e.escopo}:` : ""}${streak.atual}:${streak.inicioAtual}`,
        pontos: XP.bonusStreak[streak.atual],
        descricao: `Bônus: ${streak.atual} dias seguidos!`,
      });
    }
  }

  if (e.trilhaCompletaAgora) {
    eventos.push({ fonte: "trilha", ref_key: e.trilhaId, pontos: XP.trilha, descricao: "Trilha concluída" });
  }

  return { eventos, xpGanho: eventos.reduce((s, x) => s + x.pontos, 0), streak, novoDiaAtivo, marcoAtingido };
}

// ───────────────────────────── Conquistas ─────────────────────────────

export interface EstatisticasAluno {
  aulasConcluidas: number;
  trilhasConcluidas: number;
  aulasPerfeitas: number;
  streakRecorde: number;
  xpTotal: number;
}

export interface Conquista {
  key: string;
  titulo: string;
  descricao: string;
  icone: string;
  cor: "violet" | "blue" | "orange" | "green" | "pink" | "amber";
  meta: number;
  medida: keyof EstatisticasAluno;
}

export const CONQUISTAS: Conquista[] = [
  {
    key: "primeira_aula",
    titulo: "Primeiro passo",
    descricao: "Conclua sua primeira aula",
    icone: "footprints",
    cor: "violet",
    meta: 1,
    medida: "aulasConcluidas",
  },
  { key: "aulas_5", titulo: "Embalado", descricao: "Conclua 5 aulas", icone: "zap", cor: "blue", meta: 5, medida: "aulasConcluidas" },
  { key: "aulas_25", titulo: "Maratonista", descricao: "Conclua 25 aulas", icone: "rocket", cor: "orange", meta: 25, medida: "aulasConcluidas" },
  { key: "aulas_50", titulo: "Incansável", descricao: "Conclua 50 aulas", icone: "mountain", cor: "pink", meta: 50, medida: "aulasConcluidas" },
  {
    key: "primeira_trilha",
    titulo: "Trilha completa",
    descricao: "Conclua sua primeira trilha",
    icone: "flag",
    cor: "green",
    meta: 1,
    medida: "trilhasConcluidas",
  },
  { key: "trilhas_3", titulo: "Explorador", descricao: "Conclua 3 trilhas", icone: "compass", cor: "amber", meta: 3, medida: "trilhasConcluidas" },
  {
    key: "quiz_perfeito",
    titulo: "Gabaritou",
    descricao: "Acerte todos os quizzes de uma aula",
    icone: "target",
    cor: "green",
    meta: 1,
    medida: "aulasPerfeitas",
  },
  { key: "perfeccionista", titulo: "Perfeccionista", descricao: "Gabarite 10 aulas", icone: "gem", cor: "violet", meta: 10, medida: "aulasPerfeitas" },
  { key: "streak_3", titulo: "Aquecendo", descricao: "3 dias seguidos estudando", icone: "flame", cor: "orange", meta: 3, medida: "streakRecorde" },
  { key: "streak_7", titulo: "Semana de fogo", descricao: "7 dias seguidos estudando", icone: "flame", cor: "pink", meta: 7, medida: "streakRecorde" },
  {
    key: "streak_30",
    titulo: "Mês imparável",
    descricao: "30 dias seguidos estudando",
    icone: "calendar-check",
    cor: "blue",
    meta: 30,
    medida: "streakRecorde",
  },
  { key: "streak_180", titulo: "Lenda", descricao: "180 dias seguidos estudando", icone: "crown", cor: "amber", meta: 180, medida: "streakRecorde" },
  { key: "xp_500", titulo: "500 XP", descricao: "Acumule 500 XP", icone: "star", cor: "violet", meta: 500, medida: "xpTotal" },
  { key: "xp_1000", titulo: "Mil e um", descricao: "Acumule 1.000 XP", icone: "trophy", cor: "amber", meta: 1000, medida: "xpTotal" },
];

export function conquistasAtingidas(stats: EstatisticasAluno): string[] {
  return CONQUISTAS.filter((c) => stats[c.medida] >= c.meta).map((c) => c.key);
}

export function progressoConquista(c: Conquista, stats: EstatisticasAluno) {
  const atual = Math.min(stats[c.medida], c.meta);
  return { atual, meta: c.meta, percentual: Math.round((atual / c.meta) * 100) };
}

/** Nível derivado do XP (apenas visual): 100 XP no nível 1, crescendo 25% a cada nível. */
export function nivelPorXp(xp: number) {
  let nivel = 1;
  let piso = 0;
  let passo = 100;
  while (xp >= piso + passo) {
    piso += passo;
    nivel++;
    passo = Math.round(passo * 1.25);
  }
  return { nivel, xpNoNivel: xp - piso, xpParaProximo: passo };
}
