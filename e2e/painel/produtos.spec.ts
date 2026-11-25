import { criarProduto, db } from "@edu/db";
import { novoCriador, trilhaPronta } from "@edu/testing";
import { expect, test } from "@playwright/test";
import { entrarNoPainel } from "../apoio";

test("cria um produto pela tela, edita os detalhes e publica só com trilha", async ({ page }) => {
  const c = await novoCriador();
  await entrarNoPainel(page, c.email);
  await page.goto("/produtos");
  await expect(page.getByRole("link", { name: /Trilhas de Bia/ })).toBeVisible();

  await page.getByRole("link", { name: "Novo produto" }).first().click();
  await page.getByLabel("Nome do produto").fill("Inglês do Zero");
  // O endereço acompanha o nome.
  await expect(page.getByLabel("Endereço")).toHaveValue("ingles-do-zero");
  await page.getByRole("button", { name: "Criar produto" }).click();

  await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Inglês do Zero" })).toBeVisible();
  await expect(page.getByText(`@${c.escopo.perfil.handle}/ingles-do-zero`)).toBeVisible();
  await expect(page.getByText("Crie a primeira trilha deste produto")).toBeVisible();
  const produtoId = page.url().split("/").at(-1)!;

  // Sem trilha publicada, o produto não abre.
  await page.getByRole("button", { name: "Publicar produto" }).click();
  await expect(page.getByText("Publique pelo menos uma trilha deste produto")).toBeVisible();

  // Detalhes: endereço reservado é recusado; um válido salva e avisa que links antigos param.
  await page.getByRole("link", { name: "Detalhes" }).click();
  await expect(page).toHaveURL(new RegExp(`/produtos/${produtoId}/detalhes$`));
  await page.getByLabel("Endereço").fill("entrar");
  await expect(page.getByText("links antigos deste produto")).toBeVisible();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("reservado pela Edu+")).toBeVisible();
  await page.getByLabel("Endereço").fill("ingles-basico");
  await page.getByLabel("O que o fã vai aprender").fill("Do verbo to be à primeira conversa.");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Produto salvo.")).toBeVisible();

  await trilhaPronta(c.escopo, { produtoId, titulo: "Verbos essenciais" });
  await page
    .getByRole("link", { name: /Trilhas/ })
    .first()
    .click();
  await expect(page.getByText("Verbos essenciais")).toBeVisible();
  await page.getByRole("button", { name: "Publicar produto" }).click();
  await expect(page.getByText("Produto publicado!")).toBeVisible();

  const { data } = await db().from("produtos").select("slug, descricao, status").eq("id", produtoId).single();
  expect(data).toEqual({ slug: "ingles-basico", descricao: "Do verbo to be à primeira conversa.", status: "publicado" });
});

test("reordena produtos e exclui só o vazio", async ({ page }) => {
  const c = await novoCriador();
  const segundo = await criarProduto(c.escopo, { nome: "Segundo produto" });
  await trilhaPronta(c.escopo, { produtoId: c.produto.id, publicar: false });
  await entrarNoPainel(page, c.email);

  await page.goto("/produtos");
  const nomes = page.getByRole("listitem").locator("a .font-bold");
  await expect(nomes).toHaveText([c.produto.nome, "Segundo produto"]);
  await page.getByRole("button", { name: "Subir Segundo produto" }).click();
  await expect(nomes).toHaveText(["Segundo produto", c.produto.nome]);

  // Com trilha, não exclui.
  await page.goto(`/produtos/${c.produto.id}/detalhes`);
  await expect(page.getByRole("button", { name: "Excluir produto" })).toBeDisabled();

  await page.goto(`/produtos/${segundo.id}/detalhes`);
  await page.getByRole("button", { name: "Excluir produto" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
  await expect(page).toHaveURL(/\/produtos$/);
  await expect(nomes).toHaveText([c.produto.nome]);
});

test("endereços antigos de trilhas levam aos produtos; produto de outro criador não abre", async ({ page }) => {
  const outro = await novoCriador({ nome: "Outra Pessoa" });
  const c = await novoCriador();
  await criarProduto(c.escopo, { nome: "Mais um" });
  await entrarNoPainel(page, c.email);

  await page.goto("/trilhas");
  await expect(page).toHaveURL(/\/produtos$/);
  // Com mais de um produto, "nova trilha" pede para escolher o produto.
  await page.goto("/trilhas/nova");
  await expect(page).toHaveURL(/\/produtos$/);

  await page.goto(`/produtos/${outro.produto.id}`);
  await expect(page.getByText("Página não encontrada")).toBeVisible();
  await expect(page.getByText(outro.produto.nome)).toHaveCount(0);
});
