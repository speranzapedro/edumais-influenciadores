import { parteDoCriador } from "./criador";
import { diaLocal, TIMEZONE_PADRAO } from "./gamificacao";

/**
 * Painel comercial do criador: regras puras sobre as assinaturas do produto. O banco busca as linhas
 * (`@edu/db`) e estas funções agregam, o que deixa as contas testáveis sem Supabase.
 */

export type StatusAssinatura = "cortesia" | "pendente" | "ativa" | "inadimplente" | "cancelada" | "expirada";

/**
 * Status que liberam as trilhas para o fã. Inadimplente ainda tem acesso (a cobrança está atrasada,
 * não cancelada); pendente ainda não pagou a primeira vez.
 */
export const STATUS_COM_ACESSO: readonly StatusAssinatura[] = ["cortesia", "ativa", "inadimplente"];

export const temAcesso = (status: StatusAssinatura) => STATUS_COM_ACESSO.includes(status);

/** Status que contam como receita recorrente (assinatura paga). */
const STATUS_PAGANTES: readonly StatusAssinatura[] = ["ativa", "inadimplente"];

export interface AssinaturaVenda {
  aluno_id: string;
  status: StatusAssinatura;
  valor_centavos: number;
  origem: string | null;
  iniciada_em: string;
}

export interface ConclusaoAula {
  user_id: string;
  aula_id: string;
  concluida_em: string;
}

export interface PainelVendas {
  dias: number;
  /** Assinaturas pagas em dia. */
  ativas: number;
  /** Assinaturas com cobrança atrasada (ainda com acesso). */
  inadimplentes: number;
  /** Fãs que começaram a assinar e ainda não pagaram. */
  pendentes: number;
  /** Acessos liberados sem pagamento (lançamento). */
  cortesias: number;
  /** Novas assinaturas (qualquer status) no período. */
  novasNoPeriodo: number;
  canceladas: number;
  /** Receita bruta mensal recorrente das assinaturas pagas (centavos). */
  receitaMensal: number;
  /** Parte do criador (70%) da receita mensal (centavos). */
  parteCriador: number;
  /** Novas assinaturas por dia (AAAA-MM-DD), do mais antigo ao mais recente. */
  serie: { dia: string; novas: number }[];
  /** De onde vieram os fãs com acesso, da origem mais comum para a menos comum. */
  origens: { origem: string | null; total: number }[];
  /** Fãs com acesso que concluíram aula nos últimos 7 dias. */
  alunosAtivos7d: number;
  conclusaoPorTrilha: { id: string; titulo: string; totalAulas: number; comecaram: number; concluiram: number }[];
}

const DIA_MS = 86_400_000;

export function resumirVendas(p: {
  dias: number;
  agora?: Date;
  timeZone?: string;
  assinaturas: AssinaturaVenda[];
  /** Trilhas publicadas do produto, na ordem de exibição. */
  trilhas: { id: string; titulo: string }[];
  /** Aulas vigentes dessas trilhas. */
  aulas: { id: string; trilha_id: string }[];
  /** Conclusões dos fãs com acesso nessas aulas. */
  conclusoes: ConclusaoAula[];
}): PainelVendas {
  const agora = (p.agora ?? new Date()).getTime();
  const tz = p.timeZone ?? TIMEZONE_PADRAO;
  const dia = (instante: number) => diaLocal(new Date(instante), tz);
  const ass = p.assinaturas;
  const comAcesso = ass.filter((a) => temAcesso(a.status));
  const alunosComAcesso = new Set(comAcesso.map((a) => a.aluno_id));
  const conta = (s: StatusAssinatura) => ass.filter((a) => a.status === s).length;
  const receitaMensal = ass.filter((a) => STATUS_PAGANTES.includes(a.status)).reduce((s, a) => s + a.valor_centavos, 0);

  const porDia = new Map<string, number>();
  for (let i = p.dias - 1; i >= 0; i--) porDia.set(dia(agora - i * DIA_MS), 0);
  for (const a of ass) {
    const d = dia(new Date(a.iniciada_em).getTime());
    const n = porDia.get(d);
    if (n !== undefined) porDia.set(d, n + 1);
  }

  const origens = new Map<string | null, number>();
  for (const a of comAcesso) origens.set(a.origem, (origens.get(a.origem) ?? 0) + 1);

  const conclusoes = p.conclusoes.filter((c) => alunosComAcesso.has(c.user_id));
  const trilhaDaAula = new Map(p.aulas.map((a) => [a.id, a.trilha_id]));
  const seteDias = agora - 7 * DIA_MS;
  const desde = agora - p.dias * DIA_MS;

  return {
    dias: p.dias,
    ativas: conta("ativa"),
    inadimplentes: conta("inadimplente"),
    pendentes: conta("pendente"),
    cortesias: conta("cortesia"),
    novasNoPeriodo: ass.filter((a) => new Date(a.iniciada_em).getTime() >= desde).length,
    canceladas: conta("cancelada") + conta("expirada"),
    receitaMensal,
    parteCriador: parteDoCriador(receitaMensal),
    serie: [...porDia].map(([d, novas]) => ({ dia: d, novas })),
    origens: [...origens].map(([origem, total]) => ({ origem, total })).sort((a, b) => b.total - a.total),
    alunosAtivos7d: new Set(conclusoes.filter((c) => new Date(c.concluida_em).getTime() >= seteDias).map((c) => c.user_id)).size,
    conclusaoPorTrilha: p.trilhas.map((t) => {
      const total = p.aulas.filter((a) => a.trilha_id === t.id).length;
      const porAluno = new Map<string, number>();
      for (const c of conclusoes) if (trilhaDaAula.get(c.aula_id) === t.id) porAluno.set(c.user_id, (porAluno.get(c.user_id) ?? 0) + 1);
      return {
        id: t.id,
        titulo: t.titulo,
        totalAulas: total,
        comecaram: porAluno.size,
        concluiram: [...porAluno.values()].filter((n) => total > 0 && n >= total).length,
      };
    }),
  };
}

/** Uso de cada assinante: aulas concluídas no produto e a data da última. */
export function usoDoAssinante(alunoId: string, conclusoes: ConclusaoAula[]) {
  const minhas = conclusoes.filter((c) => c.user_id === alunoId);
  return {
    aulasConcluidas: minhas.length,
    ultimaAula: minhas.reduce<string | null>((m, c) => (!m || c.concluida_em > m ? c.concluida_em : m), null),
  };
}

/** Limite de execuções do agente por criador em 30 dias (sem plano pago ainda). */
export const LIMITE_AGENTE_PADRAO = 60;

/** Mensagem de bloqueio quando a cota do agente acabou (null = pode rodar). */
export function mensagemCotaAgente(usadas: number, limite: number): string | null {
  return usadas >= limite
    ? `Você chegou ao limite de ${limite} execuções do agente nos últimos 30 dias. Ele volta a ficar disponível conforme os dias passam.`
    : null;
}

/**
 * Confere a chave do link secreto de cadastro de criadores em tempo constante (não vaza, pelo tempo de
 * resposta, quantos caracteres batem). Chave esperada vazia nunca confere.
 */
export function chaveConfere(recebida: string | null | undefined, esperada: string | null | undefined): boolean {
  const a = recebida ?? "";
  const b = esperada ?? "";
  if (!b) return false;
  let dif = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) dif |= (a.charCodeAt(i) || 0) ^ b.charCodeAt(i);
  return dif === 0;
}
