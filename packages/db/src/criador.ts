import {
  handleDoNome,
  LIMITE_AGENTE_PADRAO,
  limparOrigem,
  mensagemCotaAgente,
  normalizarHandle,
  type PainelVendas,
  resumirVendas,
  STATUS_COM_ACESSO,
  slugDoNome,
  usoDoAssinante,
  validarHandle,
} from "@edu/core";
import { apagarConta, criarConta, normalizarNome, registrarAuditoria, registrarTentativa, type Usuario, verificarLimite } from "./acesso";
import { db, ok, talvez } from "./client";
import type { AssinaturaStatusDb, Json, JsonNaoNulo, Row } from "./database.types";
import { ErroAcesso, ErroPermissao } from "./erros";
import { slugLivre } from "./produtos";

/**
 * Criador de conteúdo: tem uma página pública (/c/@handle) com vários PRODUTOS, cada um com trilhas. O
 * fã ASSINA O CRIADOR: um preço libera as trilhas publicadas de todos os produtos publicados dele; a
 * assinatura guarda por qual produto o fã entrou. Sem pagamento ainda: toda entrada nasce 'cortesia'.
 */

export type PerfilCriadorRow = Row<"criador_perfis">;
export type Assinatura = Row<"assinaturas">;

export interface EscopoCriador {
  usuario: Usuario;
  perfil: PerfilCriadorRow;
}

