import { type BlocoAluno, blocoParaAluno, type CorrecaoDesafio, corrigirDesafio, ehCorrigivel, type RespostaDesafio } from "@edu/core";
import { blocoDaLinha, contextoDaAberta } from "./aluno";
import { db, ok, talvez } from "./client";
import { type EscopoCriador, exigirTrilhaDoCriador } from "./criador";
import { ErroPermissao } from "./erros";

/**
 * Prévia da trilha no painel do criador: o que está no app do fã de fato (as aulas materializadas na
 * publicação, não o rascunho do estúdio). Nada aqui grava respostas ou progresso.
 */

export interface AulaNaPrevia {
  id: string;
  titulo: string;
  objetivo: string | null;
  ordem: number;
  modulo_id: string;
  modulo_titulo: string | null;
  /** Desafios corrigíveis (quiz, completar, ordenar). */
  desafios: number;
  abertas: number;
  textos: number;
}

export interface ModuloNaPrevia {
  id: string;
  titulo: string;
  aulas: AulaNaPrevia[];
}

export async function previaDaTrilha(e: EscopoCriador, trilhaId: string) {
  await exigirTrilhaDoCriador(e, trilhaId);
  const [trilha, aulas] = await Promise.all([
    db().from("trilhas").select("id, titulo, descricao, cor, icone, status, publicada_em, tutor_ativo").eq("id", trilhaId).single(),
    db().from("aulas").select("id, titulo, objetivo, ordem, modulo_id, modulo_titulo").eq("trilha_id", trilhaId).is("arquivada_em", null).order("ordem"),
  ]);
  const lista = ok(aulas, "aulas");
  const blocos = lista.length
    ? ok(
        await db()
          .from("aula_blocos")
          .select("aula_id, tipo")
          .in(
            "aula_id",
            lista.map((a) => a.id),
          ),
        "blocos",
      )
    : [];
  const conta = (aulaId: string, f: (tipo: string) => boolean) => blocos.filter((b) => b.aula_id === aulaId && f(b.tipo)).length;

  const modulos: ModuloNaPrevia[] = [];
  for (const a of lista) {
    const aula: AulaNaPrevia = {
      ...a,
      desafios: conta(a.id, (t) => t === "quiz" || t === "completar" || t === "ordenar"),
      abertas: conta(a.id, (t) => t === "aberta"),
      textos: conta(a.id, (t) => t === "texto"),
    };
    const ultimo = modulos[modulos.length - 1];
    if (ultimo && ultimo.id === a.modulo_id) ultimo.aulas.push(aula);
    else modulos.push({ id: a.modulo_id, titulo: a.modulo_titulo ?? "Módulo", aulas: [aula] });
  }
  return { trilha: ok(trilha, "trilha"), modulos, totalAulas: lista.length };
}

/** Aula da trilha (publicada e não arquivada) do criador; senão, ErroPermissao. */
async function exigirAulaDaTrilha(e: EscopoCriador, trilhaId: string, aulaId: string) {
  await exigirTrilhaDoCriador(e, trilhaId);
  const aula = /^[0-9a-f-]{36}$/i.test(aulaId)
    ? talvez(await db().from("aulas").select("id, trilha_id, arquivada_em").eq("id", aulaId).maybeSingle(), "aula")
    : null;
  if (!aula || aula.trilha_id !== trilhaId || aula.arquivada_em) throw new ErroPermissao("Aula não encontrada.");
}

/** Aula pronta para o player da prévia (sem gabarito, como no app) e a próxima do caminho. */
export async function aulaNaPrevia(e: EscopoCriador, trilhaId: string, aulaId: string) {
  await exigirAulaDaTrilha(e, trilhaId, aulaId);
  const [aula, blocos, irmas] = await Promise.all([
    db().from("aulas").select("id, titulo, objetivo, trilha:trilhas(id, titulo, cor, icone)").eq("id", aulaId).single(),
    db().from("aula_blocos").select("*").eq("aula_id", aulaId).order("ordem"),
    db().from("aulas").select("id, titulo").eq("trilha_id", trilhaId).is("arquivada_em", null).order("ordem"),
  ]);
  const a = ok(aula, "aula") as unknown as {
    id: string;
    titulo: string;
    objetivo: string | null;
    trilha: { id: string; titulo: string; cor: string; icone: string };
  };
  const lista: BlocoAluno[] = ok(blocos, "blocos").map((b) => blocoParaAluno(blocoDaLinha(b)));
  const ordem = ok(irmas, "irmas");
  const i = ordem.findIndex((x) => x.id === aulaId);
  return { aula: a, blocos: lista, posicao: i + 1, totalAulas: ordem.length, proxima: ordem[i + 1] ?? null };
}

/** Corrige uma resposta da prévia com as regras do app, sem registrar. */
export async function corrigirNaPrevia(
  e: EscopoCriador,
  p: { trilhaId: string; aulaId: string; blocoId: string; resposta: RespostaDesafio },
): Promise<CorrecaoDesafio> {
  await exigirAulaDaTrilha(e, p.trilhaId, p.aulaId);
  const linha = /^[0-9a-f-]{36}$/i.test(p.blocoId)
    ? talvez(await db().from("aula_blocos").select("*").eq("id", p.blocoId).eq("aula_id", p.aulaId).maybeSingle(), "bloco")
    : null;
  const bloco = linha ? blocoDaLinha(linha) : null;
  if (!bloco || !ehCorrigivel(bloco) || bloco.tipo !== p.resposta.tipo) throw new ErroPermissao("Questão não encontrada.");
  return corrigirDesafio(bloco, p.resposta);
}

/** Contexto do feedback da pergunta aberta na prévia (o mesmo que o fã recebe). */
export async function contextoAbertaNaPrevia(e: EscopoCriador, p: { trilhaId: string; aulaId: string; blocoId: string }) {
  await exigirAulaDaTrilha(e, p.trilhaId, p.aulaId);
  const linhas = ok(await db().from("aula_blocos").select("*").eq("aula_id", p.aulaId).order("ordem"), "blocos");
  const linha = linhas.find((b) => b.id === p.blocoId);
  if (linha?.tipo !== "aberta") throw new ErroPermissao("Pergunta não encontrada.");
  return (await contextoDaAberta({ aulaId: p.aulaId, blocoId: p.blocoId, trilhaId: p.trilhaId, linhas })).contexto;
}
