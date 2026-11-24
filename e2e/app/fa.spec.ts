import type { Bloco } from "@edu/core";
import { db, painelDoAluno } from "@edu/db";
import { aulasDaTrilha, criadorNoAr, emailUnico, novoCriador, novoFa, trilhaPronta } from "@edu/testing";
import { expect, type Page, test } from "@playwright/test";
import { entrarNoApp, SENHA } from "../apoio";

/** Conta de fã pelo e-mail (para conferir o que ficou no banco). */
async function faPorEmail(email: string) {
  const { data } = await db().from("users").select("id, role").eq("email", email).single();
  return data!;
}

test.describe("página do criador", () => {
  test("fã cria a conta pelo link com origem e cai no início com a trilha", async ({ page }) => {
    const c = await criadorNoAr({ nome: "Lia Finanças" });
    const email = emailUnico("e2e-fa");
    await page.goto(`/c/${c.escopo.perfil.handle}?origem=tiktok`);
    await expect(page.getByRole("heading", { name: c.escopo.produto.nome })).toBeVisible();

    await page.getByLabel("Seu nome completo").fill("Rafa Fã");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Crie uma senha").fill(SENHA);
    await page.getByLabel("Repita a senha").fill(SENHA);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Criar conta e começar" }).click();

    await expect(page).toHaveURL(/\/\?bemvindo=1$/);
    await expect(page.getByText("Tudo pronto!")).toBeVisible();
    await expect(page.getByText(c.trilha.titulo).first()).toBeVisible();

    const fa = await faPorEmail(email);
    expect(fa.role).toBe("aluno");
    const { data: ass } = await db().from("assinaturas").select("status, origem").eq("aluno_id", fa.id).single();
    expect(ass).toEqual({ status: "cortesia", origem: "tiktok" });
  });

  test("@ que não existe e página ainda em rascunho", async ({ page }) => {
    await page.goto("/c/ninguem.por.aqui.e2e");
    await expect(page.getByText("Página não encontrada")).toBeVisible();

    const rascunho = await novoCriador();
    await page.goto(`/c/${rascunho.escopo.perfil.handle}`);
    await expect(page.getByRole("heading", { name: "Em breve" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Criar conta e começar" })).toHaveCount(0);
  });

  test("fã logado assina outro criador com um clique", async ({ page }) => {
    const primeiro = await criadorNoAr({ nome: "Primeira Criadora" });
    const { email } = await novoFa(primeiro.escopo.produto.id);
    const segundo = await criadorNoAr({ nome: "Segundo Criador" });

    await entrarNoApp(page, email);
    await page.goto(`/c/${segundo.escopo.perfil.handle}?origem=youtube`);
    await page.getByRole("button", { name: "Começar agora" }).click();
    await expect(page).toHaveURL(/\/\?bemvindo=1$/);

    await page.goto("/criadores");
    await expect(page.getByText("Primeira Criadora")).toBeVisible();
    await expect(page.getByText("Segundo Criador")).toBeVisible();

    // Já assina: a página do criador leva de volta ao início.
    await page.goto(`/c/${segundo.escopo.perfil.handle}`);
    await expect(page.getByText("Você já tem acesso a este conteúdo.")).toBeVisible();
  });
});

/** Joga a aula aberta no player, acertando cada desafio a partir do conteúdo publicado. */
async function jogarAula(page: Page, blocos: Bloco[]) {
  const acao = page.getByRole("button", { name: /^(Continuar|Concluir aula|Verificar)$/ });
  for (const bloco of blocos) {
    if (bloco.tipo === "quiz") {
      const certa = bloco.opcoes.find((o) => o.correta)!.texto;
      await page.getByRole("button", { name: certa, exact: true }).last().click();
      await expect(page.getByText("Mandou bem!")).toBeVisible();
    } else if (bloco.tipo === "completar") {
      for (const lacuna of bloco.lacunas) await page.getByRole("button", { name: lacuna.resposta, exact: true }).last().click();
      await acao.click(); // Verificar
      await expect(page.getByText("Mandou bem!")).toBeVisible();
    } else if (bloco.tipo !== "texto") {
      throw new Error(`O teste não sabe jogar o bloco ${bloco.tipo}.`);
    }
    await acao.click(); // Continuar / Concluir aula
  }
}

test("aula do começo ao fim: acertos, XP e a próxima aula liberada", async ({ page }) => {
  const c = await criadorNoAr();
  const { usuario, email } = await novoFa(c.escopo.produto.id);
  const [primeira] = await aulasDaTrilha(c.trilha.id);
  const { data: linhas } = await db().from("aula_blocos").select("tipo, conteudo").eq("aula_id", primeira.id).order("ordem");
  const blocos = (linhas ?? []).map((l) => ({ ...(l.conteudo as object), tipo: l.tipo }) as Bloco);

  await entrarNoApp(page, email);
  await page.goto(`/trilhas/${c.trilha.id}`);
  await expect(page.getByText("Uma trilha de")).toBeVisible();
  await page.locator(`a[href="/aula/${primeira.id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/aula/${primeira.id}$`));

  await jogarAula(page, blocos);
  await expect(page.getByRole("link", { name: "Próxima aula" })).toBeVisible();

  const painel = await painelDoAluno(usuario.id);
  expect(painel.xpTotal).toBeGreaterThan(0);
  const { data: conclusao } = await db().from("aula_conclusoes").select("acertos, total").eq("user_id", usuario.id).eq("aula_id", primeira.id).single();
  expect(conclusao?.acertos).toBe(conclusao?.total);
});

test("trilha nova publicada chega como notificação e abre a trilha", async ({ page }) => {
  const c = await criadorNoAr();
  const { email } = await novoFa(c.escopo.produto.id);
  const nova = await trilhaPronta(c.escopo, { titulo: "Segunda trilha do criador" });

  await entrarNoApp(page, email);
  await expect(page.getByRole("link", { name: "Notificações" })).toContainText("1");
  await page.getByRole("link", { name: "Notificações" }).click();
  await page.getByText("Trilha nova liberada!").click();
  await expect(page).toHaveURL(new RegExp(`/trilhas/${nova.id}$`));
  await expect(page.getByRole("heading", { name: "Segunda trilha do criador" })).toBeVisible();
});

test("fã não abre trilha nem aula de criador que não assina", async ({ page }) => {
  const meu = await criadorNoAr({ nome: "Criador Assinado" });
  const outro = await criadorNoAr({ nome: "Criador Alheio" });
  const { email } = await novoFa(meu.escopo.produto.id);
  const [aulaAlheia] = await aulasDaTrilha(outro.trilha.id);

  await entrarNoApp(page, email);
  await page.goto(`/trilhas/${outro.trilha.id}`);
  await expect(page.getByText("Página não encontrada")).toBeVisible();
  await page.goto(`/aula/${aulaAlheia.id}`);
  await expect(page.getByText("Página não encontrada")).toBeVisible();
});
