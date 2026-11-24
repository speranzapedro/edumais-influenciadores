"use server";

import { sincronizarIndice, tutorHabilitado } from "@edu/ai/tutor";
import {
  assinaturaCards,
  assinaturaModulo,
  type CardsDraft,
  cardsDoModulo,
  type Ementa,
  type Etapa,
  erroOrientacao,
  normalizarOrientacao,
  type Orientacao,
  objetivoDefinido,
} from "@edu/core";
import {
  ArmazemTutorDb,
  aplicarVisaoNaEmenta,
  aprovarEtapa,
  arquivarTrilha,
  atualizarTrilha,
  definirEduAtivo,
  desfazer,
  despublicarTrilha,
  duplicarTrilha,
  exigirTrilhaDoCriador,
  getRascunho,
  marcarRevisao,
  publicarTrilha,
  registrarAuditoria,
  removerMaterial,
  type Snapshot,
  salvarVersao,
} from "@edu/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirCriador } from "@/lib/sessao";
import { atualizarTutorDepois } from "@/lib/tutor";

const caminho = (id: string) => `/trilhas/${id}`;

/** Criador logado e dono da trilha (do produto dele). */
async function comTrilha(trilhaId: string) {
  const e = await exigirCriador();
  await exigirTrilhaDoCriador(e, trilhaId);
  return e;
}

export async function aprovar(trilhaId: string, etapa: Etapa) {
  await comTrilha(trilhaId);
  await aprovarEtapa(trilhaId, etapa);
  revalidatePath(caminho(trilhaId), "layout");
}

/** Check "Revisado" de um módulo na Ementa ou nos Cards (assinatura da versão salva). */
export async function revisarModulo(
  trilhaId: string,
  etapa: "ementa" | "cards",
  moduloId: string,
  revisado: boolean,
): Promise<{ erro: string } | { ok: true }> {
  await comTrilha(trilhaId);
  const ementa = (await getRascunho(trilhaId, "ementa")) as Ementa;
  const modulo = ementa.modulos.find((m) => m.id === moduloId);
  if (!modulo) return { erro: "Módulo não encontrado. Recarregue a página." };
  const assinatura =
    etapa === "ementa" ? assinaturaModulo(modulo) : assinaturaCards(cardsDoModulo(ementa, (await getRascunho(trilhaId, "cards")) as CardsDraft, moduloId));
  await marcarRevisao(trilhaId, etapa, moduloId, revisado ? assinatura : null);
  revalidatePath(caminho(trilhaId), "layout");
  return { ok: true };
}

/** Copia a visão geral aprovada para a ementa atual, sem gerar os módulos de novo. */
export async function aplicarVisao(trilhaId: string): Promise<{ erro: string } | { ok: true }> {
  await comTrilha(trilhaId);
  try {
    await aplicarVisaoNaEmenta(trilhaId);
  } catch (err) {
    return { erro: err instanceof Error ? err.message : "Não foi possível aplicar a visão." };
  }
  revalidatePath(caminho(trilhaId), "layout");
  return { ok: true };
}

/** Recorte e complementos do material para o agente (passo Materiais). */
export async function salvarOrientacao(trilhaId: string, orientacao: Pick<Orientacao, "conteudos" | "complementos">): Promise<{ erro: string } | { ok: true }> {
  await comTrilha(trilhaId);
  const o = normalizarOrientacao({ objetivo: "", ...orientacao });
  const erro = erroOrientacao(o);
  if (erro) return { erro };
  await atualizarTrilha(trilhaId, { orientacao_conteudos: o.conteudos || null, orientacao_complementos: o.complementos || null });
  revalidatePath(caminho(trilhaId), "layout");
  return { ok: true };
}

