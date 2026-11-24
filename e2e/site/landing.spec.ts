import { expect, test } from "@playwright/test";

test("home é a landing de criadores, com as seções e o contato pelo WhatsApp", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Edu+ · Transforme sua audiência em alunos");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Transforme");
  for (const id of ["por-que", "parceria", "responsabilidades", "como-funciona", "desafios", "faq", "contato"]) {
    await expect(page.locator(`section#${id}`)).toHaveCount(1);
  }
  const whatsapp = page.locator('a[href^="https://wa.me/"]');
  await expect(whatsapp).toHaveCount(1);
  expect(await whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/55\d{10,11}\?text=/);
  // Nada de escolas ou professores na página.
  await expect(page.getByText("Para escolas")).toHaveCount(0);
});

test("endereços antigos redirecionam para a home", async ({ request }) => {
  for (const antigo of ["/influenciadores", "/professores", "/professor"]) {
    const r = await request.get(antigo, { maxRedirects: 0 });
    expect(r.status(), antigo).toBe(308);
    expect(r.headers().location, antigo).toBe("/");
  }
});

test("SEO: robots, sitemap e imagem de compartilhamento", async ({ request }) => {
  expect((await request.get("/robots.txt")).status()).toBe(200);
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/experimente");
  const og = await request.get("/opengraph-image");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toBe("image/png");
});

test("experimente: a aula de demonstração roda no navegador", async ({ page }) => {
  await page.goto("/experimente");
  await expect(page.getByText("A queda da Bastilha")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("2/5")).toBeVisible();
});
