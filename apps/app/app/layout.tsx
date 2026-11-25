import { COR_MARCA, RastreadorNavegacao } from "@edu/ui";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ProvedorAulaFa } from "@/components/ProvedorAulaFa";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Edu+",
  description: "As trilhas dos criadores que você acompanha, em microaulas gamificadas, com XP e ofensiva.",
  applicationName: "Edu+",
  appleWebApp: { capable: true, title: "Edu+", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: COR_MARCA, width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={jakarta.variable}>
      <body className="min-h-dvh bg-moldura antialiased">
        <RastreadorNavegacao />
        <ProvedorAulaFa>{children}</ProvedorAulaFa>
      </body>
    </html>
  );
}
