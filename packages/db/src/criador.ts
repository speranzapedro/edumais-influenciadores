import {
  handleDoNome,
  LIMITE_AGENTE_PADRAO,
  limparOrigem,
  mensagemCotaAgente,
  normalizarHandle,
  type PainelVendas,
  resumirVendas,
  STATUS_COM_ACESSO,
  usoDoAssinante,
  validarHandle,
} from "@edu/core";
import { apagarConta, criarConta, normalizarNome, registrarAuditoria, registrarTentativa, type Usuario, verificarLimite } from "./acesso";
import { db, ok, talvez } from "./client";
import type { AssinaturaStatusDb, Json, JsonNaoNulo, Row } from "./database.types";
import { ErroAcesso, ErroPermissao } from "./erros";

/**
 * Criador de conteúdo: tem um perfil público (/c/@handle) e vende um PRODUTO com várias trilhas. O fã
 * entra pela página do criador e ganha uma ASSINATURA, que libera as trilhas publicadas do produto.
 * Sem pagamento ainda: toda entrada nasce como 'cortesia'.
 */

export type PerfilCriadorRow = Row<"criador_perfis">;
export type Produto = Row<"produtos">;
export type Assinatura = Row<"assinaturas">;

export interface EscopoCriador {
  usuario: Usuario;
  perfil: PerfilCriadorRow;
  produto: Produto;
}

/** Escopo do criador logado (null se a conta não é de criador ou ainda não tem perfil e produto). */
export async function escopoCriador(usuario: Usuario): Promise<EscopoCriador | null> {
  if (usuario.role !== "criador" || usuario.status !== "ativo") return null;
  const [perfil, produto] = await Promise.all([
    db().from("criador_perfis").select("*").eq("user_id", usuario.id).maybeSingle(),
    db().from("produtos").select("*").eq("criador_id", usuario.id).order("created_at").limit(1).maybeSingle(),
  ]);
  const p = talvez(perfil, "perfil criador");
  const prod = talvez(produto, "produto");
  return p && prod ? { usuario, perfil: p, produto: prod } : null;
}

// ─────────────────────────── Cadastro ───────────────────────────

async function handleLivre(handle: string, dono?: string) {
  const r = talvez(await db().from("criador_perfis").select("user_id").eq("handle", handle).maybeSingle(), "handle");
  return !r || r.user_id === dono;
}

/** Primeiro @ livre a partir de uma base (base, base2, base3…). */
async function handleDisponivel(base: string) {
  for (let i = 0; i < 50; i++) {
    const h = i === 0 ? base : `${base.slice(0, 28)}${i + 1}`;
    if (await handleLivre(h)) return h;
  }
  return `${base.slice(0, 22)}${Date.now().toString(36).slice(-8)}`;
}

const HANDLE_EM_USO = "Este @ já está em uso na Edu+. Escolha outro.";

/**
 * Cadastro do criador pelo link secreto (o app confere a chave antes). A conta nasce confirmada, com
 * o perfil público e o produto em rascunho. Qualquer falha desfaz tudo (apagar a conta cascateia).
 */
export async function cadastrarCriador(p: { nome: string; email: string; senha: string; handle?: string; ip: string }) {
  const email = p.email.trim().toLowerCase();
  const chaves = [`ip:${p.ip}`, `cadastro:${email}`];
  for (const c of chaves) await verificarLimite(c, c.startsWith("ip:") ? 10 : 5, 60);
  const nome = normalizarNome(p.nome);

  let handle: string | null = null;
  if (p.handle?.trim()) {
    handle = normalizarHandle(p.handle);
    const erro = validarHandle(handle);
    if (erro) throw new ErroAcesso(erro);
    if (!(await handleLivre(handle))) throw new ErroAcesso(HANDLE_EM_USO);
  }

  let usuario: Usuario;
  try {
    usuario = await criarConta({ role: "criador", nome, email, senha: p.senha });
  } catch (e) {
    if (e instanceof ErroAcesso) await registrarTentativa(chaves, false);
    throw e;
  }
  try {
    handle ??= await handleDisponivel(handleDoNome(nome));
    const perfil = await db()
      .from("criador_perfis")
      .insert({ user_id: usuario.id, handle, nome_publico: nome.slice(0, 80) });
    if (perfil.error?.code === "23505") throw new ErroAcesso(HANDLE_EM_USO);
    ok(perfil, "perfil criador");
    ok(
      await db()
        .from("produtos")
        .insert({ criador_id: usuario.id, nome: `Trilhas de ${nome.split(" ")[0]}` }),
      "produto",
    );
  } catch (e) {
    await apagarConta(usuario.auth_user_id);
    throw e;
  }
  await registrarTentativa(chaves, true);
  await registrarAuditoria({ ator: usuario.id, acao: "criador.cadastrado", entidade: "users", entidadeId: usuario.id });
  return { usuario, handle };
}

