import { COR_MARCA } from "@edu/ui";
import type { MetadataRoute } from "next";

/** PWA: o app do fã pode ser instalado na tela inicial do celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Edu+",
    short_name: "Edu+",
    description: "As trilhas dos criadores que você acompanha, em microaulas.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f5fb",
    theme_color: COR_MARCA,
    lang: "pt-BR",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
