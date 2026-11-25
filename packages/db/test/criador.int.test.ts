import { criadorNoAr, emailUnico, handleUnico, ipUnico, limparBanco, novoCriador, novoFa, recarregar, SENHA, trilhaPronta } from "@edu/testing";
import { beforeAll, describe, expect, it } from "vitest";
import { getUsuario } from "../src/acesso";
import { db } from "../src/client";
import {
  assinantesDoCriador,
  cadastrarCriador,
  cotaDoAgente,
  escopoCriador,
  execucoesDoAgenteNoMes,
  exigirTrilhaDoCriador,
  lerRedes,
  limiteAgenteMes,
  painelVendas,
  perfilIADaTrilha,
  produtoPorHandleESlug,
  publicarPagina,
  salvarPerfilCriador,
  salvarPrecoAssinatura,
  trilhasDoCriador,
  vitrinePorHandle,
} from "../src/criador";
import { ErroAcesso, ErroPermissao } from "../src/erros";
import { registrarExecucao } from "../src/estudio";
import { criarProduto, listarProdutos, publicarProduto, salvarIdentidadeProduto, salvarProduto } from "../src/produtos";

beforeAll(limparBanco);

describe("cadastro do criador", () => {
  it("cria a conta de criador com a página em rascunho e sem produtos", async () => {
    const base = handleUnico("bia");
    const { usuario, handle } = await cadastrarCriador({
      nome: "Bia História",
      email: emailUnico(),
      senha: SENHA,
      handle: `@${base.toUpperCase()}`,
      ip: ipUnico(),
    });
    expect(handle).toBe(base);
    expect(usuario.role).toBe("criador");
    const e = (await escopoCriador(usuario))!;
    expect(e.perfil).toMatchObject({ handle: base, nome_publico: "Bia História", pagina_status: "rascunho", preco_centavos: null });
    expect(await listarProdutos(e)).toEqual([]);
  });

  it("sem @, sugere um a partir do nome e evita repetição", async () => {
    const a = await cadastrarCriador({ nome: "Carla Química", email: emailUnico(), senha: SENHA, ip: ipUnico() });
    const b = await cadastrarCriador({ nome: "Carla Química", email: emailUnico(), senha: SENHA, ip: ipUnico() });
    expect(a.handle).toMatch(/^carlaquimica/);
    expect(b.handle).not.toBe(a.handle);
  });

  it("recusa @ repetido, @ inválido e e-mail repetido, sem deixar conta para trás", async () => {
    const c = await novoCriador();
    await expect(cadastrarCriador({ nome: "Outra Pessoa", email: emailUnico(), senha: SENHA, handle: c.escopo.perfil.handle, ip: ipUnico() })).rejects.toThrow(
      "já está em uso",
    );
    await expect(cadastrarCriador({ nome: "Outra Pessoa", email: emailUnico(), senha: SENHA, handle: "ab", ip: ipUnico() })).rejects.toThrow(ErroAcesso);
    await expect(cadastrarCriador({ nome: "Outra Pessoa", email: c.email, senha: SENHA, ip: ipUnico() })).rejects.toThrow("Já existe uma conta");
    const { count } = await db().from("users").select("id", { count: "exact", head: true }).eq("nome", "Outra Pessoa");
    expect(count).toBe(0);
  });

  it("limita cadastros com falha por IP", async () => {
    const ip = ipUnico();
    for (let i = 0; i < 10; i++)
      await expect(cadastrarCriador({ nome: "Senha Fraca", email: emailUnico(), senha: "fraca", ip })).rejects.toThrow("8 caracteres");
    await expect(cadastrarCriador({ nome: "Senha Forte", email: emailUnico(), senha: SENHA, ip })).rejects.toThrow("Muitas tentativas");
  });

  it("conta de fã ou desativada não tem escopo de criador", async () => {
    const c = await criadorNoAr();
    const { usuario: fa } = await novoFa(c.usuario.id);
    expect(await escopoCriador(fa)).toBeNull();
    expect(await escopoCriador({ ...c.usuario, status: "inativo" })).toBeNull();
  });
});

