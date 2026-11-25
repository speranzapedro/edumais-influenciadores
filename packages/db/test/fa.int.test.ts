import { randomUUID } from "node:crypto";
import {
  aulasDaTrilha,
  criadorNoAr,
  emailUnico,
  indexarSemVetor,
  ipUnico,
  limparBanco,
  novoCriador,
  novoFa,
  responderAula,
  SENHA,
  trilhaPronta,
} from "@edu/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { criarConta } from "../src/acesso";
import {
  aulaParaJogar,
  blocoDaLinha,
  caminhoDaTrilha,
  concluirAula,
  ErroAula,
  errosDoAluno,
  painelDoAluno,
  prepararPerguntaAberta,
  registrarRespostaAberta,
  responderDesafio,
  trilhaLiberada,
  trilhasDoAluno,
} from "../src/aluno";
import { db } from "../src/client";
import { assinar, cadastrarFa, criadorDaTrilha, criadoresDoFa, faTemAcesso, publicarPagina, trilhasDasAssinaturas } from "../src/criador";
import { abrirEdu, avaliarRespostaEdu, ErroEdu, eduDisponivel, marcarAvisoEdu, prepararPerguntaEdu, registrarTrocaEdu } from "../src/edu";
import { ErroAcesso } from "../src/erros";
import { listarNotificacoes } from "../src/estudio";
import { aulaNaPrevia, contextoAbertaNaPrevia, corrigirNaPrevia, previaDaTrilha } from "../src/previa";
import { criarProduto, publicarProduto } from "../src/produtos";
import { ConsultorTutorDb, definirEduAtivo, estadoIndiceTutor, historicoTutor } from "../src/tutor";

beforeAll(limparBanco);

describe("entrada do fã", () => {
  it("cria a conta de fã com assinatura de cortesia no criador, a origem limpa e o produto de entrada", async () => {
    const c = await criadorNoAr();
    const { usuario } = await novoFa(c.usuario.id, { origem: "Instagram!", produtoEntradaId: c.produto.id });
    expect(usuario.role).toBe("aluno");
    const { data } = await db().from("assinaturas").select("*").eq("aluno_id", usuario.id).single();
    expect(data).toMatchObject({ status: "cortesia", valor_centavos: 0, origem: "instagram", criador_id: c.usuario.id, produto_id: c.produto.id });
  });

  it("produto de entrada que não é do criador ou não está publicado fica de fora (o acesso é ao criador)", async () => {
    const c = await criadorNoAr();
    const outro = await criadorNoAr();
    const rascunho = await criarProduto(c.escopo, { nome: "Em preparo" });
    for (const produtoEntradaId of [outro.produto.id, rascunho.id, "nao-e-uuid"]) {
      const { usuario } = await novoFa(c.usuario.id, { produtoEntradaId });
      const { data } = await db().from("assinaturas").select("criador_id, produto_id").eq("aluno_id", usuario.id).single();
      expect(data).toEqual({ criador_id: c.usuario.id, produto_id: null });
    }
  });

  it("página fechada (ou sem produto publicado) não aceita fãs e não sobra conta", async () => {
    const c = await novoCriador();
    const email = emailUnico();
    await expect(cadastrarFa({ criadorId: c.usuario.id, nome: "Fã Cedo", email, senha: SENHA, ip: ipUnico() })).rejects.toThrow("ainda não está disponível");
    await expect(cadastrarFa({ criadorId: "nao-e-uuid", nome: "Fã Cedo", email, senha: SENHA, ip: ipUnico() })).rejects.toThrow(ErroAcesso);
    // Página aberta, mas o único produto voltou para rascunho.
    const noAr = await criadorNoAr();
    await publicarProduto(noAr.escopo, noAr.produto.id, false);
    await expect(cadastrarFa({ criadorId: noAr.usuario.id, nome: "Fã Cedo", email, senha: SENHA, ip: ipUnico() })).rejects.toThrow("ainda não está disponível");
    const { count } = await db().from("users").select("id", { count: "exact", head: true }).eq("email", email);
    expect(count).toBe(0);
  });

  it("e-mail já usado (fã ou criador) é recusado", async () => {
    const c = await criadorNoAr();
    const { email } = await novoFa(c.usuario.id);
    await expect(cadastrarFa({ criadorId: c.usuario.id, nome: "Fã Repetido", email, senha: SENHA, ip: ipUnico() })).rejects.toThrow("Já existe uma conta");
    await expect(cadastrarFa({ criadorId: c.usuario.id, nome: "Criador Fã", email: c.email, senha: SENHA, ip: ipUnico() })).rejects.toThrow(
      "Já existe uma conta",
    );
  });

  it("limita 20 cadastros de fã por IP por hora", async () => {
    const c = await criadorNoAr();
    const ip = ipUnico();
    await db()
      .from("tentativas_login")
      .insert(Array.from({ length: 20 }, () => ({ chave: `cadastro-fa:${ip}`, sucesso: true })));
    await expect(cadastrarFa({ criadorId: c.usuario.id, nome: "Fã Vinte e Um", email: emailUnico(), senha: SENHA, ip })).rejects.toThrow("Muitas tentativas");
  });

  it("conta de criador não assina", async () => {
    const c = await criadorNoAr();
    await expect(assinar({ aluno: c.usuario, criadorId: c.usuario.id })).rejects.toThrow("conta de fã");
  });
});