// ─────────────────────────── Perfil público e produto ───────────────────────────

export interface RedesCriador {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
}

const REDES = ["instagram", "tiktok", "youtube"] as const;

export function lerRedes(j: Json | null | undefined): RedesCriador {
  const o = (j && typeof j === "object" && !Array.isArray(j) ? j : {}) as Record<string, unknown>;
  const r: RedesCriador = {};
  for (const k of REDES) if (typeof o[k] === "string" && o[k]) r[k] = o[k] as string;
  return r;
}

export async function salvarPerfilCriador(
  e: EscopoCriador,
  p: { nomePublico: string; handle: string; bio: string | null; fotoUrl?: string | null; redes: RedesCriador },
) {
  const nome = normalizarNome(p.nomePublico);
  if (nome.length < 2) throw new ErroAcesso("Informe o nome que seus seguidores conhecem.");
  const handle = normalizarHandle(p.handle);
  const erro = validarHandle(handle);
  if (erro) throw new ErroAcesso(erro);
  if (!(await handleLivre(handle, e.usuario.id))) throw new ErroAcesso(HANDLE_EM_USO);
  const redes: RedesCriador = {};
  for (const k of REDES) {
    const v = p.redes[k]?.trim().replace(/^@+/, "").slice(0, 120);
    if (v) redes[k] = v;
  }
  const agora = new Date().toISOString();
  const r = await db()
    .from("criador_perfis")
    .update({
      nome_publico: nome.slice(0, 80),
      handle,
      bio: p.bio?.trim().slice(0, 500) || null,
      redes: redes as unknown as JsonNaoNulo,
      updated_at: agora,
      ...(p.fotoUrl !== undefined ? { foto_url: p.fotoUrl } : {}),
    })
    .eq("user_id", e.usuario.id);
  if (r.error?.code === "23505") throw new ErroAcesso(HANDLE_EM_USO);
  ok(r, "salvar perfil criador");
  if (p.fotoUrl !== undefined) ok(await db().from("users").update({ avatar_url: p.fotoUrl, updated_at: agora }).eq("id", e.usuario.id), "foto");
}

export async function salvarProduto(e: EscopoCriador, p: { nome: string; descricao: string | null; precoCentavos: number | null }) {
  const nome = normalizarNome(p.nome);
  if (nome.length < 3) throw new ErroAcesso("Dê um nome ao seu produto.");
  if (p.precoCentavos !== null && (!Number.isInteger(p.precoCentavos) || p.precoCentavos < 0)) throw new ErroAcesso("Preço inválido.");
  ok(
    await db()
      .from("produtos")
      .update({
        nome: nome.slice(0, 80),
        descricao: p.descricao?.trim().slice(0, 600) || null,
        preco_centavos: p.precoCentavos,
        updated_at: new Date().toISOString(),
      })
      .eq("id", e.produto.id),
    "salvar produto",
  );
}

async function contarTrilhasPublicadas(produtoId: string) {
  const r = await db().from("trilhas").select("id", { count: "exact", head: true }).eq("produto_id", produtoId).eq("status", "publicada");
  if (r.error) throw new Error(`[db] trilhas publicadas: ${r.error.message}`);
  return r.count ?? 0;
}

/** Publica (ou tira do ar) a página do produto. Publicar exige ao menos uma trilha publicada. */
export async function publicarProduto(e: EscopoCriador, publicar: boolean) {
  if (publicar && !(await contarTrilhasPublicadas(e.produto.id))) {
    throw new ErroAcesso("Publique pelo menos uma trilha antes de abrir sua página para os fãs.");
  }
  const agora = new Date().toISOString();
  ok(
    await db()
      .from("produtos")
      .update({
        status: publicar ? "publicado" : "rascunho",
        publicado_em: publicar ? (e.produto.publicado_em ?? agora) : e.produto.publicado_em,
        updated_at: agora,
      })
      .eq("id", e.produto.id),
    "publicar produto",
  );
  await registrarAuditoria({
    ator: e.usuario.id,
    acao: publicar ? "produto.publicado" : "produto.despublicado",
    entidade: "produtos",
    entidadeId: e.produto.id,
  });
}