describe("perfil, preço e página", () => {
  it("salva o perfil com redes limpas e a foto também no usuário", async () => {
    const c = await novoCriador();
    const novo = handleUnico("novo");
    await salvarPerfilCriador(c.escopo, {
      nomePublico: " Bia  Conta ",
      handle: novo,
      bio: "  Professora de história. ",
      fotoUrl: "https://exemplo.test/foto.png",
      redes: { instagram: "@@bia", tiktok: "  ", youtube: "biaconta" },
    });
    const r = await recarregar(c);
    expect(r.escopo.perfil).toMatchObject({
      nome_publico: "Bia Conta",
      handle: novo,
      bio: "Professora de história.",
      foto_url: "https://exemplo.test/foto.png",
    });
    expect(lerRedes(r.escopo.perfil.redes)).toEqual({ instagram: "bia", youtube: "biaconta" });
    expect(r.usuario.avatar_url).toBe("https://exemplo.test/foto.png");
    expect(lerRedes(null)).toEqual({});
    expect(lerRedes(["x"])).toEqual({});
  });

  it("recusa @ de outro criador e nome curto", async () => {
    const a = await novoCriador();
    const b = await novoCriador();
    await expect(salvarPerfilCriador(b.escopo, { nomePublico: "Bruno", handle: a.escopo.perfil.handle, bio: null, redes: {} })).rejects.toThrow(
      "já está em uso",
    );
    await expect(salvarPerfilCriador(b.escopo, { nomePublico: "B", handle: b.escopo.perfil.handle, bio: null, redes: {} })).rejects.toThrow(ErroAcesso);
  });

  it("salva o preço da assinatura no perfil do criador", async () => {
    const c = await novoCriador();
    await salvarPrecoAssinatura(c.escopo, 2990);
    expect((await recarregar(c)).escopo.perfil.preco_centavos).toBe(2990);
    await salvarPrecoAssinatura(c.escopo, null);
    expect((await recarregar(c)).escopo.perfil.preco_centavos).toBeNull();
    await expect(salvarPrecoAssinatura(c.escopo, -1)).rejects.toThrow("Preço inválido");
    await expect(salvarPrecoAssinatura(c.escopo, 9.5)).rejects.toThrow("Preço inválido");
  });

  it("página em rascunho: sem produtos; abrir exige produto publicado, que exige trilha publicada", async () => {
    const c = await novoCriador();
    let vitrine = await vitrinePorHandle(c.escopo.perfil.handle);
    expect(vitrine).toMatchObject({ publicada: false, produtos: [] });
    expect(JSON.stringify(vitrine)).not.toContain(c.email);
    await expect(publicarPagina(c.escopo, true)).rejects.toThrow("Publique pelo menos um produto");
    await expect(publicarProduto(c.escopo, c.produto.id, true)).rejects.toThrow("Publique pelo menos uma trilha");

    const trilha = await trilhaPronta(c.escopo, { produtoId: c.produto.id });
    await trilhaPronta(c.escopo, { produtoId: c.produto.id, titulo: "Ainda em rascunho", publicar: false });
    await publicarProduto(c.escopo, c.produto.id, true);
    // Produto publicado, mas a página ainda fechada: ninguém vê.
    expect(await vitrinePorHandle(c.escopo.perfil.handle)).toMatchObject({ publicada: false, produtos: [] });
    await publicarPagina(c.escopo, true);

    vitrine = await vitrinePorHandle(`@${c.escopo.perfil.handle.toUpperCase()}`);
    expect(vitrine?.publicada).toBe(true);
    expect(vitrine?.produtos.map((p) => p.id)).toEqual([c.produto.id]);
    expect(vitrine?.produtos[0].trilhas.map((t) => t.id)).toEqual([trilha.id]);
    expect(vitrine?.produtos[0].trilhas[0].totalAulas).toBe(7);

    const r = await recarregar(c);
    expect(r.escopo.perfil.pagina_publicada_em).not.toBeNull();
    await publicarPagina(r.escopo, false);
    expect((await recarregar(c)).escopo.perfil).toMatchObject({ pagina_status: "rascunho", pagina_publicada_em: r.escopo.perfil.pagina_publicada_em });
    expect(await vitrinePorHandle(c.escopo.perfil.handle)).toMatchObject({ publicada: false, produtos: [] });
  });

  it("vitrine com vários produtos: só os publicados, na ordem, com marca; e a página de cada um", async () => {
    const c = await criadorNoAr();
    const ingles = await criarProduto(c.escopo, { nome: "Inglês do Zero", descricao: "Do básico à conversa." });
    await salvarIdentidadeProduto(c.escopo, ingles.id, { corPrimaria: "#1D4ED8", corDestaque: "#06b6d4" });
    const t = await trilhaPronta(c.escopo, { produtoId: ingles.id, titulo: "Verbos" });
    const rascunho = await criarProduto(c.escopo, { nome: "Ainda não" });
    await trilhaPronta(c.escopo, { produtoId: rascunho.id });

    let v = await vitrinePorHandle(c.escopo.perfil.handle);
    expect(v?.produtos.map((p) => p.id)).toEqual([c.produto.id]);
    await publicarProduto(c.escopo, ingles.id, true);
    v = await vitrinePorHandle(c.escopo.perfil.handle);
    expect(v?.produtos.map((p) => p.slug)).toEqual([c.produto.slug, "ingles-do-zero"]);
    expect(v?.produtos[1]).toMatchObject({ nome: "Inglês do Zero", cor_primaria: "#1d4ed8", cor_destaque: "#06b6d4", logo_path: null });
    expect(v?.produtos[1].trilhas.map((x) => x.id)).toEqual([t.id]);

    const pagina = await produtoPorHandleESlug(`@${c.escopo.perfil.handle}`, "Ingles-do-Zero");
    expect(pagina?.produto.id).toBe(ingles.id);
    expect(pagina?.criador.handle).toBe(c.escopo.perfil.handle);
    expect(await produtoPorHandleESlug(c.escopo.perfil.handle, rascunho.slug)).toBeNull();
    expect(await produtoPorHandleESlug(c.escopo.perfil.handle, "nao-existe")).toBeNull();
    expect(await produtoPorHandleESlug(c.escopo.perfil.handle, "../x")).toBeNull();
    expect(await produtoPorHandleESlug("ninguem.aqui.mesmo", "ingles-do-zero")).toBeNull();
    await publicarPagina(c.escopo, false);
    expect(await produtoPorHandleESlug(c.escopo.perfil.handle, "ingles-do-zero")).toBeNull();
  });

  it("@ inexistente ou inválido não tem página", async () => {
    expect(await vitrinePorHandle("ninguem.aqui.mesmo")).toBeNull();
    expect(await vitrinePorHandle("%E0%A4%A")).toBeNull();
    expect(await vitrinePorHandle("a")).toBeNull();
  });
});

