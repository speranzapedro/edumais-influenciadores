import { db } from "@edu/db";
import { criadorNoAr, novoCriador, novoFa, recarregar, trilhaPronta } from "@edu/testing";
import { expect, test } from "@playwright/test";
import { entrarNoPainel } from "../apoio";

test("perfil e produto: salvar e publicar a página", async ({ page }) => {
  const c = await novoCriador();
  await entrarNoPainel(page, c.email);
  await page.goto("/perfil");

  await page.getByLabel("Sobre você").fill("Ensino finanças pessoais sem complicação.");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible();

  await page.getByLabel("Nome do produto").fill("Finanças sem Mistério");
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(page.getByText("Produto salvo.")).toBeVisible();

  // Sem trilha publicada, a página não abre para os fãs.
  await page.getByRole("button", { name: "Publicar minha página" }).click();
  await expect(page.getByText("Publique pelo menos uma trilha antes de abrir sua página")).toBeVisible();

  await trilhaPronta(c.escopo);
  await page.reload();
  await page.getByRole("button", { name: "Publicar minha página" }).click();
  await expect(page.getByText("Página publicada!")).toBeVisible();

  const produto = (await recarregar(c)).escopo.produto;
  expect(produto).toMatchObject({ nome: "Finanças sem Mistério", status: "publicado" });

  await page.goto("/divulgar");
  await expect(page.getByText(`/c/${c.escopo.perfil.handle}`).first()).toBeVisible();
});

test("primeira trilha: tour do estúdio, depois o formulário e o estúdio", async ({ page }) => {
  const c = await novoCriador();
  await entrarNoPainel(page, c.email);
  await page.goto("/trilhas/nova");

  // Na primeira vez, o tour com a trilha de exemplo vem antes (nada ali é salvo).
  await expect(page).toHaveURL(/\/trilhas\/tour/);
  await page.getByRole("dialog").getByRole("button", { name: "Pular tour" }).click();
  await expect(page).toHaveURL(/\/trilhas\/nova$/);

  await page.locator('input[name="titulo"]').fill("Orçamento do zero");
  await page.locator('textarea[name="objetivo"]').fill("Ao final, o aluno monta o próprio orçamento mensal e separa uma reserva de emergência.");
  await page.getByRole("button", { name: "Criar e abrir o estúdio" }).click();

  await expect(page).toHaveURL(/\/trilhas\/[0-9a-f-]{36}\/editar$/);
  await expect(page.getByText("Orçamento do zero").first()).toBeVisible();

  // O tour não volta na segunda trilha.
  await page.goto("/trilhas/nova");
  await expect(page).toHaveURL(/\/trilhas\/nova$/);
});

test("publicar a trilha avisa os assinantes e mostra a prévia", async ({ page }) => {
  // A página só abre com uma trilha publicada; o fã entra antes da segunda trilha.
  const c = await criadorNoAr();
  const fa = await novoFa(c.escopo.produto.id, { origem: "instagram" });
  const trilha = await trilhaPronta(c.escopo, { titulo: "Investir com calma", publicar: false });

  await entrarNoPainel(page, c.email);
  await page.goto(`/trilhas/${trilha.id}/editar`);
  await page.getByRole("button", { name: "Publicar para os assinantes" }).click();
  await expect(page.getByText("Trilha publicada!")).toBeVisible();

  const { data: avisos } = await db().from("notificacoes").select("titulo, corpo, link").eq("user_id", fa.usuario.id);
  expect(avisos).toHaveLength(1);
  expect(avisos?.[0]).toMatchObject({ titulo: "Trilha nova liberada!", corpo: "Investir com calma", link: `/trilhas/${trilha.id}` });

  // Publicada, a trilha abre como o fã vê; a aula abre no player, sem gravar progresso.
  await page.goto(`/trilhas/${trilha.id}`);
  await expect(page.getByText("Uma trilha de")).toBeVisible();
  await page.locator(`a[href^="/trilhas/${trilha.id}/aulas/"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/trilhas/${trilha.id}/aulas/[0-9a-f-]{36}$`));
  await expect(page.getByText("Prévia como o aluno vê")).toBeVisible();
});

test("vendas e assinantes mostram a origem de cada assinatura", async ({ page }) => {
  const c = await criadorNoAr({ nome: "Caio Vendas" });
  await novoFa(c.escopo.produto.id, { origem: "instagram" });
  await novoFa(c.escopo.produto.id, { origem: "instagram" });
  await novoFa(c.escopo.produto.id, { origem: "tiktok" });

  await entrarNoPainel(page, c.email);
  await page.goto("/vendas");
  await expect(page.getByText("Instagram", { exact: true })).toBeVisible();
  await expect(page.getByText("TikTok", { exact: true })).toBeVisible();
  await expect(page.getByText("2 · 67%")).toBeVisible();

  await page.goto("/assinantes");
  await expect(page.getByText("3 pessoa(s) assinaram")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Fã de Teste" })).toHaveCount(3);
  await expect(page.getByRole("row").filter({ hasText: "TikTok" })).toHaveCount(1);
});

test("criador não abre a trilha de outro criador", async ({ page }) => {
  const outro = await criadorNoAr({ nome: "Outra Criadora" });
  const c = await novoCriador();
  await entrarNoPainel(page, c.email);
  // A página tem loading.tsx: o status já saiu (200) quando o notFound() acontece; vale o conteúdo.
  await page.goto(`/trilhas/${outro.trilha.id}`);
  await expect(page.getByText("Página não encontrada")).toBeVisible();
  await expect(page.getByText(outro.trilha.titulo)).toHaveCount(0);
  const api = await page.request.post(`/api/trilhas/${outro.trilha.id}/agente`, { data: { etapa: "ementa", modo: "geracao" } });
  expect(api.status()).toBe(404);
});
