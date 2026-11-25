import type { TrilhaDoCriador } from "@edu/db";
import { Cartao, Icone, Pill, TileIcone, tomDe } from "@edu/ui";
import Link from "next/link";
import { haQuanto } from "@/lib/formato";

const ETAPAS = ["ementa", "cards", "aulas"] as const;

/** Cartões das trilhas de um produto: publicada abre a prévia; rascunho abre o estúdio. */
export function ListaTrilhas({ trilhas }: { trilhas: TrilhaDoCriador[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {trilhas.map((t) => {
        const aprovadas = ETAPAS.filter((et) => t.etapas.find((x) => x.etapa === et)?.status === "aprovada").length;
        return (
          <Link key={t.id} href={t.status === "publicada" ? `/trilhas/${t.id}` : `/trilhas/${t.id}/editar`} className="group">
            <Cartao className="flex h-full flex-col p-5 transition group-hover:border-marca-200 group-hover:shadow-flutuante">
              <div className="flex items-start gap-3">
                <TileIcone tom={tomDe(t.cor)}>
                  <Icone nome={t.icone} />
                </TileIcone>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 font-bold leading-snug">{t.titulo}</div>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4 text-xs text-suave">
                <span>{t.status === "publicada" ? `${t.totalAulas} aulas` : `${aprovadas}/3 etapas aprovadas`}</span>
                {t.status === "publicada" ? <Pill tom="verde">Publicada</Pill> : <Pill tom="laranja">Rascunho · {haQuanto(t.updated_at)}</Pill>}
              </div>
            </Cartao>
          </Link>
        );
      })}
    </div>
  );
}