// ─────────────────────────── Trilhas do criador ───────────────────────────

export interface TrilhaDoCriador extends Row<"trilhas"> {
  etapas: Row<"trilha_etapas">[];
  totalAulas: number;
}

export async function trilhasDoCriador(e: EscopoCriador, f: { status?: "rascunho" | "publicada" | "arquivada" | "todas" } = {}): Promise<TrilhaDoCriador[]> {
  let q = db().from("trilhas").select("*").eq("produto_id", e.produto.id).order("ordem").order("updated_at", { ascending: false });
  q = !f.status || f.status === "todas" ? q.neq("status", "arquivada") : q.eq("status", f.status);
  const lista = ok(await q, "trilhas do criador");
  const ids = lista.map((t) => t.id);
  if (!ids.length) return [];
  const [etapas, aulas] = await Promise.all([
    db().from("trilha_etapas").select("*").in("trilha_id", ids),
    db().from("aulas").select("trilha_id").in("trilha_id", ids).is("arquivada_em", null),
  ]);
  const listaEtapas = ok(etapas, "etapas");
  const listaAulas = ok(aulas, "aulas");
  return lista.map((t) => ({
    ...t,
    etapas: listaEtapas.filter((x) => x.trilha_id === t.id),
    totalAulas: listaAulas.filter((a) => a.trilha_id === t.id).length,
  }));
}

/** A trilha é do produto deste criador; senão, ErroPermissao (não revela se existe). */
export async function exigirTrilhaDoCriador(e: EscopoCriador, trilhaId: string) {
  const t = /^[0-9a-f-]{36}$/i.test(trilhaId)
    ? talvez(await db().from("trilhas").select("produto_id, criador_id").eq("id", trilhaId).maybeSingle(), "trilha")
    : null;
  if (!t || t.criador_id !== e.usuario.id || t.produto_id !== e.produto.id) throw new ErroPermissao("Trilha não encontrada.");
}

// ─────────────────────────── Página pública (vitrine) ───────────────────────────

export interface Vitrine {
  criador: { id: string; handle: string; nome: string; bio: string | null; foto_url: string | null; redes: RedesCriador };
  produto: { id: string; nome: string; descricao: string | null; publicado: boolean };
  trilhas: { id: string; titulo: string; descricao: string | null; cor: string; icone: string; totalAulas: number }[];
}

/** O que qualquer pessoa vê em /c/@handle (sem e-mail; trilhas só com o produto publicado). */
export async function vitrinePorHandle(handleBruto: string): Promise<Vitrine | null> {
  let handle: string;
  try {
    handle = normalizarHandle(decodeURIComponent(handleBruto));
  } catch {
    return null;
  }
  if (validarHandle(handle)) return null;
  const perfil = talvez(await db().from("criador_perfis").select("*").eq("handle", handle).maybeSingle(), "criador");
  if (!perfil) return null;
  const produto = talvez(await db().from("produtos").select("*").eq("criador_id", perfil.user_id).order("created_at").limit(1).maybeSingle(), "produto");
  if (!produto) return null;
  const publicado = produto.status === "publicado";
  const trilhas = publicado
    ? ok(
        await db()
          .from("trilhas")
          .select("id, titulo, descricao, cor, icone")
          .eq("produto_id", produto.id)
          .eq("status", "publicada")
          .order("ordem")
          .order("publicada_em"),
        "trilhas da vitrine",
      )
    : [];
  const aulas = trilhas.length
    ? ok(
        await db()
          .from("aulas")
          .select("trilha_id")
          .in(
            "trilha_id",
            trilhas.map((t) => t.id),
          )
          .is("arquivada_em", null),
        "aulas da vitrine",
      )
    : [];
  return {
    criador: {
      id: perfil.user_id,
      handle: perfil.handle,
      nome: perfil.nome_publico,
      bio: perfil.bio,
      foto_url: perfil.foto_url,
      redes: lerRedes(perfil.redes),
    },
    produto: { id: produto.id, nome: produto.nome, descricao: produto.descricao, publicado },
    trilhas: trilhas.map((t) => ({ ...t, totalAulas: aulas.filter((a) => a.trilha_id === t.id).length })),
  };
}