describe("acesso pelas assinaturas", () => {
  it("o fã vê só as trilhas publicadas dos criadores que assina", async () => {
    const a = await criadorNoAr({ nome: "Ana Física" });
    const rascunho = await trilhaPronta(a.escopo, { titulo: "Em preparo", publicar: false });
    const b = await criadorNoAr({ nome: "Beto Química" });
    const { usuario: fa } = await novoFa(a.usuario.id);

    expect(await trilhaLiberada(fa, a.trilha.id)).toBe(true);
    expect(await trilhaLiberada(fa, rascunho.id)).toBe(false);
    expect(await trilhaLiberada(fa, b.trilha.id)).toBe(false);

    // Assinar de novo não duplica; assinar outro criador libera as trilhas dele.
    await assinar({ aluno: fa, criadorId: b.usuario.id, origem: "tiktok" });
    await assinar({ aluno: fa, criadorId: b.usuario.id, origem: "tiktok" });
    const { count } = await db().from("assinaturas").select("id", { count: "exact", head: true }).eq("aluno_id", fa.id);
    expect(count).toBe(2);
    expect((await trilhasDasAssinaturas(fa.id)).sort()).toEqual([a.trilha.id, b.trilha.id].sort());
    expect(await trilhasDasAssinaturas(fa.id, { criadorId: b.usuario.id })).toEqual([b.trilha.id]);
    expect(await trilhasDasAssinaturas(fa.id, { produtoId: a.produto.id })).toEqual([a.trilha.id]);

    const criadores = await criadoresDoFa(fa.id);
    expect(criadores.map((c) => c.nome)).toEqual(["Ana Física", "Beto Química"]);
    expect(criadores[0].produtos).toEqual([a.produto.nome]);
    expect(JSON.stringify(criadores)).not.toContain("@edumais.test");
    expect((await criadorDaTrilha(a.trilha.id))?.handle).toBe(a.escopo.perfil.handle);
    expect(await criadorDaTrilha("00000000-0000-0000-0000-000000000000")).toBeNull();

    const trilhas = await trilhasDoAluno(fa);
    expect(trilhas).toHaveLength(2);
    expect(trilhas.find((t) => t.id === a.trilha.id)).toMatchObject({
      criador: { handle: a.escopo.perfil.handle, nome: "Ana Física" },
      totalAulas: 7,
      concluidas: 0,
      percentual: 0,
    });
  });

  it("assinar o criador libera todos os produtos publicados dele, inclusive os que vierem depois", async () => {
    const c = await criadorNoAr();
    const { usuario: fa } = await novoFa(c.usuario.id, { produtoEntradaId: c.produto.id });
    const ingles = await criarProduto(c.escopo, { nome: "Inglês do Zero" });
    const verbos = await trilhaPronta(c.escopo, { produtoId: ingles.id, titulo: "Verbos" });
    // Produto ainda em rascunho: a trilha publicada dele não aparece.
    expect(await trilhaLiberada(fa, verbos.id)).toBe(false);
    await publicarProduto(c.escopo, ingles.id, true);
    expect(await trilhaLiberada(fa, verbos.id)).toBe(true);
    expect((await trilhasDasAssinaturas(fa.id)).sort()).toEqual([c.trilha.id, verbos.id].sort());
    expect((await criadoresDoFa(fa.id))[0].produtos).toEqual([c.produto.nome, "Inglês do Zero"]);
    const { count } = await db().from("assinaturas").select("id", { count: "exact", head: true }).eq("aluno_id", fa.id);
    expect(count).toBe(1);
  });

  it("cancelar corta o acesso; assinar de novo reabre; produto fora do ar esconde as trilhas dele", async () => {
    const c = await criadorNoAr();
    const { usuario: fa } = await novoFa(c.usuario.id, { origem: "instagram" });
    expect(await faTemAcesso(fa.id, c.usuario.id)).toBe(true);
    await db().from("assinaturas").update({ status: "cancelada", cancelada_em: new Date().toISOString() }).eq("aluno_id", fa.id);
    expect(await trilhaLiberada(fa, c.trilha.id)).toBe(false);
    expect(await faTemAcesso(fa.id, c.usuario.id)).toBe(false);
    expect(await criadoresDoFa(fa.id)).toEqual([]);

    const reaberta = await assinar({ aluno: fa, criadorId: c.usuario.id, origem: "youtube" });
    expect(reaberta).toMatchObject({ status: "cortesia", cancelada_em: null, origem: "youtube" });
    expect(await trilhaLiberada(fa, c.trilha.id)).toBe(true);

    await db().from("assinaturas").update({ status: "pendente" }).eq("aluno_id", fa.id);
    expect(await trilhaLiberada(fa, c.trilha.id)).toBe(false);
    expect(await faTemAcesso(fa.id, c.usuario.id)).toBe(false);
    await db().from("assinaturas").update({ status: "inadimplente" }).eq("aluno_id", fa.id);
    expect(await trilhaLiberada(fa, c.trilha.id)).toBe(true);
    expect(await faTemAcesso(fa.id, c.usuario.id)).toBe(true);

    await publicarProduto(c.escopo, c.produto.id, false);
    expect(await trilhaLiberada(fa, c.trilha.id)).toBe(false);
    expect(await trilhasDoAluno(fa)).toEqual([]);
    // Quem já assina continua assinante; a página fechada só barra quem chega agora.
    await publicarProduto(c.escopo, c.produto.id, true);
    await publicarPagina(c.escopo, false);
    expect(await faTemAcesso(fa.id, c.usuario.id)).toBe(true);
    const { usuario: novo } = await novoFa((await criadorNoAr()).usuario.id);
    await expect(assinar({ aluno: novo, criadorId: c.usuario.id })).rejects.toThrow("ainda não está disponível");
  });

  it("referência externa do pagamento é única por provedor", async () => {
    const c = await criadorNoAr();
    const { usuario: f1 } = await novoFa(c.usuario.id);
    const { usuario: f2 } = await novoFa(c.usuario.id);
    expect((await db().from("assinaturas").update({ provedor: "asaas", referencia_externa: "sub_1" }).eq("aluno_id", f1.id)).error).toBeNull();
    const r = await db().from("assinaturas").update({ provedor: "asaas", referencia_externa: "sub_1" }).eq("aluno_id", f2.id);
    expect(r.error?.code).toBe("23505");
  });
});

