import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@edu/ui", "@edu/core", "@edu/aula-ui"],
  // Endereços da landing antiga (escolas, professores e a página de criadores) levam à home nova.
  async redirects() {
    return ["/influenciadores", "/professores", "/professor"].map((source) => ({ source, destination: "/", permanent: true }));
  },
};

export default config;
