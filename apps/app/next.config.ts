import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// As variáveis ficam num único .env.local na raiz do monorepo (modelo em .env.example). Na Vercel,
// vêm das variáveis do projeto.
loadEnvConfig(resolve(process.cwd(), "../.."), process.env.NODE_ENV !== "production", console, true);

const config: NextConfig = {
  transpilePackages: ["@edu/ui", "@edu/core", "@edu/db", "@edu/ai", "@edu/aula-ui"],
  images: { remotePatterns: [{ hostname: "api.dicebear.com" }] },
  // Endereço público do criador: /@criador e /@criador/<produto>. Pasta com "@" no Next é rota paralela,
  // então as páginas moram em /c/[handle] e o /@ é reescrito para lá (antes das páginas).
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/@:handle", destination: "/c/:handle" },
        { source: "/@:handle/:produto", destination: "/c/:handle/:produto" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  // O endereço antigo /c/<criador> continua valendo, mas leva ao novo (links já divulgados).
  async redirects() {
    return [
      { source: "/c/:handle", destination: "/@:handle", permanent: true },
      { source: "/c/:handle/:produto", destination: "/@:handle/:produto", permanent: true },
    ];
  },
};

export default config;
