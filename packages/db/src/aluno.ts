import {
  type AnaliseAberta,
  apurarTentativa,
  type Bloco,
  type BlocoAluno,
  blocoParaAluno,
  CONQUISTAS,
  type ContextoAberta,
  type CorrecaoDesafio,
  calcularStreak,
  conquistasAtingidas,
  corrigirDesafio,
  diaLocal,
  type Ementa,
  type EstatisticasAluno,
  ehCorrigivel,
  enunciadoDesafio,
  montarContextoAberta,
  nivelPorXp,
  type RespostaDesafio,
  type ResultadoConclusao,
  recompensasConclusao,
  somarDias,
  TIMEZONE_PADRAO,
  TIPOS_CORRIGIVEIS,
} from "@edu/core";
import type { Usuario } from "./acesso";
import { db, ok, talvez } from "./client";
import { perfilIADaTrilha, trilhasDasAssinaturas } from "./criador";
import type { Json } from "./database.types";
import { notificar } from "./estudio";

const tz = () => process.env.APP_TIMEZONE || TIMEZONE_PADRAO;
export const hojeLocal = () => diaLocal(new Date(), tz());

// ─────────────────────────── Acesso do fã ───────────────────────────

/** Ids das trilhas publicadas que o fã acessa: as dos produtos que ele assina. */
const trilhasLiberadas = (aluno: Usuario) => trilhasDasAssinaturas(aluno.id);

export async function trilhaLiberada(aluno: Usuario, trilhaId: string) {
  return (await trilhasLiberadas(aluno)).includes(trilhaId);
}

// ─────────────────────────── Trilhas do fã ───────────────────────────

export interface TrilhaResumo {
  id: string;
  titulo: string;
  descricao: string | null;
  cor: string;
  icone: string;
  /** Criador que preparou a trilha. */
  criador: { id: string; handle: string; nome: string; foto_url: string | null } | null;
  publicada_em: string | null;
  totalAulas: number;
  concluidas: number;
  percentual: number;
  proximaAula: { id: string; titulo: string; ordem: number } | null;
}

export async function trilhasDoAluno(aluno: Usuario): Promise<TrilhaResumo[]> {
  const ids = await trilhasLiberadas(aluno);
  if (ids.length === 0) return [];
  const [trilhas, aulas, concl] = await Promise.all([
    db().from("trilhas").select("id, titulo, descricao, cor, icone, publicada_em, criador_id").in("id", ids).order("ordem").order("publicada_em"),
    db().from("aulas").select("id, trilha_id, titulo, ordem").in("trilha_id", ids).is("arquivada_em", null).order("ordem"),
    db().from("aula_conclusoes").select("aula_id").eq("user_id", aluno.id),
  ]);
  const lista = ok(trilhas, "trilhas");
  const perfis = ok(
    await db()
      .from("criador_perfis")
      .select("user_id, handle, nome_publico, foto_url")
      .in("user_id", [...new Set(lista.map((t) => t.criador_id))]),
    "criadores das trilhas",
  );
  const feitas = new Set(ok(concl, "conclusoes").map((c) => c.aula_id));
  const todasAulas = ok(aulas, "aulas");
  return lista.map((t) => {
    const minhas = todasAulas.filter((a) => a.trilha_id === t.id);
    const concluidas = minhas.filter((a) => feitas.has(a.id)).length;
    const proxima = minhas.find((a) => !feitas.has(a.id)) ?? null;
    const p = perfis.find((x) => x.user_id === t.criador_id);
    return {
      id: t.id,
      titulo: t.titulo,
      descricao: t.descricao,
      cor: t.cor,
      icone: t.icone,
      criador: p ? { id: p.user_id, handle: p.handle, nome: p.nome_publico, foto_url: p.foto_url } : null,
      publicada_em: t.publicada_em,
      totalAulas: minhas.length,
      concluidas,
      percentual: minhas.length ? Math.round((concluidas / minhas.length) * 100) : 0,
      proximaAula: proxima ? { id: proxima.id, titulo: proxima.titulo, ordem: proxima.ordem } : null,
    };
  });
}