/** Escopo do criador logado (null se a conta não é de criador ou ainda não tem perfil). */
export async function escopoCriador(usuario: Usuario): Promise<EscopoCriador | null> {
  if (usuario.role !== "criador" || usuario.status !== "ativo") return null;
  const perfil = talvez(await db().from("criador_perfis").select("*").eq("user_id", usuario.id).maybeSingle(), "perfil criador");
  return perfil ? { usuario, perfil } : null;
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
 * a página e um primeiro produto em rascunho. Qualquer falha desfaz tudo (apagar a conta cascateia).
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
    const nomeProduto = `Trilhas de ${nome.split(" ")[0]}`;
    ok(
      await db()
        .from("produtos")
        .insert({ criador_id: usuario.id, nome: nomeProduto, slug: await slugLivre(usuario.id, slugDoNome(nomeProduto)) }),
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

/** Preço mensal da assinatura do criador (null = ainda não definido). */
export async function salvarPrecoAssinatura(e: EscopoCriador, precoCentavos: number | null) {
  if (precoCentavos !== null && (!Number.isInteger(precoCentavos) || precoCentavos < 0)) throw new ErroAcesso("Preço inválido.");
  ok(
    await db().from("criador_perfis").update({ preco_centavos: precoCentavos, updated_at: new Date().toISOString() }).eq("user_id", e.usuario.id),
    "preço da assinatura",
  );
}

async function contarProdutosPublicados(criadorId: string) {
  const r = await db().from("produtos").select("id", { count: "exact", head: true }).eq("criador_id", criadorId).eq("status", "publicado");
  if (r.error) throw new Error(`[db] produtos publicados: ${r.error.message}`);
  return r.count ?? 0;
}

/** Abre (ou fecha) a página do criador para novos fãs. Abrir exige ao menos um produto publicado. */
export async function publicarPagina(e: EscopoCriador, publicar: boolean) {
  if (publicar && !(await contarProdutosPublicados(e.usuario.id))) {
    throw new ErroAcesso("Publique pelo menos um produto antes de abrir sua página para os fãs.");
  }
  const agora = new Date().toISOString();
  ok(
    await db()
      .from("criador_perfis")
      .update({
        pagina_status: publicar ? "publicada" : "rascunho",
        pagina_publicada_em: publicar ? (e.perfil.pagina_publicada_em ?? agora) : e.perfil.pagina_publicada_em,
        updated_at: agora,
      })
      .eq("user_id", e.usuario.id),
    "publicar página",
  );
  await registrarAuditoria({
    ator: e.usuario.id,
    acao: publicar ? "pagina.publicada" : "pagina.despublicada",
    entidade: "criador_perfis",
    entidadeId: e.usuario.id,
  });
}

// ─────────────────────────── Trilhas do criador ───────────────────────────

export interface TrilhaDoCriador extends Row<"trilhas"> {
  etapas: Row<"trilha_etapas">[];
  totalAulas: number;
}

/** Trilhas do criador (de um produto, se informado), na ordem da página. */
export async function trilhasDoCriador(
  e: EscopoCriador,
  f: { status?: "rascunho" | "publicada" | "arquivada" | "todas"; produtoId?: string } = {},
): Promise<TrilhaDoCriador[]> {
  let q = db().from("trilhas").select("*").eq("criador_id", e.usuario.id).order("ordem").order("updated_at", { ascending: false });
  if (f.produtoId) q = q.eq("produto_id", f.produtoId);
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

/** A trilha é deste criador; senão, ErroPermissao (não revela se existe). Devolve o produto dela. */
export async function exigirTrilhaDoCriador(e: EscopoCriador, trilhaId: string): Promise<{ produtoId: string }> {
  const t = /^[0-9a-f-]{36}$/i.test(trilhaId)
    ? talvez(await db().from("trilhas").select("produto_id, criador_id").eq("id", trilhaId).maybeSingle(), "trilha")
    : null;
  if (!t || t.criador_id !== e.usuario.id) throw new ErroPermissao("Trilha não encontrada.");
  return { produtoId: t.produto_id };
}

// ─────────────────────────── Página pública (vitrine) ───────────────────────────

export interface TrilhaVitrine {
  id: string;
  titulo: string;
  descricao: string | null;
  cor: string;
  icone: string;
  totalAulas: number;
}

export interface ProdutoVitrine {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  logo_path: string | null;
  cor_primaria: string;
  cor_destaque: string | null;
  trilhas: TrilhaVitrine[];
}

export interface CriadorVitrine {
  id: string;
  handle: string;
  nome: string;
  bio: string | null;
  foto_url: string | null;
  redes: RedesCriador;
  precoCentavos: number | null;
}

export interface Vitrine {
  criador: CriadorVitrine;
  /** A página aceita novos fãs: publicada e com ao menos um produto publicado. */
  publicada: boolean;
  /** Produtos publicados na ordem da página (vazio enquanto a página não está publicada). */
  produtos: ProdutoVitrine[];
}

async function perfilPorHandle(handleBruto: string): Promise<PerfilCriadorRow | null> {
  let handle: string;
  try {
    handle = normalizarHandle(decodeURIComponent(handleBruto));
  } catch {
    return null;
  }
  if (validarHandle(handle)) return null;
  return talvez(await db().from("criador_perfis").select("*").eq("handle", handle).maybeSingle(), "criador");
}

function criadorDaVitrine(perfil: PerfilCriadorRow): CriadorVitrine {
  return {
    id: perfil.user_id,
    handle: perfil.handle,
    nome: perfil.nome_publico,
    bio: perfil.bio,
    foto_url: perfil.foto_url,
    redes: lerRedes(perfil.redes),
    precoCentavos: perfil.preco_centavos,
  };
}

/** Produtos publicados do criador (ou só um, pelo slug), com as trilhas publicadas de cada um. */
async function produtosPublicados(criadorId: string, slug?: string): Promise<ProdutoVitrine[]> {
  let q = db()
    .from("produtos")
    .select("id, slug, nome, descricao, logo_path, cor_primaria, cor_destaque")
    .eq("criador_id", criadorId)
    .eq("status", "publicado")
    .order("ordem")
    .order("created_at");
  if (slug !== undefined) q = q.eq("slug", slug);
  const produtos = ok(await q, "produtos da vitrine");
  if (!produtos.length) return [];
  const trilhas = ok(
    await db()
      .from("trilhas")
      .select("id, produto_id, titulo, descricao, cor, icone")
      .in(
        "produto_id",
        produtos.map((p) => p.id),
      )
      .eq("status", "publicada")
      .order("ordem")
      .order("publicada_em"),
    "trilhas da vitrine",
  );
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
  return produtos.map((p) => ({
    ...p,
    trilhas: trilhas
      .filter((t) => t.produto_id === p.id)
      .map(({ produto_id: _, ...t }) => ({ ...t, totalAulas: aulas.filter((a) => a.trilha_id === t.id).length })),
  }));
}

/** O que qualquer pessoa vê em /c/@handle (sem e-mail; produtos só com a página publicada). */
export async function vitrinePorHandle(handleBruto: string): Promise<Vitrine | null> {
  const perfil = await perfilPorHandle(handleBruto);
  if (!perfil) return null;
  const produtos = perfil.pagina_status === "publicada" ? await produtosPublicados(perfil.user_id) : [];
  return { criador: criadorDaVitrine(perfil), publicada: produtos.length > 0, produtos };
}

/** Página de um produto (/@handle/<slug>): null se a página ou o produto não estão publicados. */
export async function produtoPorHandleESlug(handleBruto: string, slugBruto: string): Promise<{ criador: CriadorVitrine; produto: ProdutoVitrine } | null> {
  const slug = slugBruto.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const perfil = await perfilPorHandle(handleBruto);
  if (perfil?.pagina_status !== "publicada") return null;
  const [produto] = await produtosPublicados(perfil.user_id, slug);
  return produto ? { criador: criadorDaVitrine(perfil), produto } : null;
}

// ─────────────────────────── Assinaturas (lado do fã) ───────────────────────────

const temAcessoDb = (s: AssinaturaStatusDb) => STATUS_COM_ACESSO.includes(s);
const ehUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
const INDISPONIVEL = "Este conteúdo ainda não está disponível.";

/** A página do criador aceita novos fãs (publicada e com produto publicado); senão, ErroAcesso. */
async function exigirPaginaAberta(criadorId: string) {
  const perfil = ehUuid(criadorId)
    ? talvez(await db().from("criador_perfis").select("pagina_status").eq("user_id", criadorId).maybeSingle(), "página do criador")
    : null;
  if (perfil?.pagina_status !== "publicada" || !(await contarProdutosPublicados(criadorId))) throw new ErroAcesso(INDISPONIVEL);
}

/** Produto de entrada válido (publicado e do criador) ou null: só alimenta o relatório "entrou por". */
async function produtoDeEntrada(criadorId: string, produtoId: string | null | undefined): Promise<string | null> {
  if (!produtoId || !ehUuid(produtoId)) return null;
  const p = talvez(await db().from("produtos").select("criador_id, status").eq("id", produtoId).maybeSingle(), "produto de entrada");
  return p?.criador_id === criadorId && p.status === "publicado" ? produtoId : null;
}

const buscarAssinatura = async (criadorId: string, alunoId: string) =>
  talvez(await db().from("assinaturas").select("*").eq("criador_id", criadorId).eq("aluno_id", alunoId).maybeSingle(), "assinatura");

/**
 * Assinatura do fã no criador (idempotente): libera todos os produtos publicados dele. Sem pagamento
 * ainda: nasce como cortesia. `produtoEntradaId` registra por qual produto o fã chegou.
 */
export async function assinar(p: {
  aluno: Pick<Usuario, "id" | "role">;
  criadorId: string;
  produtoEntradaId?: string | null;
  origem?: string | null;
}): Promise<Assinatura> {
  if (p.aluno.role !== "aluno") throw new ErroAcesso("Esta conta não pode assinar: use uma conta de fã.");
  await exigirPaginaAberta(p.criadorId);
  const agora = new Date().toISOString();
  const existente = await buscarAssinatura(p.criadorId, p.aluno.id);
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
  const produtoId = await produtoDeEntrada(p.criadorId, p.produtoEntradaId);
  const nova = await db()
    .from("assinaturas")
    .insert({ criador_id: p.criadorId, produto_id: produtoId, aluno_id: p.aluno.id, status: "cortesia", origem: limparOrigem(p.origem) })
    .select("*")
    .single();
  // Corrida (dois cliques): a outra requisição já criou.
  if (nova.error?.code === "23505") {
    const outra = await buscarAssinatura(p.criadorId, p.aluno.id);
    if (outra) return outra;
  }
  const a = ok(nova, "assinar");
  await registrarAuditoria({
    ator: p.aluno.id,
    acao: "assinatura.criada",
    entidade: "assinaturas",
    entidadeId: a.id,
    dados: { criadorId: p.criadorId, produtoId, origem: a.origem },
  });
  return a;
}

/** O fã tem acesso ao criador agora (assinatura cortesia, ativa ou inadimplente)? */
export async function faTemAcesso(alunoId: string, criadorId: string) {
  if (!ehUuid(criadorId)) return false;
  const a = talvez(await db().from("assinaturas").select("status").eq("criador_id", criadorId).eq("aluno_id", alunoId).maybeSingle(), "assinatura");
  return !!a && temAcessoDb(a.status);
}

/** Fã novo: cria a conta (confirmada) e a assinatura do criador. */
export async function cadastrarFa(p: {
  criadorId: string;
  produtoEntradaId?: string | null;
  nome: string;
  email: string;
  senha: string;
  origem?: string | null;
  ip: string;
}) {
  const chave = `cadastro-fa:${p.ip}`;
  await verificarLimite(chave, 20, 60, { sucessos: true });
  await exigirPaginaAberta(p.criadorId);
  const usuario = await criarConta({ role: "aluno", nome: p.nome, email: p.email, senha: p.senha });
  try {
    await assinar({ aluno: usuario, criadorId: p.criadorId, produtoEntradaId: p.produtoEntradaId, origem: p.origem });
  } catch (e) {
    await apagarConta(usuario.auth_user_id);
    throw e;
  }
  await registrarTentativa([chave], true);
  return usuario;
}

/** Criadores que o fã assina com acesso, na ordem em que assinou. */
async function criadoresAssinados(alunoId: string): Promise<string[]> {
  const ass = ok(
    await db()
      .from("assinaturas")
      .select("criador_id")
      .eq("aluno_id", alunoId)
      .in("status", [...STATUS_COM_ACESSO])
      .order("iniciada_em"),
    "assinaturas do fã",
  );
  return ass.map((a) => a.criador_id);
}

/**
 * Trilhas publicadas dos produtos publicados dos criadores que o fã assina (com acesso). Os filtros
 * restringem a um criador ou a um produto.
 */
export async function trilhasDasAssinaturas(alunoId: string, f: { criadorId?: string; produtoId?: string } = {}): Promise<string[]> {
  let criadores = await criadoresAssinados(alunoId);
  if (f.criadorId) criadores = criadores.filter((c) => c === f.criadorId);
  if (!criadores.length) return [];
  let q = db().from("produtos").select("id").in("criador_id", criadores).eq("status", "publicado");
  if (f.produtoId) q = q.eq("id", f.produtoId);
  const produtos = ok(await q, "produtos assinados");
  if (!produtos.length) return [];
  const t = ok(
    await db()
      .from("trilhas")
      .select("id")
      .in(
        "produto_id",
        produtos.map((p) => p.id),
      )
      .eq("status", "publicada"),
    "trilhas assinadas",
  );
  return t.map((x) => x.id);
}

export interface CriadorDoFa {
  id: string;
  handle: string;
  nome: string;
  foto_url: string | null;
  bio: string | null;
  /** Nomes dos produtos publicados, na ordem da página. */
  produtos: string[];
}

/** Criadores que o fã assina (início e navegação do app): um por criador. */
export async function criadoresDoFa(alunoId: string): Promise<CriadorDoFa[]> {
  const ids = await criadoresAssinados(alunoId);
  if (!ids.length) return [];
  const [perfis, produtos] = await Promise.all([
    db().from("criador_perfis").select("user_id, handle, nome_publico, foto_url, bio").in("user_id", ids),
    db().from("produtos").select("criador_id, nome").in("criador_id", ids).eq("status", "publicado").order("ordem").order("created_at"),
  ]);
  const listaPerfis = ok(perfis, "perfis");
  const listaProdutos = ok(produtos, "produtos dos criadores");
  return ids.flatMap((id) => {
    const p = listaPerfis.find((x) => x.user_id === id);
    return p
      ? [
          {
            id,
            handle: p.handle,
            nome: p.nome_publico,
            foto_url: p.foto_url,
            bio: p.bio,
            produtos: listaProdutos.filter((x) => x.criador_id === id).map((x) => x.nome),
          },
        ]
      : [];
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
    db().from("assinaturas").select("aluno_id, status, valor_centavos, origem, iniciada_em").eq("criador_id", e.usuario.id),
    db().from("trilhas").select("id, titulo").eq("criador_id", e.usuario.id).eq("status", "publicada").order("ordem").order("publicada_em"),
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
  /** Produto pelo qual o fã entrou (null: pela página do criador). */
  entrouPor: string | null;
}

/** Assinantes do criador (sem e-mail: o criador vê nome, status, por onde entrou e uso). */
export async function assinantesDoCriador(e: EscopoCriador): Promise<LinhaAssinante[]> {
  const ass = ok(
    await db()
      .from("assinaturas")
      .select("aluno_id, status, origem, iniciada_em, produto:produtos(nome), aluno:users!assinaturas_aluno_id_fkey(id, nome, avatar_url)")
      .eq("criador_id", e.usuario.id)
      .order("iniciada_em", { ascending: false }),
    "assinantes",
  ) as unknown as {
    aluno_id: string;
    status: AssinaturaStatusDb;
    origem: string | null;
    iniciada_em: string;
    produto: { nome: string } | null;
    aluno: { id: string; nome: string; avatar_url: string | null };
  }[];
  if (!ass.length) return [];
  const trilhas = ok(await db().from("trilhas").select("id").eq("criador_id", e.usuario.id), "trilhas");
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
    entrouPor: a.produto?.nome ?? null,
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
