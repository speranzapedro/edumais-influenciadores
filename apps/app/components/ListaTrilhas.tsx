import type { TrilhaResumo } from "@edu/db";
import { AnelProgresso, Cartao, HEX_TOM, Icone, Pill, TileIcone, tomDe } from "@edu/ui";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

/** Endereço da trilha dentro do app do criador: /@criador/<produto>/trilha/<id>. */
export const hrefTrilha = (t: Pick<TrilhaResumo, "id" | "criador" | "produto">) =>
  t.criador ? `/@${t.criador.handle}/${t.produto.slug}/trilha/${t.id}` : `/trilhas/${t.id}`;

export function ListaTrilhas({ trilhas }: { trilhas: TrilhaResumo[] }) {
  return (
    <div className="space-y-4">
      {trilhas.map((t) => {
        const tom = tomDe(t.cor);
        return (
          <Link key={t.id} href={hrefTrilha(t)} className="block">
            <Cartao className="p-4 transition hover:border-marca-200">
              <div className="flex items-start gap-3">
                <TileIcone tom={tom} tamanho="lg">
                  <Icone nome={t.icone} />
                </TileIcone>
                <div className="min-w-0 flex-1">
                  <div className="font-bold leading-snug">{t.titulo}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-suave">{t.descricao}</p>
                </div>
                <AnelProgresso valor={t.percentual} tamanho={52} espessura={6} cor={HEX_TOM[tom].forte} trilho={HEX_TOM[tom].fundo}>
                  <span className="text-[11px] font-bold">{t.percentual}%</span>
                </AnelProgresso>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-linha pt-3">
                <div className="flex gap-2">
                  <Pill tom="neutro">{t.totalAulas} aulas</Pill>
                  {t.percentual === 100 ? (
                    <Pill tom="verde">Concluída</Pill>
                  ) : t.concluidas > 0 ? (
                    <Pill tom="laranja">Em andamento</Pill>
                  ) : (
                    <Pill tom="lilas">Nova</Pill>
                  )}
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-marca-600">
                  {t.percentual === 100 ? "Revisar" : t.concluidas > 0 ? "Continuar" : "Começar"} <ChevronRight className="size-3.5" />
                </span>
              </div>
            </Cartao>
          </Link>
        );
      })}
    </div>
  );
}
