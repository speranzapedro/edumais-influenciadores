import { randomUUID } from "node:crypto";
import { limparBanco, novoCriador, trilhaPronta } from "@edu/testing";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/client";
import { ErroAcesso, ErroPermissao } from "../src/erros";
import {
  criarProduto,
  excluirProduto,
  exigirProdutoDoCriador,
  listarProdutos,
  produtoPadrao,
  publicarProduto,
  reordenarProdutos,
  salvarIdentidadeProduto,
  salvarProduto,
} from "../src/produtos";

beforeAll(limparBanco);

describe("produtos do criador", () => {
  it("cria produtos no fim da lista, com slug a partir do nome e desempate", async () => {
    const c = await novoCriador();
    const a = await criarProduto(c.escopo, { nome: "  Inglês do Zero ", descricao: "  Do básico à conversa. " });
    const b = await criarProduto(c.escopo, { nome: "Inglês do zero" });
    const d = await criarProduto(c.escopo, { nome: "Perfil" });
    expect(a).toMatchObject({
      nome: "Inglês do Zero",
      slug: "ingles-do-zero",
      descricao: "Do básico à conversa.",
      status: "rascunho",
      cor_primaria: "#6c5ce7",
    });
    expect(b.slug).toBe("ingles-do-zero-2");
    expect(d.slug).toBe("perfil-curso");
    expect((await listarProdutos(c.escopo)).map((p) => p.id)).toEqual([c.produto.id, a.id, b.id, d.id]);
    expect([a.ordem, b.ordem, d.ordem]).toEqual([c.produto.ordem + 1, c.produto.ordem + 2, c.produto.ordem + 3]);
  });

  it("recusa nome curto, slug inválido, reservado ou repetido", async () => {
    const c = await novoCriador();
    await expect(criarProduto(c.escopo, { nome: "ab" })).rejects.toThrow("Dê um nome");
    await expect(criarProduto(c.escopo, { nome: "Válido", slug: "entrar" })).rejects.toThrow("reservado");
    await expect(criarProduto(c.escopo, { nome: "Válido", slug: "x" })).rejects.toThrow("pelo menos 3");
    await expect(criarProduto(c.escopo, { nome: "Válido", slug: c.produto.slug })).rejects.toThrow("já tem um produto com este endereço");
    // O slug digitado é normalizado.
    expect((await criarProduto(c.escopo, { nome: "Válido", slug: " Meu Curso! " })).slug).toBe("meu-curso");
    // Outro criador pode usar o mesmo endereço (o slug é único por criador).
    const outro = await novoCriador();
    expect((await criarProduto(outro.escopo, { nome: "Válido", slug: "meu-curso" })).slug).toBe("meu-curso");
  });

  it("salva nome, endereço e descrição; isolado entre criadores", async () => {
    const c = await novoCriador();
    const p = await criarProduto(c.escopo, { nome: "Química" });
    await salvarProduto(c.escopo, p.id, { nome: " Química Orgânica ", slug: "quimica-organica", descricao: "  " });
    expect(await exigirProdutoDoCriador(c.escopo, p.id)).toMatchObject({ nome: "Química Orgânica", slug: "quimica-organica", descricao: null });
    await expect(salvarProduto(c.escopo, p.id, { nome: "Química", slug: c.produto.slug, descricao: null })).rejects.toThrow("já tem um produto");
    await expect(salvarProduto(c.escopo, p.id, { nome: "Química", slug: "api", descricao: null })).rejects.toThrow(ErroAcesso);

    const intruso = await novoCriador();
    await expect(salvarProduto(intruso.escopo, p.id, { nome: "Invasão", slug: "invasao", descricao: null })).rejects.toThrow(ErroPermissao);
    await expect(exigirProdutoDoCriador(intruso.escopo, p.id)).rejects.toThrow("Produto não encontrado");
    await expect(exigirProdutoDoCriador(c.escopo, "nao-e-uuid")).rejects.toThrow(ErroPermissao);
    await expect(exigirProdutoDoCriador(c.escopo, randomUUID())).rejects.toThrow(ErroPermissao);
  });

  it("identidade visual: cores em #rrggbb e logo só no espaço do criador", async () => {
    const c = await novoCriador();
    await salvarIdentidadeProduto(c.escopo, c.produto.id, { corPrimaria: " #1D4ED8 ", corDestaque: "#06B6D4" });
    expect(await exigirProdutoDoCriador(c.escopo, c.produto.id)).toMatchObject({ cor_primaria: "#1d4ed8", cor_destaque: "#06b6d4", logo_path: null });

    const logo = `criadores/${c.usuario.id}/${randomUUID()}.png`;
    await salvarIdentidadeProduto(c.escopo, c.produto.id, { corPrimaria: "#1d4ed8", corDestaque: "", logoPath: logo });
    expect(await exigirProdutoDoCriador(c.escopo, c.produto.id)).toMatchObject({ cor_destaque: null, logo_path: logo });
    // Sem logoPath: mantém o logo atual.
    await salvarIdentidadeProduto(c.escopo, c.produto.id, { corPrimaria: "#15803d", corDestaque: null });
    expect((await exigirProdutoDoCriador(c.escopo, c.produto.id)).logo_path).toBe(logo);
    await salvarIdentidadeProduto(c.escopo, c.produto.id, { corPrimaria: "#15803d", corDestaque: null, logoPath: null });
    expect((await exigirProdutoDoCriador(c.escopo, c.produto.id)).logo_path).toBeNull();

    await expect(salvarIdentidadeProduto(c.escopo, c.produto.id, { corPrimaria: "azul", corDestaque: null })).rejects.toThrow("cor principal");
    await expect(salvarIdentidadeProduto(c.escopo, c.produto.id, { corPrimaria: "#1d4ed8", corDestaque: "#abc" })).rejects.toThrow("cor de destaque");
    const outro = await novoCriador();
    await expect(
      salvarIdentidadeProduto(c.escopo, c.produto.id, {
        corPrimaria: "#1d4ed8",
        corDestaque: null,
        logoPath: `criadores/${outro.usuario.id}/${randomUUID()}.png`,
      }),
    ).rejects.toThrow(ErroPermissao);
    await expect(
      salvarIdentidadeProduto(c.escopo, c.produto.id, { corPrimaria: "#1d4ed8", corDestaque: null, logoPath: `criadores/${c.usuario.id}/${randomUUID()}.svg` }),
    ).rejects.toThrow(ErroPermissao);
    // O banco também barra cor fora do formato.
    const r = await db().from("produtos").update({ cor_primaria: "red" }).eq("id", c.produto.id);
    expect(r.error?.message).toContain("produtos_cor_primaria_hex");
  });

  it("publica só com trilha publicada no próprio produto", async () => {
    const c = await novoCriador();
    const p = await criarProduto(c.escopo, { nome: "Sem trilha" });
    await trilhaPronta(c.escopo, { produtoId: c.produto.id });
    await expect(publicarProduto(c.escopo, p.id, true)).rejects.toThrow("Publique pelo menos uma trilha");
    await trilhaPronta(c.escopo, { produtoId: p.id });
    await publicarProduto(c.escopo, p.id, true);
    const publicado = await exigirProdutoDoCriador(c.escopo, p.id);
    expect(publicado).toMatchObject({ status: "publicado" });
    await publicarProduto(c.escopo, p.id, false);
    expect(await exigirProdutoDoCriador(c.escopo, p.id)).toMatchObject({ status: "rascunho", publicado_em: publicado.publicado_em });
    await expect(publicarProduto((await novoCriador()).escopo, p.id, true)).rejects.toThrow(ErroPermissao);
  });

  it("reordena e exclui só produtos vazios do próprio criador", async () => {
    const c = await novoCriador();
    const a = await criarProduto(c.escopo, { nome: "Produto A" });
    const b = await criarProduto(c.escopo, { nome: "Produto B" });
    await reordenarProdutos(c.escopo, [b.id, a.id, c.produto.id]);
    expect((await listarProdutos(c.escopo)).map((p) => p.id)).toEqual([b.id, a.id, c.produto.id]);
    expect(await produtoPadrao(c.escopo)).toMatchObject({ id: b.id });

    const outro = await novoCriador();
    await expect(reordenarProdutos(c.escopo, [outro.produto.id])).rejects.toThrow(ErroPermissao);
    await expect(excluirProduto(outro.escopo, a.id)).rejects.toThrow(ErroPermissao);

    await trilhaPronta(c.escopo, { produtoId: a.id, publicar: false });
    await expect(excluirProduto(c.escopo, a.id)).rejects.toThrow("sem trilhas");
    await excluirProduto(c.escopo, b.id);
    expect((await listarProdutos(c.escopo)).map((p) => p.id)).toEqual([a.id, c.produto.id]);
  });

  it("produto padrão: o primeiro da página; cria um se o criador não tiver nenhum", async () => {
    const c = await novoCriador({ nome: "Duda Física" });
    await excluirProduto(c.escopo, c.produto.id);
    expect(await listarProdutos(c.escopo)).toEqual([]);
    const p = await produtoPadrao(c.escopo);
    expect(p).toMatchObject({ nome: "Trilhas de Duda", slug: "trilhas-de-duda" });
    expect((await produtoPadrao(c.escopo)).id).toBe(p.id);
  });
});
