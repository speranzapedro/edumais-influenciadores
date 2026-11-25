import { Cartao } from "@edu/ui";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { exigirCriador } from "@/lib/sessao";
import { novoProduto } from "../actions";
import { FormProduto } from "../FormProduto";

export const dynamic = "force-dynamic";

export default async function NovoProdutoPage() {
  const e = await exigirCriador();
  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <Link href="/produtos" className="inline-flex items-center gap-1 text-sm text-suave hover:text-tinta">
        <ChevronLeft className="size-4" /> Produtos
      </Link>
      <h1 className="mt-4 text-[26px] font-extrabold tracking-tight">Novo produto</h1>
      <p className="text-sm text-suave">Dê um nome e um endereço ao seu curso. Depois você cria as trilhas dele com o Edu e publica quando estiver pronto.</p>
      <Cartao className="mt-6 p-6">
        <FormProduto acao={novoProduto} handle={e.perfil.handle} botao="Criar produto" />
      </Cartao>
    </div>
  );
}
