import { limparOrigem } from "@edu/core";
import { faTemAcesso, produtoPorHandleESlug, urlDaMarca } from "@edu/db";
import { usuarioDaSessao } from "@edu/db/next";
import { Cartao, Icone, Marca, TileIcone, tomDe } from "@edu/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { corDoTema, EstiloMarca } from "@/components/EstiloMarca";
import { MarcaDoProduto } from "@/components/MarcaDoProduto";
import { BlocoEntrada, FotoCriador } from "../BlocoEntrada";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string; produto: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle, produto } = await params;
  const r = await produtoPorHandleESlug(handle, produto);
  if (!r) return { title: "Edu+" };
  const logo = r.produto.logo_path ? urlDaMarca(r.produto.logo_path) : null;
  return {
    title: `${r.produto.nome} · ${r.criador.nome} · Edu+`,
    description: r.produto.descricao ?? `Aprenda com ${r.criador.nome} em microaulas gamificadas no Edu+.`,
    applicationName: r.produto.nome,
    appleWebApp: { capable: true, title: r.produto.nome, statusBarStyle: "default" },
    manifest: `/c/${r.criador.handle}/${r.produto.slug}/manifest.webmanifest`,
    ...(logo ? { icons: { icon: logo, apple: logo } } : {}),
    openGraph: { title: r.produto.nome, description: r.produto.descricao ?? undefined, images: logo ? [logo] : undefined },
  };
}

export async function generateViewport({ params }: Params): Promise<Viewport> {
  const { handle, produto } = await params;
  const r = await produtoPorHandleESlug(handle, produto);
  return { themeColor: corDoTema(r?.produto.cor_primaria, r?.produto.cor_destaque) };
}

/** Página de um produto (/@criador/<produto>), com a marca dele. Entrar por aqui assina o criador. */
export default async function PaginaDoProduto({ params, searchParams }: Params & { searchParams: Promise<{ origem?: string }> }) {
  const [{ handle, produto: slug }, sp] = await Promise.all([params, searchParams]);
  const r = await produtoPorHandleESlug(handle, slug);
  if (!r) notFound();
  const { criador, produto } = r;
  const origem = limparOrigem(sp.origem);
  const base = `/@${criador.handle}/${produto.slug}`;
  const aluno = await usuarioDaSessao("app");
  const jaAssina = aluno ? await faTemAcesso(aluno.id, criador.id) : false;
  const totalAulas = produto.trilhas.reduce((s, t) => s + t.totalAulas, 0);
  const logo = produto.logo_path ? urlDaMarca(produto.logo_path) : null;

  return (
    <main className="mx-auto min-h-dvh max-w-[440px] bg-fundo pb-10">
      <EstiloMarca primaria={produto.cor_primaria} destaque={produto.cor_destaque} />
      <div className="gradiente-marca relative overflow-hidden rounded-b-[32px] px-5 pb-8 pt-6 text-white">
        <div className="pointer-events-none absolute -right-12 -top-10 size-44 rounded-full bg-white/10" />
        <Link href={`/@${criador.handle}${origem ? `?origem=${origem}` : ""}`} className="inline-flex items-center gap-1 text-sm text-white/80">
          <ChevronLeft className="size-4" /> @{criador.handle}
        </Link>
        <div className="mt-4 flex flex-col items-center text-center">
          <MarcaDoProduto produto={produto} logo={logo} className="size-20 text-3xl shadow-flutuante" />
          <h1 className="mt-4 text-[26px] font-extrabold leading-tight tracking-tight">{produto.nome}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-white/85">
            <FotoCriador criador={{ id: criador.id, nome: criador.nome, foto_url: criador.foto_url }} tamanho={24} />
            com {criador.nome}
          </div>
        </div>
      </div>

      <div className="px-5">
        {produto.descricao && <Cartao className="mt-6 p-5 text-sm font-semibold leading-relaxed text-tinta">{produto.descricao}</Cartao>}

        {produto.trilhas.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-base font-bold">
              {produto.trilhas.length} {produto.trilhas.length === 1 ? "trilha" : "trilhas"} · {totalAulas} aulas
            </h2>
            <div className="space-y-2.5">
              {produto.trilhas.map((t) =>
                jaAssina ? (
                  <Link key={t.id} href={`/trilhas/${t.id}`} className="block">
                    <CartaoTrilha trilha={t} seta />
                  </Link>
                ) : (
                  <CartaoTrilha key={t.id} trilha={t} />
                ),
              )}
            </div>
          </section>
        )}

        <div className="mt-6">
          <BlocoEntrada
            aluno={aluno}
            jaAssina={jaAssina}
            entrada={{ handle: criador.handle, origem, produto: { id: produto.id, slug: produto.slug } }}
            proximo={`${base}${origem ? `?origem=${origem}` : ""}`}
          />
        </div>
        <div className="mt-8 flex justify-center opacity-70">
          <Marca />
        </div>
      </div>
    </main>
  );
}

function CartaoTrilha({
  trilha: t,
  seta = false,
}: {
  trilha: { titulo: string; descricao: string | null; cor: string; icone: string; totalAulas: number };
  seta?: boolean;
}) {
  return (
    <Cartao className="flex items-center gap-3 p-3.5">
      <TileIcone tom={tomDe(t.cor)}>
        <Icone nome={t.icone} />
      </TileIcone>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{t.titulo}</div>
        <div className="truncate text-xs text-suave">{t.descricao ?? `${t.totalAulas} aulas`}</div>
      </div>
      {seta && <ChevronRight className="size-4 shrink-0 text-suave" />}
    </Cartao>
  );
}
