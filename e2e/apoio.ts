import { ehLocal } from "@edu/testing/ambiente";
import { expect, type Page } from "@playwright/test";

/** Chave do link secreto de cadastro de criadores, só dos testes. */
export const CHAVE_CADASTRO = "e2e-chave-de-cadastro-0123456789";

/** Mesma senha das fábricas de @edu/testing. */
export const SENHA = "Senha123forte";

/** Entra no painel pela tela de login. */
export async function entrarNoPainel(page: Page, email: string, senha = SENHA) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Endereço do Mailpit do Supabase local (e-mails do Auth). */
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

/**
 * Espera o e-mail mais recente para `para` no Mailpit e devolve o primeiro link do Supabase Auth
 * (`/auth/v1/verify`) que ele traz.
 */
export async function linkDoEmail(para: string, tentativas = 30): Promise<string> {
  if (!ehLocal(MAILPIT)) throw new Error("O Mailpit precisa ser local.");
  for (let i = 0; i < tentativas; i++) {
    const busca = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${para}"`)}`);
    if (busca.ok) {
      const { messages } = (await busca.json()) as { messages?: { ID: string }[] };
      if (messages?.length) {
        const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as { HTML?: string; Text?: string };
        const corpo = `${msg.HTML ?? ""} ${msg.Text ?? ""}`.replace(/&amp;/g, "&");
        const link = corpo.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]*/)?.[0];
        if (link) return link;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Nenhum e-mail com link de verificação chegou para ${para}.`);
}
