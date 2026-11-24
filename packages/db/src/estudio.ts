import {
  type AulasDraft,
  type CardsDraft,
  type Ementa,
  type Etapa,
  ementaVazia,
  lerRevisoes,
  modulosPendentes,
  modulosPendentesCards,
  normalizarEmenta,
  STATUS_COM_ACESSO,
  type VisaoGeral,
  visaoVazia,
} from "@edu/core";
import { db, ok, talvez } from "./client";
import type { Json, Row } from "./database.types";
import { ErroPermissao } from "./erros";

export const ORDEM_ETAPAS: Etapa[] = ["visao", "ementa", "cards", "aulas"];

export type Snapshot = VisaoGeral | Ementa | CardsDraft | AulasDraft;

/** Quem editou uma versão do rascunho: o agente de IA ou o criador. */
export type AutorVersao = "agente" | "criador";

export function snapshotVazio(etapa: Etapa): Snapshot {
  if (etapa === "visao") return visaoVazia();
  return etapa === "ementa" ? ementaVazia() : etapa === "cards" ? { cards: [] } : { aulas: [] };
}

/** Cria a trilha no fim da lista do produto, com as quatro etapas pendentes. */
export async function criarTrilha(p: { produtoId: string; criadorId: string; titulo: string; descricao?: string; cor: string; icone: string }) {
  const produto = talvez(await db().from("produtos").select("criador_id").eq("id", p.produtoId).maybeSingle(), "produto");
  if (!produto || produto.criador_id !== p.criadorId) throw new ErroPermissao("Produto não encontrado.");
  const ultima = talvez(
    await db().from("trilhas").select("ordem").eq("produto_id", p.produtoId).order("ordem", { ascending: false }).limit(1).maybeSingle(),
    "ordem",
  );
  const trilha = ok(
    await db()
      .from("trilhas")
      .insert({
        produto_id: p.produtoId,
        criador_id: p.criadorId,
        titulo: p.titulo,
        descricao: p.descricao ?? null,
        cor: p.cor,
        icone: p.icone,
        ordem: (ultima?.ordem ?? 0) + 1,
      })
      .select()
      .single(),
    "criarTrilha",
  );
  ok(
    await db()
      .from("trilha_etapas")
      .insert(ORDEM_ETAPAS.map((etapa) => ({ trilha_id: trilha.id, etapa }))),
    "etapas",
  );
  return trilha;
}

export async function atualizarTrilha(
  id: string,
  campos: Partial<Pick<Row<"trilhas">, "titulo" | "descricao" | "cor" | "icone" | "orientacao_objetivo" | "orientacao_conteudos" | "orientacao_complementos">>,
) {
  ok(
    await db()
      .from("trilhas")
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq("id", id),
    "atualizarTrilha",
  );
}

/** Muda a ordem das trilhas na página do criador (ids na ordem nova; todos do mesmo produto). */
export async function reordenarTrilhas(produtoId: string, ids: string[]) {
  const doProduto = new Set(ok(await db().from("trilhas").select("id").eq("produto_id", produtoId), "trilhas do produto").map((t) => t.id));
  if (ids.some((id) => !doProduto.has(id))) throw new ErroPermissao("Trilha não encontrada.");
  for (const [i, id] of ids.entries())
    ok(
      await db()
        .from("trilhas")
        .update({ ordem: i + 1 })
        .eq("id", id),
      "ordem",
    );
}

/** Avisa os fãs com acesso ao produto que uma trilha chegou para eles. */
async function avisarAssinantes(p: { produtoId: string; trilhaId: string; titulo: string }) {
  const ass = ok(
    await db()
      .from("assinaturas")
      .select("aluno_id")
      .eq("produto_id", p.produtoId)
      .in("status", [...STATUS_COM_ACESSO]),
    "assinantes a avisar",
  );
  await notificar(
    ass.map((a) => ({ userId: a.aluno_id, tipo: "trilha_nova", titulo: "Trilha nova liberada!", corpo: p.titulo, link: `/trilhas/${p.trilhaId}` })),
  );
}

