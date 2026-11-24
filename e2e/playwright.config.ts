import { configurarAmbienteLocal } from "@edu/testing/ambiente";
import { defineConfig, devices } from "@playwright/test";
import { CHAVE_CADASTRO } from "./apoio";

/**
 * Testes de ponta a ponta contra o build de produção dos apps e o Supabase local. Rodam no CI (job
 * "E2E"). Localmente: `pnpm db:iniciar`, `pnpm build` e `pnpm e2e`.
 *
 * As variáveis abaixo valem para os servidores que o Playwright sobe (eles herdam o ambiente).
 */
configurarAmbienteLocal();
process.env.CRIADOR_CADASTRO_CHAVE = CHAVE_CADASTRO;
process.env.SESSAO_COOKIE_PREFIXO = "e2e";
process.env.TUTOR_HABILITADO = "false";
process.env.NEXT_PUBLIC_PAINEL_URL = "http://localhost:3006";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3007";

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: ".",
  // O banco é um só: os testes rodam em série e cada um cria os próprios dados.
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "painel",
      testDir: "painel",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3006" },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @edu/painel start",
      url: "http://localhost:3006/api/saude",
      reuseExistingServer: !CI,
      timeout: 120_000,
      stdout: "pipe",
    },
  ],
});