// ─────────────────────────── Assinaturas (lado do fã) ───────────────────────────

const temAcessoDb = (s: AssinaturaStatusDb) => STATUS_COM_ACESSO.includes(s);

async function produtoPublicado(produtoId: string) {
  const p = /^[0-9a-f-]{36}$/i.test(produtoId) ? talvez(await db().from("produtos").select("*").eq("id", produtoId).maybeSingle(), "produto") : null;
  if (p?.status !== "publicado") throw new ErroAcesso("Este conteúdo ainda não está disponível.");
  return p;
}

/** Assinatura do fã no produto (idempotente). Sem pagamento ainda: nasce como cortesia. */
export async function assinar(p: { aluno: Pick<Usuario, "id" | "role">; produtoId: string; origem?: string | null }): Promise<Assinatura> {
  if (p.aluno.role !== "aluno") throw new ErroAcesso("Esta conta não pode assinar: use uma conta de fã.");
  await produtoPublicado(p.produtoId);
  const agora = new Date().toISOString();
  const existente = talvez(await db().from("assinaturas").select("*").eq("produto_id", p.produtoId).eq("aluno_id", p.aluno.id).maybeSingle(), "assinatura");
  if (existente) {
    if (temAcessoDb(existente.status)) return existente;
    // Volta depois de cancelar/expirar: reabre como cortesia.
    return ok(
      await db()
        .from("assinaturas")
        .update({
          status: "cortesia",
          cancelada_em: null,
          expira_em: null,
          iniciada_em: agora,
          origem: limparOrigem(p.origem) ?? existente.origem,
          updated_at: agora,
        })
        .eq("id", existente.id)
        .select("*")
        .single(),
      "reabrir assinatura",
    );
  }
  const nova = await db()
    .from("assinaturas")
    .insert({ produto_id: p.produtoId, aluno_id: p.aluno.id, status: "cortesia", origem: limparOrigem(p.origem) })
    .select("*")
    .single();
  // Corrida (dois cliques): a outra requisição já criou.
  if (nova.error?.code === "23505")
    return ok(await db().from("assinaturas").select("*").eq("produto_id", p.produtoId).eq("aluno_id", p.aluno.id).single(), "assinatura");
  const a = ok(nova, "assinar");
  await registrarAuditoria({
    ator: p.aluno.id,
    acao: "assinatura.criada",
    entidade: "assinaturas",
    entidadeId: a.id,
    dados: { produtoId: p.produtoId, origem: a.origem },
  });
  return a;
}

/** Fã novo: cria a conta (confirmada) e a assinatura do produto. */
export async function cadastrarFa(p: { produtoId: string; nome: string; email: string; senha: string; origem?: string | null; ip: string }) {
  const chave = `cadastro-fa:${p.ip}`;
  await verificarLimite(chave, 20, 60, { sucessos: true });
  await produtoPublicado(p.produtoId);
  const usuario = await criarConta({ role: "aluno", nome: p.nome, email: p.email, senha: p.senha });
  try {
    await assinar({ aluno: usuario, produtoId: p.produtoId, origem: p.origem });
  } catch (e) {
    await apagarConta(usuario.auth_user_id);
    throw e;
  }
  await registrarTentativa([chave], true);
  return usuario;
}

/** Trilhas publicadas dos produtos publicados que o fã assina (com acesso). */
export async function trilhasDasAssinaturas(alunoId: string): Promise<string[]> {
  const ass = ok(
    await db()
      .from("assinaturas")
      .select("produto_id, produto:produtos!inner(status)")
      .eq("aluno_id", alunoId)
      .in("status", [...STATUS_COM_ACESSO]),
    "assinaturas do fã",
  ) as unknown as { produto_id: string; produto: { status: string } }[];
  const produtos = ass.filter((a) => a.produto.status === "publicado").map((a) => a.produto_id);
  if (!produtos.length) return [];
  const t = ok(await db().from("trilhas").select("id").in("produto_id", produtos).eq("status", "publicada"), "trilhas assinadas");
  return t.map((x) => x.id);
}

