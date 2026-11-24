import { assinaturaModulo, type Ementa, visaoDaEmenta } from "@edu/core";
import { aulasDaTrilha, limparBanco, novoCriador, novoFa, TRILHA_EXEMPLO, trilhaPronta } from "@edu/testing";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/client";
import { publicarProduto } from "../src/criador";
import { ErroPermissao } from "../src/erros";
import {
  aplicarVisaoNaEmenta,
  aprovarEtapa,
  arquivarTrilha,
  atualizarTrilha,
  criarTrilha,
  desfazer,
  despublicarTrilha,
  duplicarTrilha,
  finalizarExecucao,
  getEntradaAgente,
  getEstudio,
  getRascunho,
  historicoChat,
  listarNotificacoes,
  listarVersoes,
  marcarErroMaterial,
  marcarNotificacoesLidas,
  marcarRevisao,
  marcarStatusEtapa,
  notificarCriadorDaTrilha,
  publicarTrilha,
  registrarExecucao,
  registrarMaterial,
  registrarMensagem,
  removerMaterial,
  reordenarTrilhas,
  salvarPaginasMaterial,
  salvarVersao,
  snapshotVazio,
  tentarTravarEtapa,
} from "../src/estudio";
import { FonteMateriaisDb } from "../src/fonte";

beforeAll(limparBanco);

const novaTrilha = async (titulo = "Trilha nova") => {
  const c = await novoCriador();
  const t = await criarTrilha({ produtoId: c.escopo.produto.id, criadorId: c.usuario.id, titulo, cor: "azul", icone: "book-open" });
  return { c, t };
};

