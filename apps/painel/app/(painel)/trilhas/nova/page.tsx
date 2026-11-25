import { listarProdutos } from "@edu/db";
import { redirect } from "next/navigation";
import { exigirCriador } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/** Endereço antigo: a trilha nova agora nasce dentro de um produto. Com um só produto, vai direto para ele. */
export default async function NovaTrilhaAntiga() {
  const e = await exigirCriador();
  const produtos = await listarProdutos(e);
  redirect(produtos.length === 1 ? `/produtos/${produtos[0].id}/trilhas/nova` : produtos.length ? "/produtos" : "/produtos/novo");
}