export interface MensagemChat {
  id: string;
  etapa: Etapa;
  role: "user" | "assistant";
  texto: string;
  eventos: Json;
  foco: Json | null;
  versao: number | null;
  created_at: string;
}

export interface EstadoEstudio {
  trilha: Row<"trilhas">;
  etapas: Record<Etapa, Row<"trilha_etapas">>;
  rascunhos: Record<Etapa, Snapshot>;
  materiais: Row<"materiais">[];
  mensagens: MensagemChat[];
  produto: { id: string; nome: string };
}

export async function getEstudio(trilhaId: string): Promise<EstadoEstudio | null> {
  const trilha = talvez(await db().from("trilhas").select("*").eq("id", trilhaId).maybeSingle(), "trilha");
  if (!trilha) return null;
  const [etapas, materiais, mensagens, produto] = await Promise.all([
    db().from("trilha_etapas").select("*").eq("trilha_id", trilhaId),
    db().from("materiais").select("*").eq("trilha_id", trilhaId).order("created_at"),
    db().from("agente_mensagens").select("*").eq("trilha_id", trilhaId).order("created_at"),
    db().from("produtos").select("id, nome").eq("id", trilha.produto_id).single(),
  ]);
  const listaEtapas = await garantirEtapas(trilhaId, ok(etapas, "etapas"));
  const porEtapa = Object.fromEntries(listaEtapas.map((e) => [e.etapa, e])) as Record<Etapa, Row<"trilha_etapas">>;
  const rascunhos = {} as Record<Etapa, Snapshot>;
  for (const etapa of ORDEM_ETAPAS) rascunhos[etapa] = await getRascunho(trilhaId, etapa, porEtapa[etapa]?.versao_atual ?? 0);
  return {
    trilha,
    etapas: porEtapa,
    rascunhos,
    materiais: ok(materiais, "materiais"),
    mensagens: ok(mensagens, "mensagens") as MensagemChat[],
    produto: ok(produto, "produto"),
  };
}

/** Cria as linhas de etapa que faltam (defesa contra uma criação interrompida). */
async function garantirEtapas(trilhaId: string, lista: Row<"trilha_etapas">[]) {
  const faltam = ORDEM_ETAPAS.filter((e) => !lista.some((x) => x.etapa === e));
  if (!faltam.length) return lista;
  ok(
    await db()
      .from("trilha_etapas")
      .upsert(
        faltam.map((etapa) => ({ trilha_id: trilhaId, etapa })),
        { onConflict: "trilha_id,etapa", ignoreDuplicates: true },
      ),
    "etapas faltantes",
  );
  return ok(await db().from("trilha_etapas").select("*").eq("trilha_id", trilhaId), "etapas");
}

export async function getRascunho(trilhaId: string, etapa: Etapa, versao?: number): Promise<Snapshot> {
  let v = versao;
  if (v === undefined) {
    const e = ok(await db().from("trilha_etapas").select("versao_atual").eq("trilha_id", trilhaId).eq("etapa", etapa).single(), "versao");
    v = e.versao_atual;
  }
  if (!v) return snapshotVazio(etapa);
  const r = ok(await db().from("etapa_versoes").select("snapshot").eq("trilha_id", trilhaId).eq("etapa", etapa).eq("versao", v).single(), "snapshot");
  // Visões e ementas antigas guardam as competências como texto.
  if (etapa === "visao" || etapa === "ementa") return normalizarEmenta(r.snapshot as unknown as VisaoGeral) as Snapshot;
  return r.snapshot as unknown as Snapshot;
}

/** O que o criador contou sobre a trilha (vai para o prompt do agente; mesmo formato de ContextoTrilha em @edu/ai). */
export interface ContextoTrilhaDb {
  /** Produto do criador ao qual a trilha pertence. */
  produto: string | null;
  titulo: string;
  descricao: string | null;
  objetivo: string | null;
  conteudos: string | null;
  complementos: string | null;
}

