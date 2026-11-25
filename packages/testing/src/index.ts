import { randomUUID } from "node:crypto";
import { reindexarTrilha } from "@edu/ai/tutor";
import {
  type AulasDraft,
  assinaturaCards,
  assinaturaModulo,
  type Bloco,
  blocoParaAluno,
  type CardsDraft,
  cardsDoModulo,
  type Ementa,
  type Etapa,
  type RespostaDesafio,
  visaoDaEmenta,
} from "@edu/core";
import {
  ArmazemTutorDb,
  aprovarEtapa,
  blocoDaLinha,
  cadastrarCriador,
  cadastrarFa,
  criarTrilha,
  db,
  type EscopoCriador,
  escopoCriador,
  getUsuario,
  marcarRevisao,
  ok,
  type Produto,
  produtoPadrao,
  publicarPagina,
  publicarProduto,
  publicarTrilha,
  responderDesafio,
  salvarVersao,
  type Usuario,
} from "@edu/db";
import exemplo from "@edu/estudio/estudio-demo.json" with { type: "json" };
import { ehLocal } from "./ambiente";

/**
 * Fábricas e limpeza para os testes de integração do `@edu/db` (Supabase local). Tudo passa pelas
 * funções públicas do pacote, como os apps fazem.
 */

export const SENHA = "Senha123forte";

/** Trilha de exemplo do tour do estúdio (válida em todas as etapas). */
export const TRILHA_EXEMPLO = {
  ementa: exemplo.ementa as Ementa,
  cards: exemplo.cards as CardsDraft,
  aulas: exemplo.aulas as AulasDraft,
};

const sufixo = () => randomUUID().slice(0, 8);
export const emailUnico = (nome = "pessoa") => `${nome}-${sufixo()}@edumais.test`;
export const ipUnico = () => `teste-${sufixo()}`;
export const handleUnico = (base = "criador") => `${base}.${sufixo()}`;

