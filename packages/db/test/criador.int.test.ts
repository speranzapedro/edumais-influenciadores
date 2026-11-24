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
  publicarProduto,
  salvarPerfilCriador,
  salvarProduto,
  trilhasDoCriador,
  vitrinePorHandle,
} from "../src/criador";
import { ErroAcesso, ErroPermissao } from "../src/erros";
import { registrarExecucao } from "../src/estudio";

beforeAll(limparBanco);

describe("cadastro do criador", () => {
  it("cria a conta de criador com perfil público e produto em rascunho", async () => {
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
    expect(e.perfil).toMatchObject({ handle: base, nome_publico: "Bia História" });
    expect(e.produto).toMatchObject({ criador_id: usuario.id, status: "rascunho", nome: "Trilhas de Bia" });
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
    const { usuario: fa } = await novoFa(c.escopo.produto.id);
    expect(await escopoCriador(fa)).toBeNull();
    expect(await escopoCriador({ ...c.usuario, status: "inativo" })).toBeNull();
  });
});

describe("perfil público e produto", () => {
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

  it("salva nome, descrição e preço do produto", async () => {
    const c = await novoCriador();
    await salvarProduto(c.escopo, { nome: "  Revoluções  ", descricao: " Do Iluminismo a 1848. ", precoCentavos: 2990 });
    expect((await recarregar(c)).escopo.produto).toMatchObject({ nome: "Revoluções", descricao: "Do Iluminismo a 1848.", preco_centavos: 2990 });
    await expect(salvarProduto(c.escopo, { nome: "ab", descricao: null, precoCentavos: null })).rejects.toThrow("nome");
    await expect(salvarProduto(c.escopo, { nome: "Válido", descricao: null, precoCentavos: -1 })).rejects.toThrow("Preço inválido");
  });

  it("página em rascunho: sem trilhas; publicar exige trilha publicada", async () => {
    const c = await novoCriador();
    let vitrine = await vitrinePorHandle(c.escopo.perfil.handle);
    expect(vitrine?.produto.publicado).toBe(false);
    expect(vitrine?.trilhas).toEqual([]);
    expect(JSON.stringify(vitrine)).not.toContain(c.email);
    await expect(publicarProduto(c.escopo, true)).rejects.toThrow("Publique pelo menos uma trilha");

    const trilha = await trilhaPronta(c.escopo);
    await trilhaPronta(c.escopo, { titulo: "Ainda em rascunho", publicar: false });
    await publicarProduto(c.escopo, true);
    vitrine = await vitrinePorHandle(`@${c.escopo.perfil.handle.toUpperCase()}`);
    expect(vitrine?.produto.publicado).toBe(true);
    expect(vitrine?.trilhas.map((t) => t.id)).toEqual([trilha.id]);
    expect(vitrine?.trilhas[0].totalAulas).toBe(7);

    const r = await recarregar(c);
    expect(r.escopo.produto.publicado_em).not.toBeNull();
    await publicarProduto(r.escopo, false);
    expect((await recarregar(c)).escopo.produto).toMatchObject({ status: "rascunho", publicado_em: r.escopo.produto.publicado_em });
  });

  it("@ inexistente ou inválido não tem página", async () => {
    expect(await vitrinePorHandle("ninguem.aqui.mesmo")).toBeNull();
    expect(await vitrinePorHandle("%E0%A4%A")).toBeNull();
    expect(await vitrinePorHandle("a")).toBeNull();
  });
});

describe("trilhas e isolamento", () => {
  it("lista as trilhas do produto por status, com etapas e aulas", async () => {
    const c = await novoCriador();
    const pub = await trilhaPronta(c.escopo, { titulo: "Publicada" });
    const rasc = await trilhaPronta(c.escopo, { titulo: "Rascunho", publicar: false });
    const todas = await trilhasDoCriador(c.escopo);
    expect(todas.map((t) => t.id).sort()).toEqual([pub.id, rasc.id].sort());
    expect(todas.find((t) => t.id === pub.id)).toMatchObject({ totalAulas: 7 });
    expect(todas.find((t) => t.id === rasc.id)?.etapas).toHaveLength(4);
    expect((await trilhasDoCriador(c.escopo, { status: "publicada" })).map((t) => t.id)).toEqual([pub.id]);
    expect(await trilhasDoCriador((await novoCriador()).escopo)).toEqual([]);
  });

  it("um criador não acessa a trilha de outro", async () => {
    const a = await novoCriador();
    const b = await novoCriador();
    const t = await trilhaPronta(a.escopo, { publicar: false });
    await expect(exigirTrilhaDoCriador(a.escopo, t.id)).resolves.toBeUndefined();
    await expect(exigirTrilhaDoCriador(b.escopo, t.id)).rejects.toThrow(ErroPermissao);
    await expect(exigirTrilhaDoCriador(b.escopo, "nao-e-uuid")).rejects.toThrow(ErroPermissao);
    expect((await trilhasDoCriador(b.escopo)).some((x) => x.id === t.id)).toBe(false);
  });
});

describe("painel comercial", () => {
  it("vendas e assinantes do produto, sem misturar criadores e sem e-mail", async () => {
    const a = await criadorNoAr();
    const b = await criadorNoAr();
    const { usuario: fa } = await novoFa(a.escopo.produto.id, { origem: "Instagram!" });
    await novoFa(b.escopo.produto.id, { origem: "tiktok" });

    const va = await painelVendas(a.escopo, 30);
    expect(va).toMatchObject({ cortesias: 1, ativas: 0, receitaMensal: 0, novasNoPeriodo: 1 });
    expect(va.serie).toHaveLength(30);
    expect(va.origens).toEqual([{ origem: "instagram", total: 1 }]);
    expect(va.conclusaoPorTrilha.map((t) => t.id)).toEqual([a.trilha.id]);

    await db().from("assinaturas").update({ status: "ativa", valor_centavos: 2990 }).eq("produto_id", b.escopo.produto.id);
    const vb = await painelVendas(b.escopo, 30);
    expect(vb).toMatchObject({ ativas: 1, cortesias: 0, receitaMensal: 2990, parteCriador: 2093 });
    expect(vb.origens).toEqual([{ origem: "tiktok", total: 1 }]);

    const assinantes = await assinantesDoCriador(a.escopo);
    expect(assinantes).toEqual([expect.objectContaining({ id: fa.id, status: "cortesia", origem: "instagram", aulasConcluidas: 0, ultimaAula: null })]);
    expect(JSON.stringify(assinantes)).not.toContain("@edumais.test");
    expect(await assinantesDoCriador((await novoCriador()).escopo)).toEqual([]);
  });
});

describe("IA e cota do agente", () => {
  it("monta o perfil de IA do criador para a trilha", async () => {
    const c = await novoCriador();
    await salvarPerfilCriador(c.escopo, { nomePublico: "Bia História", handle: c.escopo.perfil.handle, bio: "Historiadora.", redes: {} });
    await salvarProduto(c.escopo, { nome: "Revoluções", descricao: "Do Iluminismo a 1848.", precoCentavos: null });
    const t = await trilhaPronta((await recarregar(c)).escopo, { publicar: false });
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
