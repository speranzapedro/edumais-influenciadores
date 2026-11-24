import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// As variáveis ficam num único .env.local na raiz do monorepo (modelo em .env.example). Na Vercel,
// vêm das variáveis do projeto.
loadEnvConfig(resolve(process.cwd(), "../.."), process.env.NODE_ENV !== "production", console, true);

const config: NextConfig = {
  transpilePackages: ["@edu/ui", "@edu/core", "@edu/db", "@edu/ai", "@edu/aula-ui"],
  images: { remotePatterns: [{ hostname: "api.dicebear.com" }] },
};

export default config;
