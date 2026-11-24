import { RastreadorNavegacao } from "@edu/ui";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Edu+ · Criador",
  description: "Transforme o seu conteúdo em uma trilha gamificada com o Edu, venda para a sua audiência e acompanhe as vendas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={jakarta.variable}>
      <body className="min-h-dvh bg-fundo antialiased">
        <RastreadorNavegacao />
        {children}
      </body>
    </html>
  );
}