export interface AulaNoCaminho {
  id: string;
  titulo: string;
  objetivo: string | null;
  ordem: number;
  modulo_id: string;
  modulo_titulo: string | null;
  concluida: boolean;
  acertos: number | null;
  total: number | null;
  estado: "concluida" | "atual" | "bloqueada";
}

/** Caminho da trilha com o estado de cada aula; null se a trilha não está liberada para o fã. */
export async function caminhoDaTrilha(trilhaId: string, aluno: Usuario) {
  if (!(await trilhaLiberada(aluno, trilhaId))) return null;
  const [trilha, aulas, concl] = await Promise.all([
    db().from("trilhas").select("*").eq("id", trilhaId).single(),
    db().from("aulas").select("id, titulo, objetivo, ordem, modulo_id, modulo_titulo").eq("trilha_id", trilhaId).is("arquivada_em", null).order("ordem"),
    db().from("aula_conclusoes").select("aula_id, acertos, total").eq("user_id", aluno.id),
  ]);
  const mapa = new Map(ok(concl, "conclusoes").map((c) => [c.aula_id, c]));
  let atualDefinida = false;
  const lista: AulaNoCaminho[] = ok(aulas, "aulas").map((a) => {
    const c = mapa.get(a.id);
    let estado: AulaNoCaminho["estado"] = "bloqueada";
    if (c) estado = "concluida";
    else if (!atualDefinida) {
      estado = "atual";
      atualDefinida = true;
    }
    return { ...a, concluida: !!c, acertos: c?.acertos ?? null, total: c?.total ?? null, estado };
  });
  return { trilha: ok(trilha, "trilha"), aulas: lista };
}

/** Aula no contexto do fã: valida liberação e sequência. */
async function aulaDoAluno(aulaId: string, aluno: Usuario) {
  const aula = talvez(await db().from("aulas").select("id, trilha_id, arquivada_em").eq("id", aulaId).maybeSingle(), "aula");
  if (!aula || aula.arquivada_em) return null;
  const caminho = await caminhoDaTrilha(aula.trilha_id, aluno);
  const noCaminho = caminho?.aulas.find((a) => a.id === aulaId);
  if (!caminho || !noCaminho) return null;
  return { trilhaId: aula.trilha_id, estado: noCaminho.estado, caminho };
}

export type ResultadoAcessoAula =
  | { tipo: "ok"; dados: Awaited<ReturnType<typeof montarAula>> }
  | { tipo: "nao_encontrada" }
  | { tipo: "bloqueada"; trilhaId: string };

/** Linha de aula_blocos → Bloco (o id do bloco publicado é o uuid da linha). */
export const blocoDaLinha = (b: { id: string; tipo: string; conteudo: Json }) => ({ ...(b.conteudo as object), id: b.id, tipo: b.tipo }) as Bloco;

/** Última resposta aberta do fã em cada bloco da aula (para mostrar no modo revisão). */
export interface AbertaAnterior {
  resposta: string;
  feedback: string;
}