describe("aulas", () => {
  let c: Awaited<ReturnType<typeof criadorNoAr>>;
  let fa: Awaited<ReturnType<typeof novoFa>>["usuario"];
  beforeEach(async () => {
    c = await criadorNoAr();
    fa = (await novoFa(c.usuario.id)).usuario;
  });

  it("caminho em sequência: só a primeira aula está aberta", async () => {
    const caminho = (await caminhoDaTrilha(c.trilha.id, fa))!;
    expect(caminho.aulas.map((a) => a.estado)).toEqual(["atual", "bloqueada", "bloqueada", "bloqueada", "bloqueada", "bloqueada", "bloqueada"]);
    const [a1, a2] = caminho.aulas;
    const jogar = await aulaParaJogar(a1.id, fa);
    expect(jogar.tipo).toBe("ok");
    if (jogar.tipo === "ok") {
      expect(jogar.dados.modo).toBe("aula");
      expect(jogar.dados.posicao).toBe(1);
      expect(JSON.stringify(jogar.dados.blocos)).not.toContain('"correta"');
    }
    expect(await aulaParaJogar(a2.id, fa)).toEqual({ tipo: "bloqueada", trilhaId: c.trilha.id });
    expect(await aulaParaJogar(randomUUID(), fa)).toEqual({ tipo: "nao_encontrada" });
    const estranho = await criarConta({ role: "aluno", nome: "Sem Assinatura", email: emailUnico(), senha: SENHA });
    expect(await caminhoDaTrilha(c.trilha.id, estranho)).toBeNull();
    expect(await aulaParaJogar(a1.id, estranho)).toEqual({ tipo: "nao_encontrada" });
  });

  it("corrige no servidor, guarda uma resposta por tentativa e conclui com XP", async () => {
    const [a1, a2] = await aulasDaTrilha(c.trilha.id);
    await expect(concluirAula(fa, a1.id, randomUUID())).rejects.toThrow("Responda todas as questões");

    const tentativa = await responderAula(fa, a1.id);
    const r = await concluirAula(fa, a1.id, tentativa);
    expect(r).toMatchObject({ aulaJaConcluida: false, trilhaConcluida: false });
    expect(r.acertos).toBe(r.total);
    expect(r.xpTotal).toBeGreaterThan(0);
    expect(r.novasConquistas.length).toBeGreaterThan(0);
    expect((await listarNotificacoes(fa.id)).lista.some((n) => n.tipo === "conquista")).toBe(true);

    const caminho = (await caminhoDaTrilha(c.trilha.id, fa))!;
    expect(caminho.aulas.slice(0, 2).map((a) => a.estado)).toEqual(["concluida", "atual"]);
    const revisao = await aulaParaJogar(a1.id, fa);
    expect(revisao.tipo === "ok" && revisao.dados.modo).toBe("revisao");

    // Concluir de novo não dá XP de novo.
    const outra = await responderAula(fa, a1.id);
    const de_novo = await concluirAula(fa, a1.id, outra);
    expect(de_novo.aulaJaConcluida).toBe(true);
    expect(de_novo.xpTotal).toBe(r.xpTotal);

    const painel = await painelDoAluno(fa.id);
    expect(painel.stats.aulasConcluidas).toBe(1);
    expect(painel.streak.atual).toBe(1);
    expect(painel.xpPorDia).toHaveLength(30);
    expect((await trilhasDoAluno(fa))[0]).toMatchObject({ concluidas: 1, proximaAula: { id: a2.id } });
  });

  it("reenvio na mesma tentativa devolve a correção registrada; erros vão para a revisão", async () => {
    const [a1] = await aulasDaTrilha(c.trilha.id);
    const { data: linhas } = await db().from("aula_blocos").select("*").eq("aula_id", a1.id).eq("tipo", "quiz").order("ordem").limit(1);
    const bloco = blocoDaLinha(linhas![0]);
    if (bloco.tipo !== "quiz") throw new Error("esperava quiz");
    const errada = bloco.opcoes.findIndex((o) => !o.correta);
    const tentativa = randomUUID();
    const primeira = await responderDesafio({ aluno: fa, aulaId: a1.id, blocoId: bloco.id, resposta: { tipo: "quiz", opcao: errada }, tentativa });
    expect(primeira.correta).toBe(false);
    const certa = bloco.opcoes.findIndex((o) => o.correta);
    const segunda = await responderDesafio({ aluno: fa, aulaId: a1.id, blocoId: bloco.id, resposta: { tipo: "quiz", opcao: certa }, tentativa });
    expect(segunda.correta).toBe(false);
    expect((await errosDoAluno(fa)).map((e) => e.bloco_id)).toEqual([bloco.id]);

    await expect(responderDesafio({ aluno: fa, aulaId: a1.id, blocoId: randomUUID(), resposta: { tipo: "quiz", opcao: 0 }, tentativa })).rejects.toThrow(
      ErroAula,
    );
    await expect(
      responderDesafio({ aluno: fa, aulaId: a1.id, blocoId: bloco.id, resposta: { tipo: "quiz", opcao: 99 }, tentativa: randomUUID() }),
    ).rejects.toThrow(ErroAula);
  });

  it("pergunta aberta: contexto do criador, registro único e limite diário", async () => {
    const aulas = await aulasDaTrilha(c.trilha.id);
    const { data: abertas } = await db()
      .from("aula_blocos")
      .select("id, aula_id, ordem")
      .eq("tipo", "aberta")
      .in(
        "aula_id",
        aulas.map((a) => a.id),
      )
      .order("ordem");
    const alvo = abertas![0];
    // Libera a aula da pergunta aberta concluindo as anteriores.
    for (const a of aulas) {
      if (a.id === alvo.aula_id) break;
      await concluirAula(fa, a.id, await responderAula(fa, a.id));
    }
    const tentativa = randomUUID();
    const preparo = await prepararPerguntaAberta({ aluno: fa, aulaId: alvo.aula_id, blocoId: alvo.id, tentativa });
    if (preparo.tipo !== "pronta") throw new Error("esperava pergunta pronta");
    expect(preparo.contexto.criador.nome).toBe("Bia Criadora");
    expect(preparo.contexto.produto).toBe(c.produto.nome);
    expect(preparo.modo).toBe("aula");

    const registro = {
      aluno: fa,
      aulaId: alvo.aula_id,
      bloco: preparo.bloco,
      tentativa,
      modo: preparo.modo,
      resposta: "Minha resposta de teste.",
      feedback: "Bom começo!",
      analise: { classificacao: "parcial" as const, criterios: [{ indice: 1, atendido: true }] },
      modelo: "claude-haiku-5-5",
      uso: { entrada: 10, saida: 5, cache: 0 },
      custoUsd: 0.001,
      duracaoMs: 900,
    };
    await registrarRespostaAberta(registro);
    await registrarRespostaAberta(registro);
    expect(await prepararPerguntaAberta({ aluno: fa, aulaId: alvo.aula_id, blocoId: alvo.id, tentativa })).toEqual({
      tipo: "registrada",
      resposta: "Minha resposta de teste.",
      feedback: "Bom começo!",
    });

    process.env.LIMITE_ABERTAS_DIA = "1";
    try {
      await expect(prepararPerguntaAberta({ aluno: fa, aulaId: alvo.aula_id, blocoId: alvo.id, tentativa: randomUUID() })).rejects.toThrow(
        "limite de perguntas abertas",
      );
    } finally {
      delete process.env.LIMITE_ABERTAS_DIA;
    }
  });
});

