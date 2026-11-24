import { classesBotao } from "@edu/ui";
import { SearchX } from "lucide-react";
import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center bg-fundo p-6 text-center">
      <div className="max-w-sm">
        <SearchX className="mx-auto size-12 text-marca-400" />
        <h1 className="mt-4 text-xl font-extrabold">Página não encontrada</h1>
        <p className="mt-1 text-sm text-suave">O endereço não existe ou você não tem acesso a este conteúdo.</p>
        <Link href="/" className={`${classesBotao("primario", "md")} mt-6`}>
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
