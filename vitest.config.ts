import { defineConfig } from "vitest/config";

/**
 * Projetos de teste:
 *   unit        — lógica pura, sem banco nem rede (rápido, roda em todo commit)
 *   dom         — componentes React no jsdom (Testing Library)
 *   integracao  — @edu/db contra o Supabase local (`supabase start`), em série
 */
export default defineConfig({
  // Uma cópia só do React para os componentes dos pacotes e a Testing Library.
  resolve: { dedupe: ["react", "react-dom"] },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/*/src/**/*.test.ts", "apps/*/**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/.next/**", "**/*.int.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "dom",
          include: ["packages/*/src/**/*.test.tsx", "apps/*/**/*.test.tsx"],
          exclude: ["**/node_modules/**", "**/.next/**"],
          environment: "jsdom",
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["packages/core/src/**", "packages/ai/src/**", "packages/ui/src/**"],
      exclude: ["**/*.test.*", "**/index.ts", "**/teste/**"],
      reporter: ["text-summary", "html", "json-summary"],
      // Mínimos por pacote: o CI falha se a cobertura cair abaixo disso.
      thresholds: {
        "packages/core/src/**": { lines: 80 },
        "packages/ai/src/**": { lines: 80 },
        "packages/ui/src/**": { lines: 80 },
      },
    },
  },
});
