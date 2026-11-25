import { criadorNoAr, novoFa } from "@edu/testing";
import { expect, test } from "@playwright/test";
import { entrarNoApp, linkDoEmail, SENHA } from "../apoio";

test("login do fã: senha errada, página protegida com volta e sair", async ({ page }) => {
  const c = await criadorNoAr();
  const { email } = await novoFa(c.usuario.id);

  await page.goto("/progresso");
  await expect(page).toHaveURL(/\/login\?next=%2Fprogresso/);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("SenhaErrada123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();

  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/progresso$/);

  await page.goto("/perfil");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("conta de criador não entra no app do fã", async ({ page }) => {
  const c = await criadorNoAr();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(c.email);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});

test("redefinição de senha pelo e-mail no app", async ({ page }) => {
  const c = await criadorNoAr();
  const { email } = await novoFa(c.usuario.id);
  await page.goto("/login");
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  // O Supabase Auth envia o e-mail antes de responder; o primeiro envio ao SMTP local pode demorar.
  await expect(page.getByText("Se houver uma conta com este e-mail")).toBeVisible({ timeout: 30_000 });

  await page.goto(await linkDoEmail(email));
  await expect(page).toHaveURL(/\/redefinir-senha/);
  const nova = "NovaSenhaFa789";
  await page.getByLabel("Nova senha").fill(nova);
  await page.getByLabel("Repita a senha").fill(nova);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  // Com um criador só, a entrada do app leva direto ao app dele.
  await page.waitForURL((u) => u.pathname === `/@${c.escopo.perfil.handle}`);

  await page.goto("/perfil");
  await page.getByRole("button", { name: "Sair" }).click();
  await entrarNoApp(page, email, nova);
});
