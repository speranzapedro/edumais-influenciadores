import { gerarTema } from "@edu/core";
import { type EscopoCriador, exigirProdutoDoCriador, type Produto } from "@edu/db";
import { Abas, Pill } from "@edu/ui";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notificacoes } from "@/components/Notificacoes";
import { exigirCriador } from "@/lib/sessao";
import { BotaoPublicarProduto } from "./BotaoPublicarProduto";

/** Criador logado e o produto da URL (404 se não for dele). */
export async function carregarProduto(id: string): Promise<{ e: EscopoCriador; produto: Produto }> {
  const e = await exigirCriador();
  try {
    return { e, produto: await exigirProdutoDoCriador(e, id) };
  } catch {
    notFound();
  }
}

/** Topo da página do produto: nome, status, publicar e as abas. */
export function CabecalhoProduto({ e, produto, ativa, totalTrilhas }: { e: EscopoCriador; produto: Produto; ativa: string; totalTrilhas?: number }) {
  const base = `/produtos/${produto.id}`;
  const publicado = produto.status === "publicado";
  return (
    <header className="px-8 pt-7 print:hidden">
      <div className="flex items-center justify-between gap-4">
        <Link href="/produtos" className="inline-flex items-center gap-1 text-sm text-suave hover:text-tinta">
          <ChevronLeft className="size-4" /> Produtos
        </Link>
        <Notificacoes />
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="grid size-14 shrink-0 place-items-center rounded-2xl text-xl font-extrabold text-white shadow-flutuante"
            style={{ background: gerarTema({ primaria: produto.cor_primaria }).corTema }}
            aria-hidden="true"
          >
            {produto.nome.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[26px] font-extrabold tracking-tight">{produto.nome}</h1>
              {publicado ? <Pill tom="verde">Publicado</Pill> : <Pill tom="ambar">Rascunho</Pill>}
            </div>
            <p className="text-sm text-suave">
              @{e.perfil.handle}/{produto.slug}
            </p>
          </div>
        </div>
        <BotaoPublicarProduto produtoId={produto.id} publicado={publicado} paginaPublicada={e.perfil.pagina_status === "publicada"} />
      </div>
      <Abas
        className="mt-5"
        rotulo="Seções do produto"
        ativa={ativa}
        itens={[
          { href: base, rotulo: "Trilhas", contagem: totalTrilhas },
          { href: `${base}/detalhes`, rotulo: "Detalhes" },
        ]}
      />
    </header>
  );
}
