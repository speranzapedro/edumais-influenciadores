import { CAMINHO_MARCA, normalizarHex, normalizarSlug, slugDoNome, slugNumerado, validarSlugProduto } from "@edu/core";
import { normalizarNome, registrarAuditoria } from "./acesso";
import { db, ok, talvez } from "./client";
import type { EscopoCriador } from "./criador";
import type { Row } from "./database.types";
import { ErroAcesso, ErroPermissao } from "./erros";
import { removerMarca } from "./marca";

/**
 * Produtos do criador. Cada produto agrupa trilhas e tem endereço (/@criador/<slug>), logo e cores
 * próprios. O fã assina o criador, não o produto: publicar um produto o libera para todos os assinantes.
 */

export type Produto = Row<"produtos">;

const ehUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
const SLUG_EM_USO = "Você já tem um produto com este endereço. Escolha outro.";

/** Produtos do criador na ordem da página (todos os status). */
export async function listarProdutos(e: EscopoCriador): Promise<Produto[]> {
  return ok(await db().from("produtos").select("*").eq("criador_id", e.usuario.id).order("ordem").order("created_at"), "produtos do criador");
}

/** O produto é deste criador; senão, ErroPermissao (não revela se existe). */
export async function exigirProdutoDoCriador(e: EscopoCriador, produtoId: string): Promise<Produto> {
  const p = ehUuid(produtoId) ? talvez(await db().from("produtos").select("*").eq("id", produtoId).maybeSingle(), "produto") : null;
  if (!p || p.criador_id !== e.usuario.id) throw new ErroPermissao("Produto não encontrado.");
  return p;
}

/** Primeiro slug livre entre os produtos do criador a partir de uma base (base, base-2, base-3…). */
export async function slugLivre(criadorId: string, base: string, ignorar?: string): Promise<string> {
  const usados = new Set(
    ok(await db().from("produtos").select("id, slug").eq("criador_id", criadorId), "slugs")
      .filter((p) => p.id !== ignorar)
      .map((p) => p.slug),
  );
  for (let n = 1; ; n++) {
    const s = slugNumerado(base, n);
    if (!usados.has(s)) return s;
  }
}

function validarNome(nome: string) {
  const n = normalizarNome(nome);
  if (n.length < 3) throw new ErroAcesso("Dê um nome ao seu produto.");
  return n.slice(0, 80);
}

function validarSlug(slug: string) {
  const s = normalizarSlug(slug);
  const erro = validarSlugProduto(s);
  if (erro) throw new ErroAcesso(erro);
  return s;
}

const descricaoLimpa = (d: string | null | undefined) => d?.trim().slice(0, 600) || null;

/** Cria um produto em rascunho no fim da lista. Sem slug, sai do nome (desempatado). */
export async function criarProduto(e: EscopoCriador, p: { nome: string; slug?: string | null; descricao?: string | null }): Promise<Produto> {
  const nome = validarNome(p.nome);
  const slug = p.slug?.trim() ? validarSlug(p.slug) : await slugLivre(e.usuario.id, slugDoNome(nome));
  const ultimo = talvez(
    await db().from("produtos").select("ordem").eq("criador_id", e.usuario.id).order("ordem", { ascending: false }).limit(1).maybeSingle(),
    "ordem dos produtos",
  );
  const r = await db()
    .from("produtos")
    .insert({ criador_id: e.usuario.id, nome, slug, descricao: descricaoLimpa(p.descricao), ordem: ultimo ? ultimo.ordem + 1 : 0 })
    .select("*")
    .single();
  if (r.error?.code === "23505") throw new ErroAcesso(SLUG_EM_USO);
  const produto = ok(r, "criar produto");
  await registrarAuditoria({ ator: e.usuario.id, acao: "produto.criado", entidade: "produtos", entidadeId: produto.id });
  return produto;
}

/** Nome, endereço e descrição do produto. */
export async function salvarProduto(e: EscopoCriador, produtoId: string, p: { nome: string; slug: string; descricao: string | null }) {
  await exigirProdutoDoCriador(e, produtoId);
  const r = await db()
    .from("produtos")
    .update({ nome: validarNome(p.nome), slug: validarSlug(p.slug), descricao: descricaoLimpa(p.descricao), updated_at: new Date().toISOString() })
    .eq("id", produtoId);
  if (r.error?.code === "23505") throw new ErroAcesso(SLUG_EM_USO);
  ok(r, "salvar produto");
}

/**
 * Identidade visual do produto: cor principal, destaque opcional e logo (caminho já enviado ao bucket
 * de marcas; `undefined` mantém o atual). As cores só aceitam #rrggbb; o contraste é resolvido na hora
 * de gerar o tema (gerarTema em @edu/core), que avisa o criador do que ajustou.
 */
