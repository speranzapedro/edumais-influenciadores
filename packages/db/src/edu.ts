import { randomUUID } from "node:crypto";
import { TIMEZONE_PADRAO } from "@edu/core";
import type { Usuario } from "./acesso";
import { trilhaLiberada } from "./aluno";
import { db, ok, talvez } from "./client";
import type { Json } from "./database.types";

/**
 * Edu, o tutor de IA da trilha, do lado do aluno: quem pode usar, a conversa atual, o limite diário,
 * as sugestões, a avaliação das respostas e o aviso da primeira vez. A geração fica em @edu/ai/tutor.
 */

export const limiteEduDia = () => Number(process.env.LIMITE_EDU_DIA) || 30;
/** Trocas exibidas ao reabrir uma conversa (o modelo recebe só as últimas, ver MAX_TROCAS_HISTORICO). */
const TROCAS_EXIBIDAS = 20;
const tz = () => process.env.APP_TIMEZONE || TIMEZONE_PADRAO;

export class ErroEdu extends Error {}

export interface FonteEdu {
  tipo: "aula" | "card" | "material";
  rotulo: string;
  aulaId: string | null;
}

export interface TrocaEdu {
  /** Id da resposta (usado na avaliação). */
  id: string;
  pergunta: string;
  resposta: string;
  fontes: FonteEdu[];
  relacionado: boolean;
  /** Parte da resposta é conhecimento geral, fora do material da trilha. */
  geral: boolean;
  avaliacao: "util" | "nao_ajudou" | null;
  motivo: string | null;
}

export interface EstadoEdu {
  avisoVisto: boolean;
  restantes: number;
  limite: number;
  sugestoes: string[];
  conversaId: string | null;
  trocas: TrocaEdu[];
}

/** O Edu aparece para o fã: trilha liberada para ele, Edu ligado na trilha e índice pronto. */
export async function eduDisponivel(aluno: Usuario, trilhaId: string) {
  if (process.env.TUTOR_HABILITADO !== "true") return false;
  if (!(await trilhaLiberada(aluno, trilhaId))) return false;
  const [t, i] = await Promise.all([
    db().from("trilhas").select("tutor_ativo").eq("id", trilhaId).maybeSingle(),
    db().from("tutor_indices").select("mapa").eq("trilha_id", trilhaId).maybeSingle(),
  ]);
  return !!talvez(t, "trilha")?.tutor_ativo && !!talvez(i, "índice")?.mapa;
}

export async function perguntasEduHoje(alunoId: string) {
  return ok(await db().rpc("tutor_perguntas_hoje", { p_user: alunoId, p_tz: tz() }), "perguntas de hoje");
}

interface Detalhes {
  fontes?: FonteEdu[];
  relacionado?: boolean;
  conhecimentoGeral?: boolean;
}

/** Trocas de uma conversa do aluno nesta trilha, da mais antiga para a mais nova. */
async function trocasDaConversa(alunoId: string, trilhaId: string, conversaId: string, limite: number) {
  const msgs = ok(
    await db()
      .from("tutor_mensagens")
      .select("id, role, texto, trechos, avaliacao, motivo, created_at")
      .eq("conversa_id", conversaId)
      .eq("user_id", alunoId)
      .eq("trilha_id", trilhaId)
      .order("created_at", { ascending: false })
      .limit(limite * 2),
    "conversa",
  ).reverse();
  const trocas: TrocaEdu[] = [];
  for (let i = 0; i + 1 < msgs.length; i++) {
    const [p, r] = [msgs[i], msgs[i + 1]];
    if (p.role !== "user" || r.role !== "assistant") continue;
    const d = (r.trechos ?? {}) as Detalhes;
    trocas.push({
      id: r.id,
      pergunta: p.texto,
      resposta: r.texto,
      fontes: d.fontes ?? [],
      relacionado: !!d.relacionado,
      geral: !!d.conhecimentoGeral,
      avaliacao: r.avaliacao,
      motivo: r.motivo,
    });
    i++;
  }
  return trocas;
}

