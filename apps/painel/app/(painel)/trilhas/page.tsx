import { trilhasDoCriador } from "@edu/db";
import { Cartao, classesBotao, Icone, Pill, TileIcone, tomDe } from "@edu/ui";
import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { Topo } from "@/components/Topo";
import { haQuanto } from "@/lib/formato";
import { exigirCriador } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const ETAPAS = ["ementa", "cards", "aulas"] as const;

export default async function TrilhasPage() {
  const e = await exigirCriador();
  const trilhas = await trilhasDoCriador(e);
  return (
    <>
      <Topo
        titulo="Trilhas"
        subtitulo={`As trilhas de ${e.produto.nome}. O aluno que assina vê todas as publicadas.`}
        acoes={
          <Link href="/trilhas/nova" className={classesBotao("primario", "md")}>
            <Plus className="size-4" /> Nova trilha
          </Link>
        }
      />
      <div className="px-8 pb-10 pt-4">
        {trilhas.length === 0 ? (
          <Cartao className="p-10 text-center">
            <div className="gradiente-marca mx-auto grid size-14 place-items-center rounded-3xl text-white shadow-flutuante">
              <Sparkles className="size-7" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold">Crie uma trilha com o Edu</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-suave">
              Envie o que você já produz (roteiros, transcrições, posts, e-books em PDF, DOCX, TXT ou MD) e o Edu propõe a ementa, os conceitos e as aulas. Você
              revisa tudo antes de publicar.
            </p>
            <Link href="/trilhas/nova" className={`${classesBotao("primario", "lg")} mt-6`}>
              Nova trilha
            </Link>
          </Cartao>
        ) : (
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
        )}
      </div>
    </>
  );
}