async function montarAula(aulaId: string, modo: "aula" | "revisao", alunoId: string) {
  const [aula, blocos, abertas] = await Promise.all([
    db().from("aulas").select("*, trilha:trilhas(id, titulo, cor, icone)").eq("id", aulaId).single(),
    db().from("aula_blocos").select("*").eq("aula_id", aulaId).order("ordem"),
    db().from("respostas_abertas").select("bloco_id, resposta, feedback").eq("user_id", alunoId).eq("aula_id", aulaId).order("criada_em", { ascending: false }),
  ]);
  const a = ok(aula, "aula") as unknown as {
    id: string;
    titulo: string;
    objetivo: string | null;
    trilha_id: string;
    trilha: { id: string; titulo: string; cor: string; icone: string };
  };
  const lista: BlocoAluno[] = ok(blocos, "blocos").map((b) => blocoParaAluno(blocoDaLinha(b)));
  const abertasAnteriores: Record<string, AbertaAnterior> = {};
  for (const r of ok(abertas, "abertas anteriores")) abertasAnteriores[r.bloco_id] ??= { resposta: r.resposta, feedback: r.feedback };
  const irmas = ok(await db().from("aulas").select("id").eq("trilha_id", a.trilha_id).is("arquivada_em", null).order("ordem"), "irmas");
  return { aula: a, blocos: lista, abertasAnteriores, modo, posicao: irmas.findIndex((x) => x.id === a.id) + 1, totalAulas: irmas.length };
}

/** Aula pronta para o player (sem gabarito). Aula já concluída abre em modo revisão. */
export async function aulaParaJogar(aulaId: string, aluno: Usuario): Promise<ResultadoAcessoAula> {
  const ctx = await aulaDoAluno(aulaId, aluno);
  if (!ctx) return { tipo: "nao_encontrada" };
  if (ctx.estado === "bloqueada") return { tipo: "bloqueada", trilhaId: ctx.trilhaId };
  return { tipo: "ok", dados: await montarAula(aulaId, ctx.estado === "concluida" ? "revisao" : "aula", aluno.id) };
}

// ─────────────────────────── Respostas (correção no servidor) ───────────────────────────

export class ErroAula extends Error {}

/** Corrige e registra a resposta a um desafio corrigível (quiz, completar ou ordenar). */
export async function responderDesafio(p: {
  aluno: Usuario;
  aulaId: string;
  blocoId: string;
  resposta: RespostaDesafio;
  tentativa: string;
}): Promise<CorrecaoDesafio> {
  const ctx = await aulaDoAluno(p.aulaId, p.aluno);
  if (!ctx || ctx.estado === "bloqueada") throw new ErroAula("Aula indisponível.");
  const linha = talvez(await db().from("aula_blocos").select("*").eq("id", p.blocoId).eq("aula_id", p.aulaId).maybeSingle(), "bloco");
  const bloco = linha ? blocoDaLinha(linha) : null;
  if (!linha || !bloco || !ehCorrigivel(bloco) || bloco.tipo !== p.resposta.tipo) throw new ErroAula("Questão não encontrada.");

  // Uma resposta por desafio em cada tentativa: reenvio devolve a correção já registrada.
  const anterior = talvez(
    await db().from("respostas_quiz").select("opcao, resposta").eq("tentativa", p.tentativa).eq("bloco_id", p.blocoId).eq("user_id", p.aluno.id).maybeSingle(),
    "resposta anterior",
  );
  const respostaUsada: RespostaDesafio = anterior
    ? ((anterior.resposta as RespostaDesafio | null) ?? { tipo: "quiz", opcao: anterior.opcao ?? -1 })
    : p.resposta;
  let correcao: CorrecaoDesafio;
  try {
    correcao = corrigirDesafio(bloco, respostaUsada);
  } catch (e) {
    throw new ErroAula(e instanceof Error ? e.message : "Resposta inválida.");
  }
  if (!anterior) {
    const r = await db()
      .from("respostas_quiz")
      .insert({
        user_id: p.aluno.id,
        aula_id: p.aulaId,
        bloco_id: p.blocoId,
        bloco_ordem: linha.ordem,
        pergunta: enunciadoDesafio(bloco),
        tipo: bloco.tipo,
        opcao: p.resposta.tipo === "quiz" ? p.resposta.opcao : null,
        resposta: p.resposta as unknown as Json,
        correta: correcao.correta,
        modo: ctx.estado === "concluida" ? "revisao" : "aula",
        tentativa: p.tentativa,
      });
    if (r.error && r.error.code !== "23505") throw new Error(`[db] resposta: ${r.error.message}`);
  }
  return correcao;
}

