import { defineConfig } from "vitest/config";

/**
 * Testes de integração do @edu/db contra o Supabase local (`pnpm db:iniciar`). Um arquivo por vez:
 * todos usam o mesmo banco e o `limparBanco` de um não pode correr no meio de outro.
 */
export default defineConfig({
  test: {
    name: "integracao",
    include: ["packages/*/test/**/*.int.test.ts"],
    environment: "node",
    globalSetup: ["packages/testing/src/ambiente.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      provider: "v8",
      include: ["packages/db/src/**"],
      // next.ts depende de cookies/headers do Next: entra nos testes E2E dos apps.
      exclude: ["**/index.ts", "packages/db/src/next.ts", "packages/db/src/database.types.ts"],
      reporter: ["text-summary", "html", "json-summary"],
      reportsDirectory: "coverage-integracao",
      thresholds: { lines: 75 },
    },
  },
});