describe("prévia no painel do criador", () => {
  it("mostra a trilha publicada como o fã vê e corrige sem gravar", async () => {
    const c = await criadorNoAr();
    const outro = await novoCriador();
    const previa = await previaDaTrilha(c.escopo, c.trilha.id);
    expect(previa.totalAulas).toBe(7);
    expect(previa.modulos.flatMap((m) => m.aulas)).toHaveLength(7);
    await expect(previaDaTrilha(outro.escopo, c.trilha.id)).rejects.toThrow("Trilha não encontrada");

    const [a1] = await aulasDaTrilha(c.trilha.id);
    const aula = await aulaNaPrevia(c.escopo, c.trilha.id, a1.id);
    expect(aula.posicao).toBe(1);
    expect(aula.proxima).not.toBeNull();
    await expect(aulaNaPrevia(c.escopo, c.trilha.id, randomUUID())).rejects.toThrow("Aula não encontrada");

    const { data: quiz } = await db().from("aula_blocos").select("*").eq("aula_id", a1.id).eq("tipo", "quiz").limit(1).single();
    const bloco = blocoDaLinha(quiz!);
    if (bloco.tipo !== "quiz") throw new Error("esperava quiz");
    const correcao = await corrigirNaPrevia(c.escopo, {
      trilhaId: c.trilha.id,
      aulaId: a1.id,
      blocoId: bloco.id,
      resposta: { tipo: "quiz", opcao: bloco.opcoes.findIndex((o) => o.correta) },
    });
    expect(correcao.correta).toBe(true);
    const { count } = await db().from("respostas_quiz").select("id", { count: "exact", head: true }).eq("aula_id", a1.id);
    expect(count).toBe(0);

    const ids = (await aulasDaTrilha(c.trilha.id)).map((a) => a.id);
    const { data: aberta } = await db().from("aula_blocos").select("id, aula_id").eq("tipo", "aberta").in("aula_id", ids).limit(1).single();
    const ctx = await contextoAbertaNaPrevia(c.escopo, { trilhaId: c.trilha.id, aulaId: aberta!.aula_id, blocoId: aberta!.id });
    expect(ctx.criador.nome).toBe("Bia Criadora");
    await expect(contextoAbertaNaPrevia(c.escopo, { trilhaId: c.trilha.id, aulaId: aberta!.aula_id, blocoId: randomUUID() })).rejects.toThrow(
      "Pergunta não encontrada",
    );
  });
});