/** Entrada do agente: rascunhos das etapas (corrente + anteriores) e o contexto da trilha. */
export async function getEntradaAgente(trilhaId: string) {
  const [[visao, ementa, cards, aulas], trilha] = await Promise.all([
    Promise.all(ORDEM_ETAPAS.map((e) => getRascunho(trilhaId, e))),
    db()
      .from("trilhas")
      .select("titulo, descricao, orientacao_objetivo, orientacao_conteudos, orientacao_complementos, produto:produtos(nome)")
      .eq("id", trilhaId)
      .single(),
  ]);
  const t = ok(trilha, "trilha") as unknown as {
    titulo: string;
    descricao: string | null;
    orientacao_objetivo: string | null;
    orientacao_conteudos: string | null;
    orientacao_complementos: string | null;
    produto: { nome: string } | null;
  };
  const contexto: ContextoTrilhaDb = {
    produto: t.produto?.nome ?? null,
    titulo: t.titulo,
    descricao: t.descricao,
    objetivo: t.orientacao_objetivo,
    conteudos: t.orientacao_conteudos,
    complementos: t.orientacao_complementos,
  };
  return { visao: visao as VisaoGeral, ementa: ementa as Ementa, cards: cards as CardsDraft, aulas: aulas as AulasDraft, contexto };
}

export async function salvarVersao(p: { trilhaId: string; etapa: Etapa; snapshot: Snapshot; autor: AutorVersao; resumo: string; qualidade?: unknown }) {
  const atual = ok(await db().from("trilha_etapas").select("*").eq("trilha_id", p.trilhaId).eq("etapa", p.etapa).single(), "etapa");
  const versao = atual.versao_atual + 1;
  ok(
    await db()
      .from("etapa_versoes")
      .insert({
        trilha_id: p.trilhaId,
        etapa: p.etapa,
        versao,
        snapshot: p.snapshot as unknown as Json,
        autor: p.autor,
        resumo: p.resumo,
      }),
    "versao",
  );
  ok(
    await db()
      .from("trilha_etapas")
      .update({
        versao_atual: versao,
        status: "em_revisao",
        updated_at: new Date().toISOString(),
        ...(p.qualidade !== undefined ? { qualidade: p.qualidade as Json } : {}),
      })
      .eq("trilha_id", p.trilhaId)
      .eq("etapa", p.etapa),
    "etapa",
  );
  await marcarSeguintesDesatualizadas(p.trilhaId, p.etapa);
  return versao;
}

async function marcarSeguintesDesatualizadas(trilhaId: string, etapa: Etapa) {
  const seguintes = ORDEM_ETAPAS.slice(ORDEM_ETAPAS.indexOf(etapa) + 1);
  if (!seguintes.length) return;
  ok(
    await db().from("trilha_etapas").update({ status: "desatualizada" }).eq("trilha_id", trilhaId).in("etapa", seguintes).gt("versao_atual", 0),
    "desatualizar",
  );
}

