import { criarProduto, db, publicarProduto, salvarIdentidadeProduto } from "@edu/db";
import { criadorNoAr, emailUnico, novoFa, trilhaPronta } from "@edu/testing";
import { expect, type Page, test } from "@playwright/test";
import { entrarNoApp, SENHA } from "../apoio";

const corDaMarca = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-marca-600").trim());

test("página do produto com a marca dele: cores, barra do navegador, manifesto e entrada pelo produto", async ({ page }) => {
  const c = await criadorNoAr({ nome: "Nina Idiomas" });
  await salvarIdentidadeProduto(c.escopo, c.produto.id, { corPrimaria: "#1d4ed8", corDestaque: "#06b6d4" });
  const handle = c.escopo.perfil.handle;

  await page.goto(`/@${handle}/${c.produto.slug}?origem=instagram`);
  await expect(page.getByRole("heading", { name: c.produto.nome })).toBeVisible();
  await expect(page.getByText(c.trilha.titulo)).toBeVisible();
  expect(await corDaMarca(page)).toBe("#1d4ed8");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#1d4ed8");

  const manifesto = await page.locator('link[rel="manifest"]').getAttribute("href");
  const m = await (await page.request.get(manifesto!)).json();
  expect(m).toMatchObject({ name: c.produto.nome, start_url: `/@${handle}/${c.produto.slug}`, theme_color: "#1d4ed8" });

  // Entrar pela página do produto assina o criador e registra o produto de entrada.
  const email = emailUnico("e2e-produto");
  await page.getByLabel("Seu nome completo").fill("Teo Fã");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Crie uma senha").fill(SENHA);
  await page.getByLabel("Repita a senha").fill(SENHA);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta e começar" }).click();
  await expect(page).toHaveURL(/\/\?bemvindo=1$/);
  const { data: u } = await db().from("users").select("id").eq("email", email).single();
  const { data: ass } = await db().from("assinaturas").select("criador_id, produto_id, origem").eq("aluno_id", u!.id).single();
  expect(ass).toEqual({ criador_id: c.usuario.id, produto_id: c.produto.id, origem: "instagram" });

  // Dentro do curso, a trilha também usa a marca do produto.
  await page.goto(`/trilhas/${c.trilha.id}`);
  await expect(page.getByText(c.trilha.titulo).first()).toBeVisible();
  expect(await corDaMarca(page)).toBe("#1d4ed8");
});

test("página do criador lista os produtos publicados; produto em rascunho não abre", async ({ page }) => {
  const c = await criadorNoAr({ nome: "Duda Ciências" });
  const outro = await criarProduto(c.escopo, { nome: "Química do Dia a Dia" });
  await trilhaPronta(c.escopo, { produtoId: outro.id, titulo: "Reações" });
  const rascunho = await criarProduto(c.escopo, { nome: "Ainda em preparo" });
  const handle = c.escopo.perfil.handle;

  await page.goto(`/@${handle}/${outro.slug}`);
  await expect(page.getByText("Página não encontrada")).toBeVisible();
  await publicarProduto(c.escopo, outro.id, true);

  await page.goto(`/@${handle}`);
  await expect(page.getByRole("heading", { name: "Duda Ciências" })).toBeVisible();
  await expect(page.getByText("2 cursos")).toBeVisible();
  await expect(page.getByText("Uma assinatura libera todos os cursos")).toBeVisible();
  await expect(page.getByText("Ainda em preparo")).toHaveCount(0);
  await page.getByRole("link", { name: /Química do Dia a Dia/ }).click();
  await expect(page).toHaveURL(new RegExp(`/@${handle.replace(/\./g, "\\.")}/${outro.slug}$`));
  await expect(page.getByText("Reações")).toBeVisible();

  await page.goto(`/@${handle}/${rascunho.slug}`);
  await expect(page.getByText("Página não encontrada")).toBeVisible();
  // O endereço antigo do produto também leva ao novo.
  await page.goto(`/c/${handle}/${outro.slug}`);
  await page.waitForURL((u) => u.pathname === `/@${handle}/${outro.slug}`);
});

test("quem já assina vê as trilhas do produto como links", async ({ page }) => {
  const c = await criadorNoAr();
  const { email } = await novoFa(c.usuario.id);
  await entrarNoApp(page, email);
  await page.goto(`/@${c.escopo.perfil.handle}/${c.produto.slug}`);
  await expect(page.getByText("Você já tem acesso a este conteúdo.")).toBeVisible();
  await page.getByRole("link", { name: new RegExp(c.trilha.titulo) }).click();
  await expect(page).toHaveURL(new RegExp(`/trilhas/${c.trilha.id}$`));
});