describe("criar e editar trilha", () => {
  it("cria no fim da lista do produto, com as quatro etapas pendentes", async () => {
    const { c, t } = await novaTrilha("Primeira");
    const t2 = await criarTrilha({ produtoId: c.escopo.produto.id, criadorId: c.usuario.id, titulo: "Segunda", cor: "verde", icone: "zap" });
    expect([t.ordem, t2.ordem]).toEqual([1, 2]);
    const estudio = (await getEstudio(t.id))!;
    expect(estudio.produto).toEqual({ id: c.escopo.produto.id, nome: c.escopo.produto.nome });
    expect(Object.values(estudio.etapas).map((e) => e.status)).toEqual(["pendente", "pendente", "pendente", "pendente"]);
    expect(estudio.rascunhos.ementa).toEqual(snapshotVazio("ementa"));
    expect(await getEstudio("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("não cria trilha no produto de outro criador", async () => {
    const a = await novoCriador();
    const b = await novoCriador();
    await expect(criarTrilha({ produtoId: a.escopo.produto.id, criadorId: b.usuario.id, titulo: "Invasão", cor: "azul", icone: "zap" })).rejects.toThrow(
      ErroPermissao,
    );
  });

  it("atualiza dados e orientação e entrega o contexto ao agente", async () => {
    const { c, t } = await novaTrilha();
    await atualizarTrilha(t.id, {
      titulo: "Revolução Francesa",
      orientacao_objetivo: "Entender as causas.",
      orientacao_conteudos: "Cap. 2",
      orientacao_complementos: null,
    });
    const entrada = await getEntradaAgente(t.id);
    expect(entrada.contexto).toEqual({
      produto: c.escopo.produto.nome,
      titulo: "Revolução Francesa",
      descricao: null,
      objetivo: "Entender as causas.",
      conteudos: "Cap. 2",
      complementos: null,
    });
    expect(entrada.ementa.modulos).toEqual([]);
  });

  it("reordena as trilhas do produto e recusa trilha de outro produto", async () => {
    const { c, t } = await novaTrilha("A");
    const t2 = await criarTrilha({ produtoId: c.escopo.produto.id, criadorId: c.usuario.id, titulo: "B", cor: "azul", icone: "zap" });
    await reordenarTrilhas(c.escopo.produto.id, [t2.id, t.id]);
    const { data } = await db().from("trilhas").select("id, ordem").eq("produto_id", c.escopo.produto.id).order("ordem");
    expect(data?.map((x) => x.id)).toEqual([t2.id, t.id]);
    const outra = await novaTrilha();
    await expect(reordenarTrilhas(c.escopo.produto.id, [outra.t.id])).rejects.toThrow(ErroPermissao);
  });
});

describe("versões das etapas", () => {
  it("salva versões, marca as seguintes como desatualizadas e desfaz", async () => {
    const { t } = await novaTrilha();
    const ementa = TRILHA_EXEMPLO.ementa;
    expect(await salvarVersao({ trilhaId: t.id, etapa: "ementa", snapshot: ementa, autor: "agente", resumo: "v1" })).toBe(1);
    await salvarVersao({ trilhaId: t.id, etapa: "cards", snapshot: TRILHA_EXEMPLO.cards, autor: "agente", resumo: "cards" });
    const editada: Ementa = { ...ementa, objetivo_geral: `${ementa.objetivo_geral} Editado.` };
    expect(await salvarVersao({ trilhaId: t.id, etapa: "ementa", snapshot: editada, autor: "criador", resumo: "v2", qualidade: { nota: 4 } })).toBe(2);

    const estudio = (await getEstudio(t.id))!;
    expect(estudio.etapas.ementa).toMatchObject({ versao_atual: 2, status: "em_revisao", qualidade: { nota: 4 } });
    expect(estudio.etapas.cards.status).toBe("desatualizada");
    expect(estudio.etapas.aulas.status).toBe("pendente");
    expect((await listarVersoes(t.id, "ementa")).map((v) => [v.versao, v.autor])).toEqual([
      [2, "criador"],
      [1, "agente"],
    ]);

    expect(await desfazer(t.id, "ementa")).toBe(3);
    expect(((await getRascunho(t.id, "ementa")) as Ementa).objetivo_geral).toBe(ementa.objetivo_geral);
    expect(await desfazer(t.id, "visao")).toBeNull();
  });

  it("aprovar exige rascunho e, na ementa, todos os módulos revisados", async () => {
    const { t } = await novaTrilha();
    await expect(aprovarEtapa(t.id, "visao")).rejects.toThrow("Não há rascunho");
    const ementa = TRILHA_EXEMPLO.ementa;
    await salvarVersao({ trilhaId: t.id, etapa: "ementa", snapshot: ementa, autor: "agente", resumo: "v1" });
    await expect(aprovarEtapa(t.id, "ementa")).rejects.toThrow("Revise todos os módulos");
    for (const m of ementa.modulos) await marcarRevisao(t.id, "ementa", m.id, assinaturaModulo(m));
    await marcarRevisao(t.id, "ementa", ementa.modulos[0].id, null);
    await expect(aprovarEtapa(t.id, "ementa")).rejects.toThrow(ementa.modulos[0].id);
    await marcarRevisao(t.id, "ementa", ementa.modulos[0].id, assinaturaModulo(ementa.modulos[0]));
    await aprovarEtapa(t.id, "ementa");
    expect((await getEstudio(t.id))!.etapas.ementa).toMatchObject({ status: "aprovada", versao_aprovada: 1 });
  });

  it("cards exigem revisão por módulo antes de aprovar", async () => {
    const { t } = await novaTrilha();
    await salvarVersao({ trilhaId: t.id, etapa: "ementa", snapshot: TRILHA_EXEMPLO.ementa, autor: "agente", resumo: "v1" });
    await salvarVersao({ trilhaId: t.id, etapa: "cards", snapshot: TRILHA_EXEMPLO.cards, autor: "agente", resumo: "v1" });
    await expect(aprovarEtapa(t.id, "cards")).rejects.toThrow("Revise os cards");
  });

  it("aprovar a visão preenche a descrição vazia e pode ser aplicada na ementa", async () => {
    const { t } = await novaTrilha();
    const visao = visaoDaEmenta(TRILHA_EXEMPLO.ementa);
    await expect(aplicarVisaoNaEmenta(t.id)).rejects.toThrow("Aprove a visão geral");
    await salvarVersao({ trilhaId: t.id, etapa: "visao", snapshot: visao, autor: "agente", resumo: "visão" });
    await aprovarEtapa(t.id, "visao");
    expect((await getEstudio(t.id))!.trilha.descricao).toBe(visao.objetivo_geral.trim().slice(0, 500));
    await expect(aplicarVisaoNaEmenta(t.id)).rejects.toThrow("Ainda não há ementa");
    await salvarVersao({
      trilhaId: t.id,
      etapa: "ementa",
      snapshot: { ...TRILHA_EXEMPLO.ementa, objetivo_geral: "Antigo." },
      autor: "agente",
      resumo: "ementa",
    });
    await aplicarVisaoNaEmenta(t.id);
    expect(((await getRascunho(t.id, "ementa")) as Ementa).objetivo_geral).toBe(visao.objetivo_geral);
  });

  it("trava a etapa durante a geração (uma execução por vez)", async () => {
    const { t } = await novaTrilha();
    expect(await tentarTravarEtapa(t.id, "visao")).toBe(true);
    expect(await tentarTravarEtapa(t.id, "visao")).toBe(false);
    await marcarStatusEtapa(t.id, "visao", "pendente");
    expect(await tentarTravarEtapa(t.id, "visao")).toBe(true);
    // Lock vencido (mais de 10 min) libera de novo.
    await db()
      .from("trilha_etapas")
      .update({ gerando_desde: new Date(Date.now() - 11 * 60_000).toISOString() })
      .eq("trilha_id", t.id)
      .eq("etapa", "visao");
    expect(await tentarTravarEtapa(t.id, "visao")).toBe(true);
  });

  it("guarda o chat e as execuções do agente", async () => {
    const { t } = await novaTrilha();
    await registrarMensagem({ trilhaId: t.id, etapa: "ementa", role: "user", texto: "Gere a ementa." });
    await registrarMensagem({ trilhaId: t.id, etapa: "ementa", role: "assistant", texto: "Pronto.", eventos: [{ tipo: "x" }], versao: 1 });
    expect(await historicoChat(t.id, "ementa")).toEqual([
      { role: "user", texto: "Gere a ementa." },
      { role: "assistant", texto: "Pronto." },
    ]);
    const id = await registrarExecucao({ trilhaId: t.id, etapa: "ementa", tipo: "geracao" });
    await finalizarExecucao(id, {
      ok: true,
      modelo: "claude-haiku-5-5",
      uso: { iteracoes: 2, input_tokens: 10, output_tokens: 5, cache_read_tokens: 0, cache_write_tokens: 0 },
      custo: 0.01,
      duracaoMs: 1200,
    });
    const { data } = await db().from("agente_execucoes").select("*").eq("id", id).single();
    expect(data).toMatchObject({ status: "ok", modelo: "claude-haiku-5-5", iteracoes: 2, duracao_ms: 1200 });
    expect(data?.finalizada_em).not.toBeNull();
  });
});

describe("publicação", () => {
  it("publicar exige todas as etapas aprovadas", async () => {
    const { t } = await novaTrilha();
    await expect(publicarTrilha(t.id)).rejects.toThrow("Aprove todas as etapas");
    await expect(publicarTrilha("00000000-0000-0000-0000-000000000000")).rejects.toThrow("Trilha não encontrada");
  });

  it("materializa cards e aulas e avisa os fãs do produto só na primeira publicação", async () => {
    const c = await novoCriador();
    const primeira = await trilhaPronta(c.escopo, { titulo: "Primeira" });
    await publicarProduto(c.escopo, true);
    const { usuario: fa } = await novoFa(c.escopo.produto.id);

    const nova = await trilhaPronta(c.escopo, { titulo: "Segunda" });
    const { data: cards } = await db().from("skill_cards").select("codigo").eq("trilha_id", nova.id);
    expect(cards).toHaveLength(TRILHA_EXEMPLO.cards.cards.length);
    expect(await aulasDaTrilha(nova.id)).toHaveLength(TRILHA_EXEMPLO.aulas.aulas.length);
    const { data: trilha } = await db().from("trilhas").select("status, ementa, publicada_em").eq("id", nova.id).single();
    expect(trilha?.status).toBe("publicada");
    expect(trilha?.ementa).not.toBeNull();

    let n = await listarNotificacoes(fa.id);
    expect(n.naoLidas).toBe(1);
    expect(n.lista[0]).toMatchObject({ tipo: "trilha_nova", corpo: "Segunda", link: `/trilhas/${nova.id}` });

    // Republicar não avisa de novo; despublicar e publicar de novo, sim.
    await publicarTrilha(nova.id);
    expect((await listarNotificacoes(fa.id)).naoLidas).toBe(1);
    await despublicarTrilha(nova.id);
    await publicarTrilha(nova.id);
    n = await listarNotificacoes(fa.id);
    expect(n.naoLidas).toBe(2);
    await marcarNotificacoesLidas(fa.id);
    expect((await listarNotificacoes(fa.id)).naoLidas).toBe(0);
    expect(primeira.id).not.toBe(nova.id);
  });

  it("republicar mantém o id das aulas e arquiva as que saíram", async () => {
    const c = await novoCriador();
    const t = await trilhaPronta(c.escopo);
    const antes = await aulasDaTrilha(t.id);
    const menos = { aulas: TRILHA_EXEMPLO.aulas.aulas.slice(0, -1) };
    await salvarVersao({ trilhaId: t.id, etapa: "aulas", snapshot: menos, autor: "criador", resumo: "tirou a última" });
    await aprovarEtapa(t.id, "aulas");
    await publicarTrilha(t.id);
    const depois = await aulasDaTrilha(t.id);
    expect(depois.map((a) => a.id)).toEqual(antes.slice(0, -1).map((a) => a.id));
    const { data: arquivada } = await db().from("aulas").select("arquivada_em").eq("id", antes.at(-1)!.id).single();
    expect(arquivada?.arquivada_em).not.toBeNull();
  });

  it("arquiva e duplica no mesmo produto, com orientação e rascunhos", async () => {
    const c = await novoCriador();
    const t = await trilhaPronta(c.escopo, { publicar: false });
    await atualizarTrilha(t.id, { orientacao_objetivo: "Objetivo copiado." });
    const copia = await duplicarTrilha(t.id);
    expect(copia).toMatchObject({ produto_id: c.escopo.produto.id, titulo: "Eletricidade básica (cópia)", status: "rascunho" });
    const e = (await getEstudio(copia.id))!;
    expect(e.trilha.orientacao_objetivo).toBe("Objetivo copiado.");
    expect(e.etapas.aulas.versao_atual).toBe(1);
    expect((e.rascunhos.ementa as Ementa).modulos.length).toBe(TRILHA_EXEMPLO.ementa.modulos.length);
    await arquivarTrilha(t.id);
    const { data } = await db().from("trilhas").select("status").eq("id", t.id).single();
    expect(data?.status).toBe("arquivada");
  });

  it("avisa o criador da trilha", async () => {
    const { c, t } = await novaTrilha();
    await notificarCriadorDaTrilha({ trilhaId: t.id, tipo: "agente_pronto", titulo: "Aulas prontas", link: `/trilhas/${t.id}` });
    expect((await listarNotificacoes(c.usuario.id)).lista[0]).toMatchObject({ tipo: "agente_pronto", titulo: "Aulas prontas" });
  });
});

describe("materiais", () => {
  it("registra páginas, busca no texto e remove", async () => {
    const { t } = await novaTrilha();
    const m = await registrarMaterial({ trilhaId: t.id, storagePath: `${t.id}/apostila.pdf`, nome: "apostila.pdf", mime: "application/pdf", tamanho: 1000 });
    expect(m.status).toBe("processando");
    await salvarPaginasMaterial(m.id, t.id, [
      "A Lei de Ohm relaciona tensão, corrente e resistência.",
      "",
      "O disjuntor protege o circuito contra sobrecarga.",
    ]);
    const fonte = new FonteMateriaisDb(t.id);
    expect(await fonte.listar()).toEqual([{ id: m.id, nome: "apostila.pdf", mime: "application/pdf", paginas: 3 }]);
    expect((await fonte.todasPaginas()).map((p) => p.pagina)).toEqual([1, 2, 3]);
    expect((await fonte.lerPaginas(m.id, 3, 3))[0].texto).toContain("disjuntor");
    const achados = await fonte.buscar("disjuntor sobrecarga", 5);
    expect(achados[0]).toMatchObject({ material_id: m.id, pagina: 3 });
    // Sem todos os termos, relaxa para qualquer termo.
    expect((await fonte.buscar("disjuntor inexistentexyz", 5)).length).toBeGreaterThan(0);

    await marcarErroMaterial(m.id, "PDF corrompido");
    expect((await getEstudio(t.id))!.materiais[0]).toMatchObject({ status: "erro", erro: "PDF corrompido" });
    await removerMaterial(t.id, m.id);
    expect((await getEstudio(t.id))!.materiais).toEqual([]);
  });
});