export async function marcarStatusEtapa(trilhaId: string, etapa: Etapa, status: Row<"trilha_etapas">["status"]) {
  ok(
    await db()
      .from("trilha_etapas")
      .update({ status, gerando_desde: status === "gerando" ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq("trilha_id", trilhaId)
      .eq("etapa", etapa),
    "status",
  );
}

/** Uma execução do agente por etapa: "gerando" há menos de 10 min bloqueia nova execução. */
export const LOCK_GERACAO_MS = 10 * 60_000;

export async function tentarTravarEtapa(trilhaId: string, etapa: Etapa): Promise<boolean> {
  const limite = new Date(Date.now() - LOCK_GERACAO_MS).toISOString();
  // Update condicional: só trava se não estiver gerando (ou se o lock expirou).
  const r = ok(
    await db()
      .from("trilha_etapas")
      .update({ status: "gerando", gerando_desde: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("trilha_id", trilhaId)
      .eq("etapa", etapa)
      .or(`status.neq.gerando,gerando_desde.is.null,gerando_desde.lt.${limite}`)
      .select("etapa"),
    "travar etapa",
  );
  return r.length > 0;
}

export async function listarVersoes(trilhaId: string, etapa: Etapa) {
  return ok(
    await db()
      .from("etapa_versoes")
      .select("versao, autor, resumo, created_at")
      .eq("trilha_id", trilhaId)
      .eq("etapa", etapa)
      .order("versao", { ascending: false }),
    "versoes",
  );
}

/** "Desfazer": cria uma nova versão com o conteúdo da versão anterior à atual. */
export async function desfazer(trilhaId: string, etapa: Etapa) {
  const e = ok(await db().from("trilha_etapas").select("versao_atual").eq("trilha_id", trilhaId).eq("etapa", etapa).single(), "etapa");
  if (e.versao_atual <= 1) return null;
  const anterior = await getRascunho(trilhaId, etapa, e.versao_atual - 1);
  return salvarVersao({ trilhaId, etapa, snapshot: anterior, autor: "criador", resumo: `Desfez a versão ${e.versao_atual}` });
}

export async function registrarMensagem(p: {
  trilhaId: string;
  etapa: Etapa;
  role: "user" | "assistant";
  texto: string;
  eventos?: unknown;
  foco?: unknown;
  versao?: number | null;
}) {
  return ok(
    await db()
      .from("agente_mensagens")
      .insert({
        trilha_id: p.trilhaId,
        etapa: p.etapa,
        role: p.role,
        texto: p.texto,
        eventos: (p.eventos ?? []) as Json,
        foco: (p.foco ?? null) as Json,
        versao: p.versao ?? null,
      })
      .select()
      .single(),
    "mensagem",
  );
}

export async function historicoChat(trilhaId: string, etapa: Etapa) {
  return ok(await db().from("agente_mensagens").select("role, texto").eq("trilha_id", trilhaId).eq("etapa", etapa).order("created_at"), "historico") as {
    role: "user" | "assistant";
    texto: string;
  }[];
}

export async function registrarExecucao(p: { trilhaId: string | null; etapa: Etapa | null; tipo: "geracao" | "refinamento" | "eval" }) {
  return ok(await db().from("agente_execucoes").insert({ trilha_id: p.trilhaId, etapa: p.etapa, tipo: p.tipo }).select("id").single(), "execucao").id;
}

export async function finalizarExecucao(
  id: string,
  p: {
    ok: boolean;
    modelo: string;
    uso?: { iteracoes: number; input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_write_tokens: number };
    custo?: number;
    duracaoMs: number;
    erro?: string;
  },
) {
  ok(
    await db()
      .from("agente_execucoes")
      .update({
        status: p.ok ? "ok" : "erro",
        modelo: p.modelo,
        ...(p.uso ?? {}),
        custo_usd: p.custo ?? 0,
        duracao_ms: p.duracaoMs,
        erro: p.erro ?? null,
        finalizada_em: new Date().toISOString(),
      })
      .eq("id", id),
    "finalizarExecucao",
  );
}

// ─────────────────────────── Aprovação e publicação ───────────────────────────

/**
 * Aprovar só registra a versão aprovada. O conteúdo que os fãs veem muda apenas em
 * `publicarTrilha`, que materializa as versões aprovadas de uma vez.
 */
/**
 * Copia os dados gerais da visão aprovada para o rascunho atual da ementa, sem gerar os módulos de
 * novo (o criador só ajustou a redação). Vínculos com competências removidas aparecem na validação.
 */
export async function aplicarVisaoNaEmenta(trilhaId: string) {
  const etapas = ok(
    await db().from("trilha_etapas").select("etapa, status, versao_atual, versao_aprovada").eq("trilha_id", trilhaId).in("etapa", ["visao", "ementa"]),
    "etapas",
  );
  const visaoEtapa = etapas.find((e) => e.etapa === "visao");
  const ementaEtapa = etapas.find((e) => e.etapa === "ementa");
  if (visaoEtapa?.status !== "aprovada" || !visaoEtapa.versao_aprovada) throw new Error("Aprove a visão geral antes.");
  if (!ementaEtapa?.versao_atual) throw new Error("Ainda não há ementa para atualizar.");
  const visao = (await getRascunho(trilhaId, "visao", visaoEtapa.versao_aprovada)) as VisaoGeral;
  const ementa = (await getRascunho(trilhaId, "ementa", ementaEtapa.versao_atual)) as Ementa;
  return salvarVersao({ trilhaId, etapa: "ementa", snapshot: { ...ementa, ...visao }, autor: "criador", resumo: "Aplicou as mudanças da visão geral" });
}

/**
 * Marca (com a assinatura do conteúdo) ou desmarca um item como revisado pelo criador. A leitura e a
 * escrita do jsonb são separadas: duas marcações simultâneas no mesmo segundo podem perder uma (raro).
 */
export async function marcarRevisao(trilhaId: string, etapa: Etapa, itemId: string, assinatura: string | null) {
  const e = ok(await db().from("trilha_etapas").select("revisoes").eq("trilha_id", trilhaId).eq("etapa", etapa).single(), "revisoes");
  const revisoes = lerRevisoes(e.revisoes);
  if (assinatura) revisoes[itemId] = assinatura;
  else delete revisoes[itemId];
  ok(await db().from("trilha_etapas").update({ revisoes }).eq("trilha_id", trilhaId).eq("etapa", etapa), "marcar revisao");
}

export async function aprovarEtapa(trilhaId: string, etapa: Etapa) {
  const e = ok(await db().from("trilha_etapas").select("*").eq("trilha_id", trilhaId).eq("etapa", etapa).single(), "etapa");
  if (!e.versao_atual) throw new Error("Não há rascunho para aprovar.");
  // A ementa só é aprovada com todos os módulos revisados pelo criador (na versão atual de cada um).
  if (etapa === "ementa") {
    const ementa = (await getRascunho(trilhaId, "ementa", e.versao_atual)) as Ementa;
    const pendentes = modulosPendentes(ementa, lerRevisoes(e.revisoes));
    if (pendentes.length) throw new Error(`Revise todos os módulos antes de gerar os cards (faltam: ${pendentes.map((m) => m.id).join(", ")}).`);
  }
  // Os cards também são revisados módulo a módulo antes de gerar as aulas.
  if (etapa === "cards") {
    const [ementa, cards] = await Promise.all([getRascunho(trilhaId, "ementa"), getRascunho(trilhaId, "cards", e.versao_atual)]);
    const pendentes = modulosPendentesCards(ementa as Ementa, cards as CardsDraft, lerRevisoes(e.revisoes));
    if (pendentes.length) throw new Error(`Revise os cards de todos os módulos antes de gerar as aulas (faltam: ${pendentes.map((m) => m.id).join(", ")}).`);
  }
  ok(
    await db()
      .from("trilha_etapas")
      .update({ status: "aprovada", versao_aprovada: e.versao_atual, updated_at: new Date().toISOString() })
      .eq("trilha_id", trilhaId)
      .eq("etapa", etapa),
    "aprovar",
  );
  // A descrição que o fã vê nasce do objetivo geral aprovado, se o criador não escreveu uma.
  if (etapa === "visao") {
    const t = ok(await db().from("trilhas").select("descricao").eq("id", trilhaId).single(), "trilha");
    const visao = (await getRascunho(trilhaId, "visao", e.versao_atual)) as VisaoGeral;
    if (!t.descricao?.trim() && visao.objetivo_geral?.trim()) await atualizarTrilha(trilhaId, { descricao: visao.objetivo_geral.trim().slice(0, 500) });
  }
}

export async function materializarCards(trilhaId: string, draft: CardsDraft) {
  const linhas = draft.cards.map((c, i) => ({
    trilha_id: trilhaId,
    codigo: c.id,
    ordem: i + 1,
    titulo: c.titulo,
    conceito: c.conceito,
    pontos_chave: c.pontos_chave as unknown as Json,
    exemplo: c.exemplo,
    topico_ids: c.topico_ids,
    fontes: c.fontes as unknown as Json,
  }));
  if (linhas.length) ok(await db().from("skill_cards").upsert(linhas, { onConflict: "trilha_id,codigo" }), "cards");
  const codigos = draft.cards.map((c) => c.id);
  const existentes = ok(await db().from("skill_cards").select("id, codigo").eq("trilha_id", trilhaId), "cards existentes");
  const remover = existentes.filter((c) => !codigos.includes(c.codigo)).map((c) => c.id);
  if (remover.length) ok(await db().from("skill_cards").delete().in("id", remover), "remover cards");
}

/**
 * Materializa as aulas pelo código estável (A1, A2…): o id de cada aula se mantém entre publicações,
 * preservando conclusões e respostas. Aulas que saíram do rascunho são arquivadas, nunca apagadas.
 */
export async function materializarAulas(trilhaId: string, ementa: Ementa, draft: AulasDraft) {
  const titulosModulo = new Map(ementa.modulos.map((m) => [m.id, m.titulo]));
  const linhas = draft.aulas.map((a, i) => ({
    trilha_id: trilhaId,
    codigo: a.id,
    modulo_id: a.modulo_id,
    modulo_titulo: titulosModulo.get(a.modulo_id) ?? null,
    ordem: i + 1,
    titulo: a.titulo,
    objetivo: a.objetivo,
    skill_card_codigos: a.skill_card_ids,
    arquivada_em: null,
  }));
  const salvas = linhas.length ? ok(await db().from("aulas").upsert(linhas, { onConflict: "trilha_id,codigo" }).select("id, codigo"), "aulas") : [];
  const idPorCodigo = new Map(salvas.map((a) => [a.codigo, a.id]));
  const existentes = ok(await db().from("aulas").select("id, codigo").eq("trilha_id", trilhaId).is("arquivada_em", null), "aulas existentes");
  const arquivar = existentes.filter((a) => !idPorCodigo.has(a.codigo)).map((a) => a.id);
  if (arquivar.length) ok(await db().from("aulas").update({ arquivada_em: new Date().toISOString() }).in("id", arquivar), "arquivar aulas");

  const ids = [...idPorCodigo.values()];
  if (ids.length) ok(await db().from("aula_blocos").delete().in("aula_id", ids), "limpar blocos");
  const blocos = draft.aulas.flatMap((a) =>
    a.blocos.map((b, i) => ({ aula_id: idPorCodigo.get(a.id)!, ordem: i + 1, tipo: b.tipo, conteudo: b as unknown as Json })),
  );
  for (let i = 0; i < blocos.length; i += 500) {
    ok(
      await db()
        .from("aula_blocos")
        .insert(blocos.slice(i, i + 500)),
      "blocos",
    );
  }
}

/**
 * Publica as versões aprovadas. Na primeira publicação (ou ao voltar de despublicada), os fãs com
 * acesso ao produto são avisados.
 */
export async function publicarTrilha(trilhaId: string) {
  const anterior = talvez(await db().from("trilhas").select("status, produto_id").eq("id", trilhaId).maybeSingle(), "trilha");
  if (!anterior) throw new Error("Trilha não encontrada.");
  const etapas = ok(await db().from("trilha_etapas").select("etapa, status, versao_aprovada").eq("trilha_id", trilhaId), "etapas");
  const aprovada = (e: Etapa) => etapas.find((x) => x.etapa === e && x.status === "aprovada" && x.versao_aprovada);
  if (!ORDEM_ETAPAS.every(aprovada)) throw new Error("Aprove todas as etapas antes de publicar.");

  // A visão não é materializada: os dados gerais aprovados já estão copiados na ementa.
  const [, ementa, cards, aulas] = await Promise.all(ORDEM_ETAPAS.map((e) => getRascunho(trilhaId, e, aprovada(e)!.versao_aprovada!)));
  await materializarCards(trilhaId, cards as CardsDraft);
  await materializarAulas(trilhaId, ementa as Ementa, aulas as AulasDraft);

  const agora = new Date().toISOString();
  const trilha = ok(
    await db()
      .from("trilhas")
      .update({ status: "publicada", ementa: ementa as unknown as Json, publicada_em: agora, updated_at: agora })
      .eq("id", trilhaId)
      .select("titulo")
      .single(),
    "publicar",
  );
  if (anterior.status !== "publicada") await avisarAssinantes({ produtoId: anterior.produto_id, trilhaId, titulo: trilha.titulo });
}

/** Tira a trilha do app dos fãs (o progresso fica guardado; publicar de novo devolve tudo). */
export async function despublicarTrilha(trilhaId: string) {
  ok(await db().from("trilhas").update({ status: "rascunho", updated_at: new Date().toISOString() }).eq("id", trilhaId), "despublicar");
}

export async function arquivarTrilha(trilhaId: string) {
  ok(await db().from("trilhas").update({ status: "arquivada", updated_at: new Date().toISOString() }).eq("id", trilhaId), "arquivar");
}

/** Cria uma cópia em rascunho no mesmo produto, com os materiais (mesmos arquivos) e as versões atuais de cada etapa. */
export async function duplicarTrilha(trilhaId: string) {
  const orig = ok(await db().from("trilhas").select("*").eq("id", trilhaId).single(), "trilha");
  const nova = await criarTrilha({
    produtoId: orig.produto_id,
    criadorId: orig.criador_id,
    titulo: `${orig.titulo} (cópia)`,
    descricao: orig.descricao ?? undefined,
    cor: orig.cor,
    icone: orig.icone,
  });
  if (orig.orientacao_objetivo || orig.orientacao_conteudos || orig.orientacao_complementos) {
    await atualizarTrilha(nova.id, {
      orientacao_objetivo: orig.orientacao_objetivo,
      orientacao_conteudos: orig.orientacao_conteudos,
      orientacao_complementos: orig.orientacao_complementos,
    });
  }
  const materiais = ok(await db().from("materiais").select("*").eq("trilha_id", trilhaId), "materiais");
  for (const m of materiais) {
    const novoCaminho = `${nova.id}/${m.storage_path.split("/").pop()}`;
    await db().storage.from("materiais").copy(m.storage_path, novoCaminho);
    const nm = ok(
      await db()
        .from("materiais")
        .insert({
          trilha_id: nova.id,
          storage_path: novoCaminho,
          nome: m.nome,
          mime: m.mime,
          tamanho_bytes: m.tamanho_bytes,
          paginas: m.paginas,
          status: m.status,
          erro: m.erro,
        })
        .select("id")
        .single(),
      "material copia",
    );
    const trechos = ok(await db().from("material_trechos").select("pagina, texto").eq("material_id", m.id).order("pagina"), "trechos");
    for (let i = 0; i < trechos.length; i += 200) {
      ok(
        await db()
          .from("material_trechos")
          .insert(trechos.slice(i, i + 200).map((t) => ({ ...t, material_id: nm.id, trilha_id: nova.id }))),
        "trechos copia",
      );
    }
  }
  for (const etapa of ORDEM_ETAPAS) {
    const snap = await getRascunho(trilhaId, etapa);
    if (!rascunhoVazio(etapa, snap)) {
      await salvarVersao({ trilhaId: nova.id, etapa, snapshot: snap, autor: "criador", resumo: "Copiado de outra trilha" });
    }
  }
  return nova;
}

function rascunhoVazio(etapa: Etapa, s: Snapshot) {
  if (etapa === "visao") return !(s as VisaoGeral).objetivo_geral && (s as VisaoGeral).competencias.length === 0;
  return etapa === "ementa"
    ? (s as Ementa).modulos.length === 0
    : etapa === "cards"
      ? (s as CardsDraft).cards.length === 0
      : (s as AulasDraft).aulas.length === 0;
}

// ─────────────────────────── Notificações ───────────────────────────

export async function notificar(lista: { userId: string; tipo: string; titulo: string; corpo?: string | null; link?: string | null }[]) {
  for (let i = 0; i < lista.length; i += 500) {
    ok(
      await db()
        .from("notificacoes")
        .insert(lista.slice(i, i + 500).map((n) => ({ user_id: n.userId, tipo: n.tipo, titulo: n.titulo, corpo: n.corpo ?? null, link: n.link ?? null }))),
      "notificar",
    );
  }
}

export async function listarNotificacoes(userId: string, limite = 20) {
  const [lista, naoLidas] = await Promise.all([
    db().from("notificacoes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limite),
    db().from("notificacoes").select("id", { count: "exact", head: true }).eq("user_id", userId).is("lida_em", null),
  ]);
  return { lista: ok(lista, "notificacoes"), naoLidas: naoLidas.count ?? 0 };
}

export async function marcarNotificacoesLidas(userId: string) {
  ok(await db().from("notificacoes").update({ lida_em: new Date().toISOString() }).eq("user_id", userId).is("lida_em", null), "ler notificacoes");
}

/** Avisa o criador da trilha (fim de uma geração longa do agente, por exemplo). */
export async function notificarCriadorDaTrilha(p: { trilhaId: string; tipo: string; titulo: string; corpo?: string; link?: string }) {
  const t = talvez(await db().from("trilhas").select("criador_id").eq("id", p.trilhaId).maybeSingle(), "criador da trilha");
  if (t) await notificar([{ userId: t.criador_id, tipo: p.tipo, titulo: p.titulo, corpo: p.corpo, link: p.link }]);
}

// ─────────────────────────── Materiais ───────────────────────────

export async function registrarMaterial(p: { trilhaId: string; storagePath: string; nome: string; mime: string; tamanho: number }) {
  return ok(
    await db()
      .from("materiais")
      .insert({ trilha_id: p.trilhaId, storage_path: p.storagePath, nome: p.nome, mime: p.mime, tamanho_bytes: p.tamanho, status: "processando" })
      .select()
      .single(),
    "material",
  );
}

export async function salvarPaginasMaterial(materialId: string, trilhaId: string, paginas: string[]) {
  ok(await db().from("material_trechos").delete().eq("material_id", materialId), "limpar trechos");
  const linhas = paginas.map((texto, i) => ({ material_id: materialId, trilha_id: trilhaId, pagina: i + 1, texto: texto || " " }));
  for (let i = 0; i < linhas.length; i += 200)
    ok(
      await db()
        .from("material_trechos")
        .insert(linhas.slice(i, i + 200)),
      "trechos",
    );
  ok(await db().from("materiais").update({ status: "pronto", paginas: paginas.length, erro: null }).eq("id", materialId), "material pronto");
}

export async function marcarErroMaterial(materialId: string, erro: string) {
  ok(await db().from("materiais").update({ status: "erro", erro }).eq("id", materialId), "erro material");
}

export async function removerMaterial(trilhaId: string, materialId: string) {
  const m = ok(await db().from("materiais").select("storage_path").eq("id", materialId).eq("trilha_id", trilhaId).single(), "material");
  await db().storage.from("materiais").remove([m.storage_path]);
  ok(await db().from("materiais").delete().eq("id", materialId), "remover material");
}