/** Tudo o que o painel do Edu precisa ao abrir: conversa atual, sugestões, aviso e perguntas restantes. */
export async function abrirEdu(aluno: Usuario, trilhaId: string, aulaId: string | null): Promise<EstadoEdu | null> {
  if (!(await eduDisponivel(aluno, trilhaId))) return null;
  const [ultima, indice, usadas] = await Promise.all([
    db()
      .from("tutor_mensagens")
      .select("conversa_id")
      .eq("user_id", aluno.id)
      .eq("trilha_id", trilhaId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db().from("tutor_indices").select("sugestoes").eq("trilha_id", trilhaId).maybeSingle(),
    perguntasEduHoje(aluno.id),
  ]);
  const conversaId = talvez(ultima, "última conversa")?.conversa_id ?? null;
  const s = (talvez(indice, "índice")?.sugestoes ?? null) as { trilha?: string[]; aulas?: Record<string, string[]> } | null;
  const sugestoes = aulaId ? [...(s?.aulas?.[aulaId] ?? []), ...(s?.trilha ?? [])].slice(0, 3) : (s?.trilha ?? []).slice(0, 3);
  return {
    avisoVisto: !!aluno.tutor_aviso_em,
    restantes: Math.max(0, limiteEduDia() - usadas),
    limite: limiteEduDia(),
    sugestoes,
    conversaId,
    trocas: conversaId ? await trocasDaConversa(aluno.id, trilhaId, conversaId, TROCAS_EXIBIDAS) : [],
  };
}

/**
 * Valida e prepara uma pergunta: acesso, limite do dia, conversa (a do aluno nesta trilha ou uma nova),
 * histórico para o modelo e a aula em que o aluno está (pista para a busca e a resposta).
 */
export async function prepararPerguntaEdu(p: { aluno: Usuario; trilhaId: string; conversaId: string | null; aulaId: string | null; historico: number }) {
  if (!(await eduDisponivel(p.aluno, p.trilhaId))) throw new ErroEdu("O Edu não está disponível nesta trilha.");
  const usadas = await perguntasEduHoje(p.aluno.id);
  if (usadas >= limiteEduDia()) throw new ErroEdu(`Você usou as ${limiteEduDia()} perguntas de hoje. Amanhã tem mais!`);

  const [trilha, indice, aula] = await Promise.all([
    db().from("trilhas").select("id, titulo").eq("id", p.trilhaId).single(),
    db().from("tutor_indices").select("mapa").eq("trilha_id", p.trilhaId).single(),
    p.aulaId ? db().from("aulas").select("ordem, titulo").eq("id", p.aulaId).eq("trilha_id", p.trilhaId).maybeSingle() : Promise.resolve(null),
  ]);
  const t = ok(trilha, "trilha");
  const mapa = ok(indice, "índice").mapa;
  if (!mapa) throw new ErroEdu("O Edu não está disponível nesta trilha.");
  const a = aula ? talvez(aula, "aula") : null;
  const historico = p.conversaId ? await trocasDaConversa(p.aluno.id, p.trilhaId, p.conversaId, p.historico) : [];
  return {
    trilha: { id: t.id, titulo: t.titulo, mapa },
    // Conversa sem histórico deste aluno nesta trilha (nova ou de outra pessoa) vira uma conversa nova.
    conversaId: historico.length ? p.conversaId! : randomUUID(),
    historico: historico.map((h) => ({ pergunta: h.pergunta, resposta: h.resposta })),
    aulaAtual: a ? `Aula ${a.ordem}: ${a.titulo}` : null,
    aulaId: a ? p.aulaId : null,
    restantesDepois: Math.max(0, limiteEduDia() - usadas - 1),
  };
}

/** Grava a troca e devolve o id da resposta (para a avaliação). */
export async function registrarTrocaEdu(p: {
  aluno: Usuario;
  trilhaId: string;
  conversaId: string;
  /** Aula da dúvida (para os insights do professor): onde o aluno perguntou ou a 1ª aula citada. */
  aulaId: string | null;
  pergunta: string;
  resposta: string;
  detalhes: {
    consulta: string;
    trechos: unknown;
    citacoes: unknown;
    fontes: FonteEdu[];
    relacionado: boolean;
    confiancaBaixa: boolean;
    conhecimentoGeral: boolean;
    recusada: boolean;
  };
  uso: { modelo: string; custo_usd: number; ms: unknown; tokens: unknown };
}) {
  const base = { trilha_id: p.trilhaId, user_id: p.aluno.id, conversa_id: p.conversaId };
  // Horários explícitos: no mesmo insert as duas linhas teriam o mesmo now() e a ordem do par ficaria ambígua.
  const agora = Date.now();
  const r = ok(
    await db()
      .from("tutor_mensagens")
      .insert([
        { ...base, role: "user" as const, texto: p.pergunta, created_at: new Date(agora).toISOString() },
        {
          ...base,
          role: "assistant" as const,
          aula_id: p.aulaId,
          created_at: new Date(agora + 1).toISOString(),
          texto: p.resposta,
          trechos: p.detalhes as unknown as Json,
          uso: p.uso as unknown as Json,
        },
      ])
      .select("id, role"),
    "registrar troca do Edu",
  );
  return r.find((x) => x.role === "assistant")!.id;
}

export async function avaliarRespostaEdu(p: { aluno: Usuario; mensagemId: string; avaliacao: "util" | "nao_ajudou" | null; motivo: string | null }) {
  ok(
    await db()
      .from("tutor_mensagens")
      .update({
        avaliacao: p.avaliacao,
        motivo: p.avaliacao === "nao_ajudou" ? (p.motivo?.slice(0, 80) ?? null) : null,
        avaliada_em: p.avaliacao ? new Date().toISOString() : null,
      })
      .eq("id", p.mensagemId)
      .eq("user_id", p.aluno.id)
      .eq("role", "assistant"),
    "avaliar resposta do Edu",
  );
}

export async function marcarAvisoEdu(aluno: Usuario) {
  if (aluno.tutor_aviso_em) return;
  ok(await db().from("users").update({ tutor_aviso_em: new Date().toISOString() }).eq("id", aluno.id), "aviso do Edu");
}