describe("trilhas e isolamento", () => {
  it("lista as trilhas do criador por status e por produto, com etapas e aulas", async () => {
    const c = await novoCriador();
    const pub = await trilhaPronta(c.escopo, { titulo: "Publicada" });
    const rasc = await trilhaPronta(c.escopo, { titulo: "Rascunho", publicar: false });
    const todas = await trilhasDoCriador(c.escopo);
    expect(todas.map((t) => t.id).sort()).toEqual([pub.id, rasc.id].sort());
    expect(todas.find((t) => t.id === pub.id)).toMatchObject({ totalAulas: 7 });
    expect(todas.find((t) => t.id === rasc.id)?.etapas).toHaveLength(4);
    expect((await trilhasDoCriador(c.escopo, { status: "publicada" })).map((t) => t.id)).toEqual([pub.id]);
    const outro = await criarProduto(c.escopo, { nome: "Outro produto" });
    const noOutro = await trilhaPronta(c.escopo, { produtoId: outro.id, publicar: false });
    expect((await trilhasDoCriador(c.escopo)).map((t) => t.id)).toContain(noOutro.id);
    expect((await trilhasDoCriador(c.escopo, { produtoId: outro.id })).map((t) => t.id)).toEqual([noOutro.id]);
    expect(await trilhasDoCriador((await novoCriador()).escopo)).toEqual([]);
  });

  it("um criador não acessa a trilha de outro", async () => {
    const a = await novoCriador();
    const b = await novoCriador();
    const t = await trilhaPronta(a.escopo, { publicar: false });
    await expect(exigirTrilhaDoCriador(a.escopo, t.id)).resolves.toEqual({ produtoId: a.produto.id });
    await expect(exigirTrilhaDoCriador(b.escopo, t.id)).rejects.toThrow(ErroPermissao);
    await expect(exigirTrilhaDoCriador(b.escopo, "nao-e-uuid")).rejects.toThrow(ErroPermissao);
    expect((await trilhasDoCriador(b.escopo)).some((x) => x.id === t.id)).toBe(false);
  });
});