export interface CriadorDoFa {
  id: string;
  handle: string;
  nome: string;
  foto_url: string | null;
  bio: string | null;
  produto: string;
}

/** Criadores que o fã assina (início e navegação do app). */
export async function criadoresDoFa(alunoId: string): Promise<CriadorDoFa[]> {
  const ass = ok(
    await db()
      .from("assinaturas")
      .select("produto:produtos!inner(nome, criador_id)")
      .eq("aluno_id", alunoId)
      .in("status", [...STATUS_COM_ACESSO])
      .order("iniciada_em"),
    "criadores do fã",
  ) as unknown as { produto: { nome: string; criador_id: string } }[];
  if (!ass.length) return [];
  const perfis = ok(
    await db()
      .from("criador_perfis")
      .select("user_id, handle, nome_publico, foto_url, bio")
      .in(
        "user_id",
        ass.map((a) => a.produto.criador_id),
      ),
    "perfis",
  );
  return ass.flatMap((a) => {
    const p = perfis.find((x) => x.user_id === a.produto.criador_id);
    return p ? [{ id: p.user_id, handle: p.handle, nome: p.nome_publico, foto_url: p.foto_url, bio: p.bio, produto: a.produto.nome }] : [];
  });
}

/** Criador (perfil público) dono de uma trilha, para o "Preparada por" no app do fã. */
export async function criadorDaTrilha(trilhaId: string): Promise<{ handle: string; nome: string; foto_url: string | null } | null> {
  const t = talvez(await db().from("trilhas").select("criador_id").eq("id", trilhaId).maybeSingle(), "trilha");
  if (!t) return null;
  const p = talvez(await db().from("criador_perfis").select("handle, nome_publico, foto_url").eq("user_id", t.criador_id).maybeSingle(), "perfil");
  return p ? { handle: p.handle, nome: p.nome_publico, foto_url: p.foto_url } : null;
}

// ─────────────────────────── Painel comercial ───────────────────────────

export type { PainelVendas };

export async function painelVendas(e: EscopoCriador, dias = 30): Promise<PainelVendas> {
  const [assRes, trilhasRes] = await Promise.all([
    db().from("assinaturas").select("aluno_id, status, valor_centavos, origem, iniciada_em").eq("produto_id", e.produto.id),
    db().from("trilhas").select("id, titulo").eq("produto_id", e.produto.id).eq("status", "publicada").order("ordem").order("publicada_em"),
  ]);
  const assinaturas = ok(assRes, "assinaturas");
  const trilhas = ok(trilhasRes, "trilhas publicadas");
  const alunos = assinaturas.filter((a) => temAcessoDb(a.status)).map((a) => a.aluno_id);
  const aulas = trilhas.length
    ? ok(
        await db()
          .from("aulas")
          .select("id, trilha_id")
          .in(
            "trilha_id",
            trilhas.map((t) => t.id),
          )
          .is("arquivada_em", null),
        "aulas",
      )
    : [];
  const conclusoes =
    alunos.length && aulas.length
      ? ok(
          await db()
            .from("aula_conclusoes")
            .select("user_id, aula_id, concluida_em")
            .in("user_id", alunos)
            .in(
              "aula_id",
              aulas.map((a) => a.id),
            ),
          "conclusoes",
        )
      : [];
  return resumirVendas({ dias, timeZone: process.env.APP_TIMEZONE, assinaturas, trilhas, aulas, conclusoes });
}

export interface LinhaAssinante {
  id: string;
  nome: string;
  avatar_url: string | null;
  status: AssinaturaStatusDb;
  origem: string | null;
  desde: string;
  aulasConcluidas: number;
  ultimaAula: string | null;
}

