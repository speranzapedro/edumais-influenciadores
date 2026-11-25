import type { CriadorDoFa } from "@edu/db";
import { Avatar, Cartao } from "@edu/ui";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

/** Criador que o fã assina: foto, nome, @ e os produtos. Leva à página pública dele. */
export function CartaoCriador({ criador }: { criador: CriadorDoFa }) {
  return (
    <Link href={`/c/${criador.handle}`} className="block">
      <Cartao className="flex items-center gap-3 p-4 transition hover:border-marca-200">
        <Avatar nome={criador.nome} semente={criador.id} tamanho={48} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{criador.nome}</div>
          <div className="truncate text-xs text-suave">
            @{criador.handle}
            {criador.produtos.length > 0 && ` · ${criador.produtos.join(", ")}`}
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-suave" />
      </Cartao>
    </Link>
  );
}