/** Apaga todas as contas (o resto sai em cascata) e as tabelas soltas. Só no banco local. */
export async function limparBanco() {
  if (!ehLocal(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) throw new Error("limparBanco só roda no Supabase local.");
  for (;;) {
    const { data, error } = await db().auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(`[auth] ${error.message}`);
    if (!data.users.length) break;
    for (const u of data.users) {
      const r = await db().auth.admin.deleteUser(u.id);
      if (r.error) throw new Error(`[auth] ${r.error.message}`);
    }
  }
  ok(await db().from("tentativas_login").delete().gte("id", 0), "limpar tentativas");
  ok(await db().from("audit_log").delete().gte("id", 0), "limpar auditoria");
}

export interface CriadorDeTeste {
  usuario: Usuario;
  escopo: EscopoCriador;
  email: string;
  /** O primeiro produto (o cadastro cria um em rascunho). */
  produto: Produto;
}

/** Criador cadastrado pelo fluxo real, com o escopo (perfil) e o primeiro produto prontos. */
export async function novoCriador(p: { nome?: string; handle?: string } = {}): Promise<CriadorDeTeste> {
  const email = emailUnico("criador");
  const { usuario } = await cadastrarCriador({ nome: p.nome ?? "Bia Criadora", email, senha: SENHA, handle: p.handle ?? handleUnico(), ip: ipUnico() });
  const escopo = (await escopoCriador(usuario))!;
  return { usuario, escopo, email, produto: await produtoPadrao(escopo) };
}

/** Recarrega o escopo e o primeiro produto (depois de mudar perfil ou produto). */
export async function recarregar(c: CriadorDeTeste): Promise<CriadorDeTeste> {
  const usuario = (await getUsuario(c.usuario.id))!;
  const escopo = (await escopoCriador(usuario))!;
  const produto = ok(await db().from("produtos").select("*").eq("id", c.produto.id).single(), "produto");
  return { ...c, usuario, escopo, produto };
}

/**
 * Trilha com as quatro etapas aprovadas a partir da trilha de exemplo e, por padrão, publicada —
 * o caminho do estúdio inteiro, sem a IA.
 */
export async function trilhaPronta(e: EscopoCriador, p: { titulo?: string; publicar?: boolean; aulas?: AulasDraft; produtoId?: string } = {}) {
  const trilha = await criarTrilha({
    produtoId: p.produtoId ?? (await produtoPadrao(e)).id,
    criadorId: e.usuario.id,
    titulo: p.titulo ?? "Eletricidade básica",
    cor: "laranja",
    icone: "zap",
  });
  const { ementa, cards } = TRILHA_EXEMPLO;
  const aulas = p.aulas ?? TRILHA_EXEMPLO.aulas;
  const snapshots: [Etapa, unknown][] = [
    ["visao", visaoDaEmenta(ementa)],
    ["ementa", ementa],
    ["cards", cards],
    ["aulas", aulas],
  ];
  for (const [etapa, snapshot] of snapshots)
    await salvarVersao({ trilhaId: trilha.id, etapa, snapshot: snapshot as never, autor: "agente", resumo: "Gerado no teste" });
  for (const m of ementa.modulos) {
    await marcarRevisao(trilha.id, "ementa", m.id, assinaturaModulo(m));
    await marcarRevisao(trilha.id, "cards", m.id, assinaturaCards(cardsDoModulo(ementa, cards, m.id)));
  }
  for (const [etapa] of snapshots) await aprovarEtapa(trilha.id, etapa);
  if (p.publicar !== false) await publicarTrilha(trilha.id);
  return trilha;
}

/** Criador com uma trilha publicada no primeiro produto, o produto publicado e a página no ar. */
export async function criadorNoAr(p: { nome?: string } = {}) {
  const c = await novoCriador(p);
  const trilha = await trilhaPronta(c.escopo, { produtoId: c.produto.id });
  await publicarProduto(c.escopo, c.produto.id, true);
  await publicarPagina(c.escopo, true);
  return { ...(await recarregar(c)), trilha };
}

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** A resposta certa de cada desafio, nos índices do que o fã vê (opções e passos embaralhados). */
export function respostaPara(bloco: Bloco): RespostaDesafio | null {
  const exibido = blocoParaAluno(bloco);
  if (bloco.tipo === "quiz") return { tipo: "quiz", opcao: bloco.opcoes.findIndex((o) => o.correta) };
  if (bloco.tipo === "completar" && exibido.tipo === "completar") {
    const usadas = new Set<number>();
    const escolhas = bloco.lacunas.map((l) => {
      const i = exibido.opcoes.findIndex((o, j) => !usadas.has(j) && igual(o, l.resposta));
      usadas.add(i);
      return i;
    });
    return { tipo: "completar", escolhas };
  }
  if (bloco.tipo === "ordenar" && exibido.tipo === "ordenar") {
    const usados = new Set<number>();
    const ordem = bloco.passos.map((p) => {
      const i = exibido.passos.findIndex((x, j) => !usados.has(j) && igual(x, p));
      usados.add(i);
      return i;
    });
    return { tipo: "ordenar", ordem };
  }
  return null;
}

/** Responde todos os desafios corrigíveis da aula numa tentativa nova e devolve a tentativa. */
export async function responderAula(aluno: Usuario, aulaId: string) {
  const tentativa = randomUUID();
  const linhas = ok(await db().from("aula_blocos").select("*").eq("aula_id", aulaId).order("ordem"), "blocos da aula");
  for (const linha of linhas) {
    const resposta = respostaPara(blocoDaLinha(linha));
    if (resposta) await responderDesafio({ aluno, aulaId, blocoId: linha.id, resposta, tentativa });
  }
  return tentativa;
}

/** Aulas vigentes da trilha, na ordem do caminho. */
export async function aulasDaTrilha(trilhaId: string) {
  return ok(await db().from("aulas").select("id, codigo, titulo").eq("trilha_id", trilhaId).is("arquivada_em", null).order("ordem"), "aulas da trilha");
}

/** Fã que assinou um criador com a página no ar (opcionalmente entrando por um produto). */
export async function novoFa(criadorId: string, p: { origem?: string; produtoEntradaId?: string } = {}) {
  const email = emailUnico("fa");
  const usuario = await cadastrarFa({
    criadorId,
    produtoEntradaId: p.produtoEntradaId,
    nome: "Fã de Teste",
    email,
    senha: SENHA,
    origem: p.origem,
    ip: ipUnico(),
  });
  return { usuario, email };
}

/** Indexa a trilha para o Edu só com texto (sem Voyage): a busca por palavras já funciona. */
export function indexarSemVetor(trilhaId: string) {
  return reindexarTrilha(new ArmazemTutorDb(), trilhaId, { semEmbedding: true });
}
