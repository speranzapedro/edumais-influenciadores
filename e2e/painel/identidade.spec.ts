import { db } from "@edu/db";
import { novoCriador } from "@edu/testing";
import { expect, test } from "@playwright/test";
import { entrarNoPainel } from "../apoio";

/** PNG 1×1 de verdade. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test("identidade visual: logo, paleta pronta, aviso de cor clara e prévia ao vivo", async ({ page }) => {
  const c = await novoCriador();
  await entrarNoPainel(page, c.email);
  await page.goto(`/produtos/${c.produto.id}`);
  await page.getByRole("link", { name: "Identidade visual" }).click();
  await expect(page).toHaveURL(new RegExp(`/produtos/${c.produto.id}/identidade$`));

  const previa = page.getByText("Prévia do app do fã").locator("xpath=following-sibling::div[1]");
  const corDaPrevia = () => previa.evaluate((el) => getComputedStyle(el).getPropertyValue("--color-marca-600").trim());

  // SVG não passa; arquivo que finge ser PNG é recusado pelo servidor.
  const logo = page.getByLabel("Logo do produto");
  await logo.setInputFiles({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  // (O Next tem um anunciador de rotas com role="alert": por isso o texto, e não o papel.)
  await expect(page.getByText("Envie uma imagem PNG, JPG ou WEBP.")).toBeVisible();
  await logo.setInputFiles({ name: "falso.png", mimeType: "image/png", buffer: Buffer.from("<script>alert(1)</script>") });
  await expect(page.getByText("O arquivo não é uma imagem PNG, JPG ou WEBP válida.")).toBeVisible();

  await logo.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("button", { name: /Trocar imagem/ })).toBeVisible();

  // Paleta pronta: a prévia muda na hora.
  await page.getByRole("radio", { name: /Oceano/ }).click();
  await expect.poll(corDaPrevia).toBe("#1d4ed8");

  // Cor principal clara demais: o sistema escurece e mostra antes → depois.
  await page.getByLabel("Cor principal", { exact: true }).fill("#FFE14D");
  await expect(page.getByText("Escurecemos um pouco a cor principal")).toBeVisible();
  await expect.poll(corDaPrevia).not.toBe("#ffe14d");

  await page.getByRole("radio", { name: /Oceano/ }).click();
  await page.getByRole("button", { name: "Salvar identidade" }).click();
  await expect(page.getByText("Identidade salva.")).toBeVisible();

  const { data } = await db().from("produtos").select("cor_primaria, cor_destaque, logo_path").eq("id", c.produto.id).single();
  expect(data).toMatchObject({ cor_primaria: "#1d4ed8", cor_destaque: "#06b6d4" });
  expect(data?.logo_path).toMatch(new RegExp(`^criadores/${c.usuario.id}/[0-9a-f-]{36}\\.png$`));

  // O logo aparece no topo do produto e na lista.
  await page.reload();
  await expect(page.locator(`header img[src*="${data?.logo_path}"]`)).toBeVisible();
});

test("foto do perfil é enviada e salva na hora", async ({ page }) => {
  const c = await novoCriador();
  await entrarNoPainel(page, c.email);
  await page.goto("/perfil");
  await page.getByLabel("Sua foto").setInputFiles({ name: "eu.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("button", { name: /Trocar imagem/ })).toBeVisible();
  const { data } = await db().from("criador_perfis").select("foto_url").eq("user_id", c.usuario.id).single();
  expect(data?.foto_url).toMatch(/\/storage\/v1\/object\/public\/marcas\/criadores\//);
});