// ─────────────────────────── Pergunta aberta (feedback da IA) ───────────────────────────

const limiteAbertasDia = () => Number(process.env.LIMITE_ABERTAS_DIA) || 80;

export interface BlocoAbertaRegistro {
  id: string;
  ordem: number;
  pergunta: string;
}

export type PreparoAberta =
  | { tipo: "registrada"; resposta: string; feedback: string }
  | { tipo: "pronta"; contexto: ContextoAberta; bloco: BlocoAbertaRegistro; modo: "aula" | "revisao" };

/**
 * Valida o acesso e monta o contexto do tutor para uma pergunta aberta. Envio único por tentativa:
 * se já houver resposta registrada, devolve o feedback salvo (sem nova chamada ao LLM).
 */
export async function prepararPerguntaAberta(p: { aluno: Usuario; aulaId: string; blocoId: string; tentativa: string }): Promise<PreparoAberta> {
  const ctx = await aulaDoAluno(p.aulaId, p.aluno);
  if (!ctx || ctx.estado === "bloqueada") throw new ErroAula("Aula indisponível.");

  const [linhas, anterior] = await Promise.all([
    db().from("aula_blocos").select("*").eq("aula_id", p.aulaId).order("ordem"),
    db().from("respostas_abertas").select("resposta, feedback").eq("tentativa", p.tentativa).eq("bloco_id", p.blocoId).eq("user_id", p.aluno.id).maybeSingle(),
  ]);
  const blocosLinhas = ok(linhas, "blocos");
  const linha = blocosLinhas.find((b) => b.id === p.blocoId);
  if (linha?.tipo !== "aberta") throw new ErroAula("Pergunta não encontrada.");
  const ja = talvez(anterior, "aberta anterior");
  if (ja) return { tipo: "registrada", resposta: ja.resposta, feedback: ja.feedback };

  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const usados = await db().from("respostas_abertas").select("id", { count: "exact", head: true }).eq("user_id", p.aluno.id).gte("criada_em", desde);
  if ((usados.count ?? 0) >= limiteAbertasDia()) {
    throw new ErroAula("Você chegou ao limite de perguntas abertas por hoje. Pode seguir a aula e voltar amanhã para responder com feedback.");
  }

  const { contexto, pergunta } = await contextoDaAberta({ aulaId: p.aulaId, blocoId: p.blocoId, trilhaId: ctx.trilhaId, linhas: blocosLinhas });
  return {
    tipo: "pronta",
    contexto,
    bloco: { id: linha.id, ordem: linha.ordem, pergunta },
    modo: ctx.estado === "concluida" ? "revisao" : "aula",
  };
}

/**
 * Contexto do tutor para uma pergunta aberta publicada (o mesmo do app do fã). Também serve à prévia
 * da trilha no painel do criador, que gera o feedback sem gravar nada.
 */