describe("Edu (tutor)", () => {
  it("indexa a trilha, busca por palavras e controla disponibilidade, conversa e limite", async () => {
    const c = await criadorNoAr();
    const { usuario: fa } = await novoFa(c.usuario.id);
    const r = await indexarSemVetor(c.trilha.id);
    expect(r.trechos).toBeGreaterThan(0);
    expect((await estadoIndiceTutor(c.trilha.id))?.status).toBe("pronto");

    const achados = await new ConsultorTutorDb().buscar({ trilhaId: c.trilha.id, consulta: "Lei de Ohm corrente", embedding: null, limite: 5, modo: "lexica" });
    expect(achados.length).toBeGreaterThan(0);
    expect(achados[0].pos_lexica).toBe(1);

    process.env.TUTOR_HABILITADO = "true";
    try {
      expect(await eduDisponivel(fa, c.trilha.id)).toBe(true);
      await definirEduAtivo(c.trilha.id, false);
      expect(await eduDisponivel(fa, c.trilha.id)).toBe(false);
      await definirEduAtivo(c.trilha.id, true);

      const estado = (await abrirEdu(fa, c.trilha.id, null))!;
      expect(estado).toMatchObject({ avisoVisto: false, restantes: 30, conversaId: null, trocas: [] });
      await marcarAvisoEdu(fa);

      const prep = await prepararPerguntaEdu({ aluno: fa, trilhaId: c.trilha.id, conversaId: null, aulaId: null, historico: 4 });
      const respostaId = await registrarTrocaEdu({
        aluno: fa,
        trilhaId: c.trilha.id,
        conversaId: prep.conversaId,
        aulaId: null,
        pergunta: "O que é a Lei de Ohm?",
        resposta: "É a relação entre tensão, corrente e resistência.",
        detalhes: {
          consulta: "lei de ohm",
          trechos: [],
          citacoes: [],
          fontes: [],
          relacionado: true,
          confiancaBaixa: false,
          conhecimentoGeral: false,
          recusada: false,
        },
        uso: { modelo: "claude-haiku-5-5", custo_usd: 0.001, ms: {}, tokens: {} },
      });
      await avaliarRespostaEdu({ aluno: fa, mensagemId: respostaId, avaliacao: "nao_ajudou", motivo: "Muito curta" });

      const depois = (await abrirEdu(fa, c.trilha.id, null))!;
      expect(depois.restantes).toBe(29);
      expect(depois.conversaId).toBe(prep.conversaId);
      expect(depois.trocas).toEqual([
        expect.objectContaining({ id: respostaId, pergunta: "O que é a Lei de Ohm?", avaliacao: "nao_ajudou", motivo: "Muito curta", relacionado: true }),
      ]);
      expect(await historicoTutor(prep.conversaId)).toEqual([
        { pergunta: "O que é a Lei de Ohm?", resposta: "É a relação entre tensão, corrente e resistência." },
      ]);

      process.env.LIMITE_EDU_DIA = "1";
      await expect(prepararPerguntaEdu({ aluno: fa, trilhaId: c.trilha.id, conversaId: prep.conversaId, aulaId: null, historico: 4 })).rejects.toThrow(ErroEdu);
    } finally {
      delete process.env.TUTOR_HABILITADO;
      delete process.env.LIMITE_EDU_DIA;
    }
    expect(await eduDisponivel(fa, c.trilha.id)).toBe(false);
  });
});

describe("ainda sem nada", () => {
  it("fã sem assinaturas não tem trilhas nem criadores", async () => {
    const u = await criarConta({ role: "aluno", nome: "Fã Solitário", email: emailUnico(), senha: SENHA });
    expect(await trilhasDoAluno(u)).toEqual([]);
    expect(await criadoresDoFa(u.id)).toEqual([]);
    expect(await faTemAcesso(u.id, randomUUID())).toBe(false);
    expect((await painelDoAluno(u.id)).xpTotal).toBe(0);
  });
});
