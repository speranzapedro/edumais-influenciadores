import { trilhasDoCriador } from "@edu/db";
import { Cartao, classesBotao } from "@edu/ui";
import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { ListaTrilhas } from "@/components/ListaTrilhas";
import { CabecalhoProduto, carregarProduto } from "./cabecalho";

export const dynamic = "force-dynamic";

/** Aba Trilhas do produto. */
export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { e, produto } = await carregarProduto(id);
  const trilhas = await trilhasDoCriador(e, { produtoId: produto.id });
  const nova = `/produtos/${produto.id}/trilhas/nova`;
  return (
    <>
      <CabecalhoProduto e={e} produto={produto} ativa={`/produtos/${produto.id}`} totalTrilhas={trilhas.length} />
      <div className="px-8 pb-10 pt-6">
        {trilhas.length === 0 ? (
          <Cartao className="p-10 text-center">
            <div className="gradiente-marca mx-auto grid size-14 place-items-center rounded-3xl text-white shadow-flutuante">
              <Sparkles className="size-7" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold">Crie a primeira trilha deste produto com o Edu</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-suave">
              Envie o que você já produz (roteiros, transcrições, posts, e-books em PDF, DOCX, TXT ou MD) e o Edu propõe a ementa, os conceitos e as aulas. Você
              revisa tudo antes de publicar.
            </p>
            <Link href={nova} className={`${classesBotao("primario", "lg")} mt-6`}>
              Nova trilha
            </Link>
          </Cartao>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm text-suave">Quem assina a sua página vê as trilhas publicadas deste produto quando ele estiver publicado.</p>
              <Link href={nova} className={classesBotao("primario", "md")}>
                <Plus className="size-4" /> Nova trilha
              </Link>
            </div>
            <ListaTrilhas trilhas={trilhas} />
          </>
        )}
      </div>
    </>
  );
}
