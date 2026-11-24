"use client";

import { Botao } from "@edu/ui";
import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[70dvh] place-items-center p-6 text-center">
      <div className="max-w-sm">
        <TriangleAlert className="mx-auto size-12 text-laranja" />
        <h1 className="mt-4 text-xl font-extrabold">Algo deu errado</h1>
        <p className="mt-1 text-sm text-suave">Não conseguimos carregar esta página agora. Tente de novo em instantes.</p>
        {error.digest && <p className="mt-2 font-mono text-[11px] text-suave">código: {error.digest}</p>}
        <Botao className="mt-6" onClick={reset}>
          Tentar de novo
        </Botao>
      </div>
    </main>
  );
}
