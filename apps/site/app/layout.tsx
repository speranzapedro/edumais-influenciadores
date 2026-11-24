import type { Metadata, Viewport } from "next";
import { DM_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ScrollSuave } from "@/components/motion/ScrollSuave";
import { urlDoSite } from "@/lib/url";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"] });
const mono = DM_Mono({ subsets: ["latin"], variable: "--font-dm-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(urlDoSite()),
  title: "Edu+ · Transforme sua audiência em alunos",
  description:
    "Para criadores de conteúdo: coproduza com a Edu+ o seu próprio curso gamificado, de microaulas no celular. Você define o preço, fica com 70% de cada venda e não precisa de exclusividade.",
  applicationName: "Edu+",
};

export const viewport: Viewport = { themeColor: "#6c5ce7", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Marca o documento antes da pintura para os elementos animados não piscarem. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: script fixo do próprio site, sem dado externo */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js-motion')" }} />
      </head>
      <body className="min-h-dvh bg-fundo antialiased">
        <ScrollSuave>{children}</ScrollSuave>
      </body>
    </html>
  );
}
