import { db } from "@edu/db";
import { criadorNoAr, novoCriador, novoFa, recarregar, trilhaPronta } from "@edu/testing";
import { expect, test } from "@playwright/test";
import { entrarNoPainel } from "../apoio";

test("perfil: dados públicos, preço e publicação da página (que exige produto publicado)", async ({ page }) => {
  const c = await novoCriador();
  await entrarNoPainel(page, c.email);
  await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Perfil", exact: true })).toBeVisible();
  // O produto não é mais editado aqui.
  await expect(page.getByLabel("Nome do produto")).toHaveCount(0);

  await page.getByLabel("Sobre você").fill("Ensino finanças pessoais sem complicação.");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible();

  await page.getByLabel("Preço da assinatura (R$/mês)").fill("29,90");
  await page.getByRole("button", { name: "Salvar preço" }).click();
  await expect(page.getByText("Preço salvo.")).toBeVisible();

  // Sem produto publicado, a página não abre para os fãs.
  await page.getByRole("button", { name: "Publicar minha página" }).click();
  await expect(page.getByText("Publique pelo menos um produto")).toBeVisible();

  // Produto publicado (com trilha), a página abre.
  await trilhaPronta(c.escopo, { produtoId: c.produto.id });
  await page.goto(`/produtos/${c.produto.id}`);
  await page.getByRole("button", { name: "Publicar produto" }).click();
  await expect(page.getByText("Produto publicado!")).toBeVisible();
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Publicar minha página" }).click();
  await expect(page.getByText("Página publicada!")).toBeVisible();

  const r = await recarregar(c);
  expect(r.produto.status).toBe("publicado");
  expect(r.escopo.perfil).toMatchObject({ pagina_status: "publicada", preco_centavos: 2990 });

  await page.goto("/divulgar");
  await expect(page.getByText(`/@${c.escopo.perfil.handle}`).first()).toBeVisible();
  // Produto publicado ganha o próprio link.
  await expect(page.getByText(`/@${c.escopo.perfil.handle}/${c.produto.slug}`).first()).toBeVisible();
});

test("primeira trilha: tour do estúdio, depois o formulário do produto e o estúdio", async ({ page }) => {
  const c = await novoCriador();
  await entrarNoPainel(page, c.email);
  await page.goto(`/produtos/${c.produto.id}`);
  await page.getByRole("link", { name: "Nova trilha" }).click();

  // Na primeira vez, o tour com a trilha de exemplo vem antes (nada ali é salvo).
  await expect(page).toHaveURL(/\/trilhas\/tour/);
  await page.getByRole("dialog").getByRole("button", { name: "Pular tour" }).click();
  await expect(page).toHaveURL(new RegExp(`/produtos/${c.produto.id}/trilhas/nova$`));

  await page.locator('input[name="titulo"]').fill("Orçamento do zero");
  await page.locator('textarea[name="objetivo"]').fill("Ao final, o aluno monta o próprio orçamento mensal e separa uma reserva de emergência.");
  await page.getByRole("button", { name: "Criar e abrir o estúdio" }).click();

  await expect(page).toHaveURL(/\/trilhas\/[0-9a-f-]{36}\/editar$/);
  await expect(page.getByText("Orçamento do zero").first()).toBeVisible();
  const { data: trilha } = await db().from("trilhas").select("produto_id").eq("titulo", "Orçamento do zero").eq("criador_id", c.usuario.id).single();
  expect(trilha?.produto_id).toBe(c.produto.id);

  // O tour não volta na segunda trilha; o endereço antigo leva ao único produto.
  await page.goto("/trilhas/nova");
  await expect(page).toHaveURL(new RegExp(`/produtos/${c.produto.id}/trilhas/nova$`));
});

test("publicar a trilha avisa os assinantes e mostra a prévia", async ({ page }) => {
  // A página só abre com uma trilha publicada; o fã entra antes da segunda trilha.
  const c = await criadorNoAr();
  const fa = await novoFa(c.usuario.id, { origem: "instagram" });
  const trilha = await trilhaPronta(c.escopo, { titulo: "Investir com calma", publicar: false });

  await entrarNoPainel(page, c.email);
  await page.goto(`/trilhas/${trilha.id}/editar`);
  // Sem material enviado, o estúdio abre em Materiais; as etapas aprovadas liberam o passo Publicar.
  await page.getByRole("listitem").filter({ hasText: "Publicar" }).getByRole("button").first().click();
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
  await novoFa(c.usuario.id, { origem: "instagram" });
  await novoFa(c.usuario.id, { origem: "instagram" });
  await novoFa(c.usuario.id, { origem: "tiktok" });

  await entrarNoPainel(page, c.email);
  await page.goto("/vendas");
  await expect(page.getByText("Instagram", { exact: true })).toBeVisible();
  await expect(page.getByText("TikTok", { exact: true })).toBeVisible();
  await expect(page.getByText("2 · 67%")).toBeVisible();

  await page.goto("/assinantes");
  await expect(page.getByText("3 pessoa(s) assinam a sua página")).toBeVisible();
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
