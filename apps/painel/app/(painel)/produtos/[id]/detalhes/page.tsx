import { db, ok } from "@edu/db";
import { Cartao } from "@edu/ui";
import { salvarDetalhes } from "../../actions";
import { FormProduto } from "../../FormProduto";
import { CabecalhoProduto, carregarProduto } from "../cabecalho";
import { ExcluirProduto } from "./ExcluirProduto";

export const dynamic = "force-dynamic";

/** Aba Detalhes: nome, endereço, descrição e excluir (só sem trilhas). */
export default async function DetalhesProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { e, produto } = await carregarProduto(id);
  const trilhas = ok(await db().from("trilhas").select("status").eq("produto_id", produto.id), "trilhas do produto");
  const temTrilhas = trilhas.length > 0;
  return (
    <>
      <CabecalhoProduto
        e={e}
        produto={produto}
        ativa={`/produtos/${produto.id}/detalhes`}
        totalTrilhas={trilhas.filter((t) => t.status !== "arquivada").length}
      />
      <div className="grid max-w-6xl gap-6 px-8 pb-10 pt-6 lg:grid-cols-[1.5fr_1fr]">
        <Cartao className="p-6">
          <h2 className="mb-4 font-extrabold">Detalhes</h2>
          <FormProduto
            acao={salvarDetalhes.bind(null, produto.id)}
            handle={e.perfil.handle}
            inicial={{ nome: produto.nome, slug: produto.slug, descricao: produto.descricao }}
            botao="Salvar"
            avisoEndereco
          />
        </Cartao>
        <Cartao className="h-fit p-6">
          <h2 className="mb-1 font-extrabold">Excluir produto</h2>
          <p className="mb-4 text-sm text-suave">
            {temTrilhas
              ? "Este produto tem trilhas (contando as arquivadas). Só dá para excluir um produto vazio; para tirá-lo da sua página, use “Tirar do ar”."
              : "O produto ainda não tem trilhas. Excluir não pode ser desfeito."}
          </p>
          <ExcluirProduto produtoId={produto.id} nome={produto.nome} bloqueado={temTrilhas} />
        </Cartao>
      </div>
    </>
  );
}