/** Título, objetivo, descrição, cor e ícone. */
export async function editarDados(
  trilhaId: string,
  d: { titulo: string; objetivo: string; descricao: string; cor: string; icone: string },
): Promise<{ erro: string } | { ok: true }> {
  await comTrilha(trilhaId);
  const titulo = d.titulo.trim().slice(0, 120);
  if (!titulo) return { erro: "Informe o título da trilha." };
  const objetivo = normalizarOrientacao({ objetivo: d.objetivo }).objetivo;
  if (!objetivoDefinido(objetivo)) return { erro: "Descreva o objetivo da trilha." };
  const erroObjetivo = erroOrientacao({ objetivo, conteudos: "", complementos: "" });
  if (erroObjetivo) return { erro: erroObjetivo };
  if (![d.cor, d.icone].every((v) => /^[a-z-]{2,20}$/.test(v))) return { erro: "Cor ou ícone inválido." };
  await atualizarTrilha(trilhaId, { titulo, orientacao_objetivo: objetivo, descricao: d.descricao.trim().slice(0, 500) || null, cor: d.cor, icone: d.icone });
  atualizarTutorDepois(trilhaId);
  revalidatePath(caminho(trilhaId), "layout");
  revalidatePath("/trilhas");
  return { ok: true };
}

export async function desfazerEtapa(trilhaId: string, etapa: Etapa) {
  await comTrilha(trilhaId);
  await desfazer(trilhaId, etapa);
  revalidatePath(caminho(trilhaId), "layout");
}

export async function salvarEdicao(trilhaId: string, etapa: Etapa, snapshot: Snapshot, resumo: string) {
  await comTrilha(trilhaId);
  await salvarVersao({ trilhaId, etapa, snapshot, autor: "criador", resumo: resumo.slice(0, 300) });
  revalidatePath(caminho(trilhaId), "layout");
}

export async function excluirMaterial(trilhaId: string, materialId: string) {
  await comTrilha(trilhaId);
  await removerMaterial(trilhaId, materialId);
  atualizarTutorDepois(trilhaId);
  revalidatePath(caminho(trilhaId), "layout");
}

/** Publica para os assinantes do produto (na primeira vez, eles recebem uma notificação). */
export async function publicar(trilhaId: string) {
  const e = await comTrilha(trilhaId);
  await publicarTrilha(trilhaId);
  await registrarAuditoria({ ator: e.usuario.id, acao: "trilha.publicada", entidade: "trilhas", entidadeId: trilhaId });
  atualizarTutorDepois(trilhaId);
  revalidatePath(caminho(trilhaId), "layout");
  revalidatePath("/trilhas");
}

export async function despublicar(trilhaId: string) {
  const e = await comTrilha(trilhaId);
  await despublicarTrilha(trilhaId);
  await registrarAuditoria({ ator: e.usuario.id, acao: "trilha.despublicada", entidade: "trilhas", entidadeId: trilhaId });
  revalidatePath(caminho(trilhaId), "layout");
  revalidatePath("/trilhas");
}

export async function arquivar(trilhaId: string) {
  const e = await comTrilha(trilhaId);
  await arquivarTrilha(trilhaId);
  await registrarAuditoria({ ator: e.usuario.id, acao: "trilha.arquivada", entidade: "trilhas", entidadeId: trilhaId });
  revalidatePath("/trilhas");
  redirect("/trilhas");
}

/** Cópia em rascunho no mesmo produto. */
export async function duplicar(trilhaId: string) {
  await comTrilha(trilhaId);
  const nova = await duplicarTrilha(trilhaId);
  redirect(`${caminho(nova.id)}/editar`);
}

/** Liga/desliga o Edu nesta trilha (sem a flag TUTOR_HABILITADO, o Edu fica desligado em todas). */
export async function alternarEdu(trilhaId: string, ativo: boolean) {
  const e = await comTrilha(trilhaId);
  await definirEduAtivo(trilhaId, ativo);
  await registrarAuditoria({ ator: e.usuario.id, acao: ativo ? "trilha.edu_ligado" : "trilha.edu_desligado", entidade: "trilhas", entidadeId: trilhaId });
  revalidatePath(caminho(trilhaId), "layout");
}

/** Reindexa o Edu na hora. Sem a flag TUTOR_HABILITADO, não gera embeddings. */
export async function reindexarTutor(trilhaId: string): Promise<"indexada" | "na_fila" | "ignorada"> {
  await comTrilha(trilhaId);
  if (!tutorHabilitado()) return "ignorada";
  const r = await sincronizarIndice(new ArmazemTutorDb(), trilhaId);
  revalidatePath(caminho(trilhaId), "layout");
  return r.status;
}