export async function salvarIdentidadeProduto(
  e: EscopoCriador,
  produtoId: string,
  p: { corPrimaria: string; corDestaque: string | null; logoPath?: string | null },
) {
  const atual = await exigirProdutoDoCriador(e, produtoId);
  const primaria = normalizarHex(p.corPrimaria);
  if (!primaria) throw new ErroAcesso("Escolha a cor principal no formato #RRGGBB.");
  const destaque = p.corDestaque?.trim() ? normalizarHex(p.corDestaque) : null;
  if (p.corDestaque?.trim() && !destaque) throw new ErroAcesso("Escolha a cor de destaque no formato #RRGGBB.");
  if (p.logoPath) {
    const m = CAMINHO_MARCA.exec(p.logoPath);
    if (!m || m[1] !== e.usuario.id) throw new ErroPermissao("Logo inválido.");
  }
  ok(
    await db()
      .from("produtos")
      .update({
        cor_primaria: primaria,
        cor_destaque: destaque,
        ...(p.logoPath !== undefined ? { logo_path: p.logoPath } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", produtoId),
    "identidade do produto",
  );
  // Logo trocado ou retirado: o arquivo antigo sai do bucket.
  if (p.logoPath !== undefined && atual.logo_path && atual.logo_path !== p.logoPath) await removerMarca(e, atual.logo_path);
}

async function contarTrilhasPublicadas(produtoId: string) {
  const r = await db().from("trilhas").select("id", { count: "exact", head: true }).eq("produto_id", produtoId).eq("status", "publicada");
  if (r.error) throw new Error(`[db] trilhas publicadas: ${r.error.message}`);
  return r.count ?? 0;
}

/** Publica (ou tira do ar) o produto. Publicar exige ao menos uma trilha publicada nele. */
export async function publicarProduto(e: EscopoCriador, produtoId: string, publicar: boolean) {
  const produto = await exigirProdutoDoCriador(e, produtoId);
  if (publicar && !(await contarTrilhasPublicadas(produtoId))) {
    throw new ErroAcesso("Publique pelo menos uma trilha deste produto antes de abri-lo para os fãs.");
  }
  const agora = new Date().toISOString();
  ok(
    await db()
      .from("produtos")
      .update({
        status: publicar ? "publicado" : "rascunho",
        publicado_em: publicar ? (produto.publicado_em ?? agora) : produto.publicado_em,
        updated_at: agora,
      })
      .eq("id", produtoId),
    "publicar produto",
  );
  await registrarAuditoria({
    ator: e.usuario.id,
    acao: publicar ? "produto.publicado" : "produto.despublicado",
    entidade: "produtos",
    entidadeId: produtoId,
  });
}

/** Nova ordem dos produtos na página (ids na ordem; todos deste criador). */
export async function reordenarProdutos(e: EscopoCriador, ids: string[]) {
  const meus = new Set((await listarProdutos(e)).map((p) => p.id));
  if (ids.some((id) => !meus.has(id))) throw new ErroPermissao("Produto não encontrado.");
  for (const [i, id] of ids.entries()) ok(await db().from("produtos").update({ ordem: i }).eq("id", id), "ordem do produto");
}

/** Exclui um produto vazio. Com trilhas (mesmo arquivadas), recusa: as trilhas sairiam junto. */
export async function excluirProduto(e: EscopoCriador, produtoId: string) {
  await exigirProdutoDoCriador(e, produtoId);
  const r = await db().from("trilhas").select("id", { count: "exact", head: true }).eq("produto_id", produtoId);
  if (r.error) throw new Error(`[db] trilhas do produto: ${r.error.message}`);
  if (r.count) throw new ErroAcesso("Só dá para excluir um produto sem trilhas.");
  ok(await db().from("produtos").delete().eq("id", produtoId), "excluir produto");
  await registrarAuditoria({ ator: e.usuario.id, acao: "produto.excluido", entidade: "produtos", entidadeId: produtoId });
}

export interface ResumoProduto extends Produto {
  totalTrilhas: number;
  trilhasPublicadas: number;
}

/** Produtos do criador na ordem da página, com quantas trilhas (não arquivadas) e publicadas cada um tem. */
export async function resumoProdutos(e: EscopoCriador): Promise<ResumoProduto[]> {
  const [produtos, trilhas] = await Promise.all([
    listarProdutos(e),
    db().from("trilhas").select("produto_id, status").eq("criador_id", e.usuario.id).neq("status", "arquivada"),
  ]);
  const lista = ok(trilhas, "trilhas dos produtos");
  return produtos.map((p) => {
    const doProduto = lista.filter((t) => t.produto_id === p.id);
    return { ...p, totalTrilhas: doProduto.length, trilhasPublicadas: doProduto.filter((t) => t.status === "publicada").length };
  });
}