export async function contextoDaAberta(p: {
  aulaId: string;
  blocoId: string;
  trilhaId: string;
  linhas: { id: string; tipo: string; conteudo: Json }[];
}): Promise<{ contexto: ContextoAberta; pergunta: string }> {
  const aula = ok(
    await db()
      .from("aulas")
      .select("titulo, objetivo, modulo_id, modulo_titulo, skill_card_codigos, trilha:trilhas(id, titulo, ementa)")
      .eq("id", p.aulaId)
      .single(),
    "aula aberta",
  ) as unknown as {
    titulo: string;
    objetivo: string | null;
    modulo_id: string;
    modulo_titulo: string | null;
    skill_card_codigos: string[];
    trilha: { id: string; titulo: string; ementa: Json | null };
  };
  const blocos = p.linhas.map(blocoDaLinha);
  const bloco = blocos.find((b) => b.id === p.blocoId);
  if (bloco?.tipo !== "aberta") throw new ErroAula("Pergunta não encontrada.");
  const codigos = [...new Set([...aula.skill_card_codigos, bloco.skill_card_id])];
  const [cards, ia] = await Promise.all([
    db().from("skill_cards").select("codigo, titulo, conceito, pontos_chave, exemplo").eq("trilha_id", p.trilhaId).in("codigo", codigos),
    perfilIADaTrilha(p.trilhaId),
  ]);

  const contexto = montarContextoAberta({
    criador: ia?.perfil ?? { nome: "o criador", publico: "Fãs do criador." },
    produto: ia?.produto ?? null,
    trilha: aula.trilha.titulo,
    ementa: (aula.trilha.ementa as Ementa | null) ?? null,
    cards: ok(cards, "cards aberta").map((c) => ({
      id: c.codigo,
      titulo: c.titulo,
      conceito: c.conceito,
      pontos_chave: (c.pontos_chave as string[]) ?? [],
      exemplo: c.exemplo,
    })),
    // Os blocos publicados guardam os códigos dos cards (C3…), que é o que o contexto cruza.
    aula: { ...aula, skill_card_ids: aula.skill_card_codigos, blocos },
    blocoId: p.blocoId,
  });
  return { contexto, pergunta: bloco.pergunta };
}

/** Registra o envio e o feedback da pergunta aberta. Corrida de duplo envio é ignorada (unique). */
export async function registrarRespostaAberta(p: {
  aluno: Usuario;
  aulaId: string;
  bloco: BlocoAbertaRegistro;
  tentativa: string;
  modo: "aula" | "revisao";
  resposta: string;
  feedback: string;
  analise: AnaliseAberta | null;
  modelo: string;
  uso: { entrada: number; saida: number; cache: number };
  custoUsd: number;
  duracaoMs: number;
}) {
  const r = await db()
    .from("respostas_abertas")
    .insert({
      user_id: p.aluno.id,
      aula_id: p.aulaId,
      bloco_id: p.bloco.id,
      bloco_ordem: p.bloco.ordem,
      pergunta: p.bloco.pergunta,
      tentativa: p.tentativa,
      modo: p.modo,
      resposta: p.resposta,
      feedback: p.feedback,
      classificacao: p.analise?.classificacao ?? null,
      criterios: (p.analise?.criterios ?? null) as unknown as Json,
      modelo: p.modelo,
      tokens_entrada: p.uso.entrada,
      tokens_saida: p.uso.saida,
      tokens_cache: p.uso.cache,
      custo_usd: p.custoUsd,
      duracao_ms: p.duracaoMs,
    });
  if (r.error && r.error.code !== "23505") throw new Error(`[db] resposta aberta: ${r.error.message}`);
}

