import { assinar, concluirAula, getUsuario } from "@edu/db";
import { aulasDaTrilha, criadorNoAr, novoFa, responderAula } from "@edu/testing";
import { expect, test } from "@playwright/test";
import { entrarNoApp } from "../apoio";

test("app isolado por criador: XP, ofensiva e menu de um criador não aparecem no outro", async ({ page }) => {
  const a = await criadorNoAr({ nome: "Ana Música" });
  const b = await criadorNoAr({ nome: "Beto Xadrez" });
  const { usuario, email } = await novoFa(a.usuario.id);
  await assinar({ aluno: usuario, criadorId: b.usuario.id });
  // Estuda uma aula com a Ana.
  const [aula] = await aulasDaTrilha(a.trilha.id);
  const fa = (await getUsuario(usuario.id))!;
  await concluirAula(fa, aula.id, await responderAula(fa, aula.id));

  await entrarNoApp(page, email);
  // Dois criadores: escolhe.
  await expect(page.getByText("Com quem você quer estudar agora?")).toBeVisible();
  await page.getByRole("link", { name: /Ana Música/ }).click();
  await page.waitForURL((u) => u.pathname === `/@${a.escopo.perfil.handle}`);
  // No app da Ana, só os cursos dela (as trilhas de teste têm o mesmo título; os produtos, não).
  await expect(page.getByText(a.produto.nome).first()).toBeVisible();
  await expect(page.getByText(b.produto.nome)).toHaveCount(0);

  // O menu fica dentro do app da Ana.
  await page.getByRole("link", { name: "Progresso" }).click();
  await page.waitForURL((u) => u.pathname === `/@${a.escopo.perfil.handle}/progresso`);
  await expect(page.getByText(/Nível \d+ · [1-9]\d* XP/)).toBeVisible();

  // No app do Beto o placar começa do zero (mesmo login).
  await page.goto(`/@${b.escopo.perfil.handle}/progresso`);
  await expect(page.getByText(/Nível \d+ · 0 XP/)).toBeVisible();
  await page.goto(`/@${b.escopo.perfil.handle}/trilhas`);
  await expect(page.getByText(b.produto.nome).first()).toBeVisible();
  await expect(page.getByText(a.produto.nome)).toHaveCount(0);
});

test("página interna do criador pede o login com a marca dele e volta para onde estava", async ({ page }) => {
  const c = await criadorNoAr({ nome: "Caio Fotografia" });
  const { email } = await novoFa(c.usuario.id);
  const handle = c.escopo.perfil.handle;

  await page.goto(`/@${handle}/progresso`);
  await page.waitForURL((u) => u.pathname === `/@${handle}/entrar`);
  await expect(page.getByText("nos cursos de Caio Fotografia")).toBeVisible();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("Senha123forte");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname === `/@${handle}/progresso`);

  // Endereços antigos levam para dentro do app do criador.
  await page.goto("/perfil");
  await page.waitForURL((u) => u.pathname === `/@${handle}/perfil`);
  await expect(page.getByText("Caio Fotografia")).toBeVisible();
});
