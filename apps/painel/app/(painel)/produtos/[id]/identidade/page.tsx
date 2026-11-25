import { db, ok, urlDaMarca } from "@edu/db";
import { CabecalhoProduto, carregarProduto } from "../cabecalho";
import { FormIdentidade } from "./FormIdentidade";

export const dynamic = "force-dynamic";

/** Aba Identidade visual: logo e cores do produto, com a prévia do app do fã. */
export default async function IdentidadeProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { e, produto } = await carregarProduto(id);
  const trilhas = ok(await db().from("trilhas").select("id").eq("produto_id", produto.id).neq("status", "arquivada"), "trilhas do produto");
  return (
    <>
      <CabecalhoProduto e={e} produto={produto} ativa={`/produtos/${produto.id}/identidade`} totalTrilhas={trilhas.length} />
      <div className="px-8 pb-10 pt-6">
        <FormIdentidade
          produtoId={produto.id}
          nome={produto.nome}
          criador={e.perfil.nome_publico}
          inicial={{
            corPrimaria: produto.cor_primaria,
            corDestaque: produto.cor_destaque,
            logo: produto.logo_path ? { caminho: produto.logo_path, url: urlDaMarca(produto.logo_path) } : null,
          }}
        />
      </div>
    </>
  );
}