/** Erros recentes do fã (última resposta de cada questão foi errada), para o "Revisar meus erros" (tela desligada por enquanto). */
export async function errosDoAluno(aluno: Usuario, limite = 30) {
  const respostas = ok(
    await db()
      .from("respostas_quiz")
      .select("aula_id, bloco_id, bloco_ordem, pergunta, correta, respondida_em, aula:aulas(id, titulo, arquivada_em, trilha:trilhas(id, titulo, cor, icone))")
      .eq("user_id", aluno.id)
      .order("respondida_em", { ascending: false })
      .limit(500),
    "erros",
  ) as unknown as {
    aula_id: string;
    bloco_id: string;
    pergunta: string;
    correta: boolean;
    respondida_em: string;
    aula: { id: string; titulo: string; arquivada_em: string | null; trilha: { id: string; titulo: string; cor: string; icone: string } };
  }[];
  const vistos = new Set<string>();
  const liberadas = new Set(await trilhasLiberadas(aluno));
  const saida: typeof respostas = [];
  for (const r of respostas) {
    const chave = `${r.aula_id}:${r.pergunta}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    if (!r.correta && !r.aula.arquivada_em && liberadas.has(r.aula.trilha.id)) saida.push(r);
  }
  return saida.slice(0, limite);
}

// ─────────────────────────── Estatísticas ───────────────────────────

export interface PainelAluno {
  xpTotal: number;
  xpSemana: number;
  nivel: ReturnType<typeof nivelPorXp>;
  streak: ReturnType<typeof calcularStreak>;
  dias: string[];
  stats: EstatisticasAluno;
  conquistas: { key: string; desbloqueada_em: string }[];
  xpPorDia: { dia: string; xp: number }[];
}

export async function painelDoAluno(alunoId: string): Promise<PainelAluno> {
  const [xp, dias, concl, trilhas, conq] = await Promise.all([
    db().from("xp_eventos").select("pontos, criado_em").eq("user_id", alunoId),
    db().from("dias_ativos").select("dia").eq("user_id", alunoId),
    db().from("aula_conclusoes").select("acertos, total").eq("user_id", alunoId),
    db().from("trilha_conclusoes").select("trilha_id").eq("user_id", alunoId),
    db().from("conquistas_usuario").select("conquista_key, desbloqueada_em").eq("user_id", alunoId),
  ]);
  const eventos = ok(xp, "xp");
  const listaDias = ok(dias, "dias").map((d) => d.dia);
  const hoje = hojeLocal();
  const streak = calcularStreak(listaDias, hoje);
  const conclusoes = ok(concl, "concl");
  const xpTotal = eventos.reduce((s, e) => s + e.pontos, 0);
  const inicioSemana = somarDias(hoje, -6);
  const porDia = new Map<string, number>();
  for (const e of eventos) {
    const d = diaLocal(new Date(e.criado_em), tz());
    porDia.set(d, (porDia.get(d) ?? 0) + e.pontos);
  }
  const xpPorDia = Array.from({ length: 30 }, (_, i) => {
    const dia = somarDias(hoje, i - 29);
    return { dia, xp: porDia.get(dia) ?? 0 };
  });
  const stats: EstatisticasAluno = {
    aulasConcluidas: conclusoes.length,
    trilhasConcluidas: ok(trilhas, "trilhas").length,
    aulasPerfeitas: conclusoes.filter((c) => c.total > 0 && c.acertos === c.total).length,
    streakRecorde: streak.recorde,
    xpTotal,
  };
  return {
    xpTotal,
    xpSemana: xpPorDia.filter((d) => d.dia >= inicioSemana).reduce((s, d) => s + d.xp, 0),
    nivel: nivelPorXp(xpTotal),
    streak,
    dias: listaDias,
    stats,
    conquistas: ok(conq, "conquistas").map((c) => ({ key: c.conquista_key, desbloqueada_em: c.desbloqueada_em })),
    xpPorDia,
  };
}

// ─────────────────────────── Concluir aula ───────────────────────────

export interface RecompensaAula extends ResultadoConclusao {
  aulaJaConcluida: boolean;
  trilhaConcluida: boolean;
  novasConquistas: string[];
  xpTotal: number;
  acertos: number;
  total: number;
}

/**
 * Conclui a aula apurando os acertos das respostas registradas na tentativa (nunca do cliente).
 * Exige aula liberada e todas as questões respondidas.
 */
export async function concluirAula(aluno: Usuario, aulaId: string, tentativa: string): Promise<RecompensaAula> {
  const ctx = await aulaDoAluno(aulaId, aluno);
  if (!ctx || ctx.estado === "bloqueada") throw new ErroAula("Aula indisponível.");
  const alunoId = aluno.id;
  const trilhaId = ctx.trilhaId;

  const [blocos, respostas] = await Promise.all([
    // A pergunta aberta é formativa: fica fora de acertos/total e não bloqueia a conclusão.
    db()
      .from("aula_blocos")
      .select("id")
      .eq("aula_id", aulaId)
      .in("tipo", [...TIPOS_CORRIGIVEIS]),
    db().from("respostas_quiz").select("bloco_id, correta").eq("user_id", alunoId).eq("aula_id", aulaId).eq("tentativa", tentativa),
  ]);
  const apurado = apurarTentativa(
    ok(blocos, "blocos").map((b) => b.id),
    ok(respostas, "respostas"),
  );
  if (!apurado.completa) throw new ErroAula("Responda todas as questões antes de concluir.");
  const { acertos, total } = apurado;

  const [anterior, dias, aulasTrilha, trilhaFeita, conqAntes] = await Promise.all([
    db().from("aula_conclusoes").select("*").eq("user_id", alunoId).eq("aula_id", aulaId).maybeSingle(),
    db().from("dias_ativos").select("dia").eq("user_id", alunoId),
    db().from("aulas").select("id").eq("trilha_id", trilhaId).is("arquivada_em", null),
    db().from("trilha_conclusoes").select("trilha_id").eq("user_id", alunoId).eq("trilha_id", trilhaId).maybeSingle(),
    db().from("conquistas_usuario").select("conquista_key").eq("user_id", alunoId),
  ]);
  const ja = talvez(anterior, "anterior");
  const agora = new Date().toISOString();

  if (!ja) {
    ok(await db().from("aula_conclusoes").insert({ user_id: alunoId, aula_id: aulaId, acertos, total, concluida_em: agora }), "insert conclusao");
  } else if (acertos > ja.acertos) {
    ok(await db().from("aula_conclusoes").update({ acertos, total }).eq("user_id", alunoId).eq("aula_id", aulaId), "update conclusao");
  }

  const idsTrilha = ok(aulasTrilha, "aulasTrilha").map((a) => a.id);
  const concluidas = ok(await db().from("aula_conclusoes").select("aula_id").eq("user_id", alunoId).in("aula_id", idsTrilha), "concluidas");
  const trilhaCompletaAgora = !talvez(trilhaFeita, "trilhaFeita") && concluidas.length === idsTrilha.length;

  const hoje = hojeLocal();
  const r = recompensasConclusao({
    aulaId,
    trilhaId,
    aulaJaConcluida: !!ja,
    trilhaCompletaAgora,
    diasAtivosAntes: ok(dias, "dias").map((d) => d.dia),
    hoje,
  });

  ok(await db().from("dias_ativos").upsert({ user_id: alunoId, dia: hoje }, { ignoreDuplicates: true }), "dia ativo");
  if (r.eventos.length) {
    ok(
      await db()
        .from("xp_eventos")
        .upsert(
          r.eventos.map((e) => ({ user_id: alunoId, ...e, criado_em: agora })),
          { onConflict: "user_id,fonte,ref_key", ignoreDuplicates: true },
        ),
      "xp",
    );
  }
  if (trilhaCompletaAgora) {
    ok(await db().from("trilha_conclusoes").insert({ user_id: alunoId, trilha_id: trilhaId, concluida_em: agora }), "trilha concluida");
  }

  const painel = await painelDoAluno(alunoId);
  const antes = new Set(ok(conqAntes, "conq").map((c) => c.conquista_key));
  const novas = conquistasAtingidas(painel.stats).filter((k) => !antes.has(k));
  if (novas.length) {
    ok(
      await db()
        .from("conquistas_usuario")
        .insert(novas.map((k) => ({ user_id: alunoId, conquista_key: k, desbloqueada_em: agora }))),
      "conquistas",
    );
    await notificar(
      novas.map((k) => ({
        userId: alunoId,
        tipo: "conquista",
        titulo: `Conquista desbloqueada: ${CONQUISTAS.find((c) => c.key === k)?.titulo ?? k}`,
        corpo: CONQUISTAS.find((c) => c.key === k)?.descricao ?? null,
        link: "/progresso",
      })),
    ).catch(() => {});
  }

  return { ...r, aulaJaConcluida: !!ja, trilhaConcluida: trilhaCompletaAgora, novasConquistas: novas, xpTotal: painel.xpTotal, acertos, total };
}
