import { emailUnico, handleUnico, novoCriador } from "@edu/testing";
import { expect, test } from "@playwright/test";
import { CHAVE_CADASTRO, entrarNoPainel, linkDoEmail, SENHA } from "../apoio";

test.describe("cadastro pelo link secreto", () => {
  test("chave errada não abre o cadastro", async ({ page }) => {
    const resposta = await page.goto("/cadastro/chave-errada-0123456789abc");
    expect(resposta?.status()).toBe(404);
  });

  test("criador cria a conta e cai no perfil, já logado", async ({ page }) => {
    const email = emailUnico("e2e-cadastro");
    const handle = handleUnico("e2e");
    await page.goto(`/cadastro/${CHAVE_CADASTRO}`);
    await page.getByLabel("Seu nome").fill("Ana Criadora");
    await page.getByLabel("Seu @ nas redes").fill(`@${handle}`);
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Crie uma senha").fill(SENHA);
    await page.getByLabel("Repita a senha").fill(SENHA);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Criar minha conta" }).click();

    await expect(page).toHaveURL(/\/perfil\?bem-vindo=1/);
    await expect(page.getByLabel("Seu @ na Edu+")).toHaveValue(handle);
    await expect(page.getByLabel("Nome público")).toHaveValue("Ana Criadora");
  });

  test("e-mail já usado não cria outra conta", async ({ page }) => {
    const { email } = await novoCriador();
    await page.goto(`/cadastro/${CHAVE_CADASTRO}`);
    await page.getByLabel("Seu nome").fill("Outra Pessoa");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Crie uma senha").fill(SENHA);
    await page.getByLabel("Repita a senha").fill(SENHA);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page.getByText("Já existe uma conta com este e-mail")).toBeVisible();
    await expect(page).toHaveURL(/\/cadastro\//);
  });
});

test.describe("login", () => {
  test("senha errada mostra o erro sem dizer se o e-mail existe", async ({ page }) => {
    const { email } = await novoCriador();
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("SenhaErrada123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  });

  test("página protegida pede login e volta para ela depois", async ({ page }) => {
    const { email } = await novoCriador();
    await page.goto("/vendas");
    await expect(page).toHaveURL(/\/login\?next=%2Fvendas/);
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(SENHA);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/vendas$/);
    await expect(page.getByRole("heading", { name: "Vendas" })).toBeVisible();
  });

  test("sair encerra a sessão", async ({ page }) => {
    const { email } = await novoCriador();
    await entrarNoPainel(page, email);
    await page.getByTitle("Sair").click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});

test("redefinição de senha pelo e-mail", async ({ page }) => {
  const { email } = await novoCriador();
  await page.goto("/login");
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText("Se houver uma conta com este e-mail")).toBeVisible();

  // O link do e-mail passa pelo Supabase Auth e volta para /auth/confirmar, que abre a sessão.
  await page.goto(await linkDoEmail(email));
  await expect(page).toHaveURL(/\/redefinir-senha/);
  const nova = "NovaSenha456";
  await page.getByLabel("Nova senha").fill(nova);
  await page.getByLabel("Repita a senha").fill(nova);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL(/localhost:3006\/$/);

  await page.getByTitle("Sair").click();
  await entrarNoPainel(page, email, nova);
});

test("link de redefinição inválido pede um novo", async ({ page }) => {
  await page.goto("/auth/confirmar?code=invalido&next=/redefinir-senha");
  await expect(page).toHaveURL(/\/esqueci-senha\?erro=link/);
  await expect(page.getByText("O link expirou ou já foi usado.")).toBeVisible();
});