describe("painel comercial", () => {
  it("vendas e assinantes do criador, sem misturar criadores e sem e-mail", async () => {
    const a = await criadorNoAr();
    const b = await criadorNoAr();
    const { usuario: fa } = await novoFa(a.usuario.id, { origem: "Instagram!", produtoEntradaId: a.produto.id });
    await novoFa(b.usuario.id, { origem: "tiktok" });

    const va = await painelVendas(a.escopo, 30);
    expect(va).toMatchObject({ cortesias: 1, ativas: 0, receitaMensal: 0, novasNoPeriodo: 1 });
    expect(va.serie).toHaveLength(30);
    expect(va.origens).toEqual([{ origem: "instagram", total: 1 }]);
    expect(va.conclusaoPorTrilha.map((t) => t.id)).toEqual([a.trilha.id]);

    await db().from("assinaturas").update({ status: "ativa", valor_centavos: 2990 }).eq("criador_id", b.usuario.id);
    const vb = await painelVendas(b.escopo, 30);
    expect(vb).toMatchObject({ ativas: 1, cortesias: 0, receitaMensal: 2990, parteCriador: 2093 });
    expect(vb.origens).toEqual([{ origem: "tiktok", total: 1 }]);

    const assinantes = await assinantesDoCriador(a.escopo);
    expect(assinantes).toEqual([
      expect.objectContaining({ id: fa.id, status: "cortesia", origem: "instagram", aulasConcluidas: 0, ultimaAula: null, entrouPor: a.produto.nome }),
    ]);
    expect((await assinantesDoCriador(b.escopo))[0].entrouPor).toBeNull();
    expect(JSON.stringify(assinantes)).not.toContain("@edumais.test");
    expect(await assinantesDoCriador((await novoCriador()).escopo)).toEqual([]);
  });
});

describe("IA e cota do agente", () => {
  it("monta o perfil de IA do criador para a trilha", async () => {
    const c = await novoCriador();
    await salvarPerfilCriador(c.escopo, { nomePublico: "Bia História", handle: c.escopo.perfil.handle, bio: "Historiadora.", redes: {} });
    await salvarProduto(c.escopo, c.produto.id, { nome: "Revoluções", slug: "revolucoes", descricao: "Do Iluminismo a 1848." });
    const t = await trilhaPronta((await recarregar(c)).escopo, { produtoId: c.produto.id, publicar: false });
    const ia = await perfilIADaTrilha(t.id);
    expect(ia?.produto).toBe("Revoluções");
    expect(ia?.perfil.nome).toBe("Bia História");
    expect(ia?.perfil.publico).toContain(`@${c.escopo.perfil.handle}`);
    expect(ia?.perfil.publico).toContain("Do Iluminismo a 1848.");
    expect(ia?.perfil.publico).toContain("Quem é o criador: Historiadora.");
    expect(await perfilIADaTrilha("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("conta as execuções do agente nos últimos 30 dias e bloqueia no limite", async () => {
    const c = await novoCriador();
    expect(await execucoesDoAgenteNoMes(c.escopo)).toBe(0);
    const t = await trilhaPronta(c.escopo, { publicar: false });
    await registrarExecucao({ trilhaId: t.id, etapa: "visao", tipo: "geracao" });
    await registrarExecucao({ trilhaId: t.id, etapa: "visao", tipo: "refinamento" });
    await registrarExecucao({ trilhaId: t.id, etapa: null, tipo: "eval" });
    expect(await execucoesDoAgenteNoMes(c.escopo)).toBe(2);
    expect(limiteAgenteMes()).toBe(60);
    expect(await cotaDoAgente(c.escopo)).toBeNull();
    process.env.LIMITE_AGENTE_MES = "2";
    try {
      expect(await cotaDoAgente(c.escopo)).toContain("limite de 2 execuções");
    } finally {
      delete process.env.LIMITE_AGENTE_MES;
    }
  });

  it("a conta do criador continua a mesma depois de tudo", async () => {
    const c = await novoCriador();
    expect((await getUsuario(c.usuario.id))?.role).toBe("criador");
  });
});
