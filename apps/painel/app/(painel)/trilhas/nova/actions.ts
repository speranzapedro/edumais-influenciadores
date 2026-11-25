"use server";

import { erroOrientacao, normalizarOrientacao, objetivoDefinido } from "@edu/core";
import { atualizarTrilha, criarTrilha, produtoPadrao, registrarAuditoria } from "@edu/db";
import { redirect } from "next/navigation";
import { exigirCriador } from "@/lib/sessao";

/** Cria a trilha no produto do criador. */
export async function criar(form: FormData) {
  const e = await exigirCriador();
  const titulo = String(form.get("titulo") ?? "").trim();
  const objetivo = normalizarOrientacao({ objetivo: String(form.get("objetivo") ?? "") }).objetivo;
  const voltar = (erro: string): never => redirect(`/trilhas/nova?${new URLSearchParams({ titulo, objetivo, erro })}`);
  if (titulo.length < 3) voltar("Dê um título à trilha.");
  if (!objetivoDefinido(objetivo)) voltar("Descreva o objetivo da trilha.");
  const erroObjetivo = erroOrientacao({ objetivo, conteudos: "", complementos: "" });
  if (erroObjetivo) voltar(erroObjetivo);

  // Até a tela de Produtos (fase 3), a trilha nova entra no primeiro produto.
  const produto = await produtoPadrao(e);
  const trilha = await criarTrilha({
    produtoId: produto.id,
    criadorId: e.usuario.id,
    titulo: titulo.slice(0, 120),
    descricao:
      String(form.get("descricao") ?? "")
        .trim()
        .slice(0, 500) || undefined,
    cor: String(form.get("cor") ?? "lilas"),
    icone: String(form.get("icone") ?? "book-open"),
  });
  await atualizarTrilha(trilha.id, { orientacao_objetivo: objetivo });
  await registrarAuditoria({ ator: e.usuario.id, acao: "trilha.criada", entidade: "trilhas", entidadeId: trilha.id, dados: { produtoId: produto.id } });
  redirect(`/trilhas/${trilha.id}/editar`);
}
