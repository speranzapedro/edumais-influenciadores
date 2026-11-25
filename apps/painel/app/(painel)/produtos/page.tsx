import { resumoProdutos } from "@edu/db";
import { Cartao, classesBotao, Pill } from "@edu/ui";
import { ArrowDown, ArrowUp, Package, Plus } from "lucide-react";
import Link from "next/link";
import { Topo } from "@/components/Topo";
import { exigirCriador } from "@/lib/sessao";
import { MarcaProduto } from "./[id]/cabecalho";
import { moverProduto } from "./actions";

export const dynamic = "force-dynamic";

/** Produtos do criador: cada um agrupa trilhas e terá endereço, logo e cores próprios. */
export default async function ProdutosPage() {
  const e = await exigirCriador();
  const produtos = await resumoProdutos(e);
  return (
    <>
      <Topo
        titulo="Produtos"
        subtitulo="Cada produto reúne trilhas sobre um tema. Quem assina a sua página acessa todos os produtos publicados."
        acoes={
          <Link href="/produtos/novo" className={classesBotao("primario", "md")}>
            <Plus className="size-4" /> Novo produto
          </Link>
        }
      />
      <div className="px-8 pb-10 pt-4">
        {produtos.length === 0 ? (
          <Cartao className="p-10 text-center">
            <div className="gradiente-marca mx-auto grid size-14 place-items-center rounded-3xl text-white shadow-flutuante">
              <Package className="size-7" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold">Crie o seu primeiro produto</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-suave">
              Um produto é o seu curso no estilo Duolingo: um tema, um nome e as trilhas que o Edu ajuda você a montar. Você pode ter quantos quiser.
            </p>
            <Link href="/produtos/novo" className={`${classesBotao("primario", "lg")} mt-6`}>
              Novo produto
            </Link>
          </Cartao>
        ) : (
          <ol className="space-y-3" aria-label="Produtos na ordem da sua página">
            {produtos.map((p, i) => (
              <li key={p.id}>
                <Cartao className="flex items-center gap-4 p-4 sm:p-5">
                  <MarcaProduto produto={p} className="size-12 text-lg" />
                  <Link href={`/produtos/${p.id}`} className="min-w-0 flex-1 group">
                    <div className="truncate font-bold group-hover:text-marca-700">{p.nome}</div>
                    <div className="truncate text-xs text-suave">
                      @{e.perfil.handle}/{p.slug} · {p.totalTrilhas} {p.totalTrilhas === 1 ? "trilha" : "trilhas"} ({p.trilhasPublicadas}{" "}
                      {p.trilhasPublicadas === 1 ? "publicada" : "publicadas"})
                    </div>
                  </Link>
                  {p.status === "publicado" ? <Pill tom="verde">Publicado</Pill> : <Pill tom="ambar">Rascunho</Pill>}
                  {produtos.length > 1 && (
                    <div className="flex flex-col gap-1">
                      <form action={moverProduto.bind(null, p.id, -1)}>
                        <button
                          type="submit"
                          disabled={i === 0}
                          aria-label={`Subir ${p.nome}`}
                          className="grid size-7 place-items-center rounded-lg text-suave transition hover:bg-fundo hover:text-tinta disabled:opacity-30"
                        >
                          <ArrowUp className="size-4" />
                        </button>
                      </form>
                      <form action={moverProduto.bind(null, p.id, 1)}>
                        <button
                          type="submit"
                          disabled={i === produtos.length - 1}
                          aria-label={`Descer ${p.nome}`}
                          className="grid size-7 place-items-center rounded-lg text-suave transition hover:bg-fundo hover:text-tinta disabled:opacity-30"
                        >
                          <ArrowDown className="size-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </Cartao>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