/** Assinantes do produto (sem e-mail: o criador vê nome, status e uso). */
export async function assinantesDoCriador(e: EscopoCriador): Promise<LinhaAssinante[]> {
  const ass = ok(
    await db()
      .from("assinaturas")
      .select("aluno_id, status, origem, iniciada_em, aluno:users!assinaturas_aluno_id_fkey(id, nome, avatar_url)")
      .eq("produto_id", e.produto.id)
      .order("iniciada_em", { ascending: false }),
    "assinantes",
  ) as unknown as {
    aluno_id: string;
    status: AssinaturaStatusDb;
    origem: string | null;
    iniciada_em: string;
    aluno: { id: string; nome: string; avatar_url: string | null };
  }[];
  if (!ass.length) return [];
  const trilhas = ok(await db().from("trilhas").select("id").eq("produto_id", e.produto.id), "trilhas");
  const aulas = trilhas.length
    ? ok(
        await db()
          .from("aulas")
          .select("id")
          .in(
            "trilha_id",
            trilhas.map((t) => t.id),
          ),
        "aulas",
      )
    : [];
  const conclusoes = aulas.length
    ? ok(
        await db()
          .from("aula_conclusoes")
          .select("user_id, aula_id, concluida_em")
          .in(
            "user_id",
            ass.map((a) => a.aluno_id),
          )
          .in(
            "aula_id",
            aulas.map((a) => a.id),
          ),
        "conclusoes",
      )
    : [];
  return ass.map((a) => ({
    id: a.aluno.id,
    nome: a.aluno.nome,
    avatar_url: a.aluno.avatar_url,
    status: a.status,
    origem: a.origem,
    desde: a.iniciada_em,
    ...usoDoAssinante(a.aluno_id, conclusoes),
  }));
}

// ─────────────────────────── IA ───────────────────────────

/** Quem é o criador e o público da trilha, para os prompts da IA (mesma forma de PerfilCriadorIA em @edu/ai). */
export interface PerfilIACriador {
  nome: string;
  publico: string;
}

export function montarPerfilCriador(p: { criador: string; handle: string; produto: string; descricao: string | null; bio: string | null }): PerfilIACriador {
  const partes = [`Seguidores de ${p.criador} (@${p.handle}) que assinaram "${p.produto}".`];
  if (p.descricao) partes.push(`Sobre o produto, nas palavras do criador: ${p.descricao.replace(/[.\s]+$/, "")}.`);
  if (p.bio) partes.push(`Quem é o criador: ${p.bio.replace(/[.\s]+$/, "")}.`);
  return { nome: p.criador, publico: partes.join(" ") };
}

/** Perfil de IA e nome do produto da trilha (null se a trilha não existe). */
export async function perfilIADaTrilha(trilhaId: string): Promise<{ perfil: PerfilIACriador; produto: string } | null> {
  const t = talvez(await db().from("trilhas").select("criador_id, produto:produtos(nome, descricao)").eq("id", trilhaId).maybeSingle(), "trilha") as {
    criador_id: string;
    produto: { nome: string; descricao: string | null } | null;
  } | null;
  if (!t?.produto) return null;
  const perfil = talvez(await db().from("criador_perfis").select("nome_publico, handle, bio").eq("user_id", t.criador_id).maybeSingle(), "perfil criador");
  return {
    produto: t.produto.nome,
    perfil: montarPerfilCriador({
      criador: perfil?.nome_publico ?? "o criador",
      handle: perfil?.handle ?? "criador",
      produto: t.produto.nome,
      descricao: t.produto.descricao,
      bio: perfil?.bio ?? null,
    }),
  };
}

// ─────────────────────────── Cota do agente ───────────────────────────

export const limiteAgenteMes = () => Number(process.env.LIMITE_AGENTE_MES) || LIMITE_AGENTE_PADRAO;

/** Execuções do agente (geração e refinamento) nas trilhas do criador nos últimos 30 dias. */
export async function execucoesDoAgenteNoMes(e: EscopoCriador) {
  const trilhas = ok(await db().from("trilhas").select("id").eq("criador_id", e.usuario.id), "trilhas cota");
  if (!trilhas.length) return 0;
  const r = await db()
    .from("agente_execucoes")
    .select("id", { count: "exact", head: true })
    .in(
      "trilha_id",
      trilhas.map((t) => t.id),
    )
    .in("tipo", ["geracao", "refinamento"])
    .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString());
  if (r.error) throw new Error(`[db] cota do agente: ${r.error.message}`);
  return r.count ?? 0;
}

/** Mensagem de bloqueio quando a cota acabou (null = pode rodar). */
export async function cotaDoAgente(e: EscopoCriador): Promise<string | null> {
  return mensagemCotaAgente(await execucoesDoAgenteNoMes(e), limiteAgenteMes());
}
