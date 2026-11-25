import { COR_FUNDO, MIME_DA_EXTENSAO } from "@edu/core";
import { produtoPorHandleESlug, urlDaMarca } from "@edu/db";
import { corDoTema } from "@/components/EstiloMarca";

/** Manifesto do app instalado a partir da página do produto: nome, cor e logo do produto. */
export async function GET(_: Request, { params }: { params: Promise<{ handle: string; produto: string }> }) {
  const { handle, produto: slug } = await params;
  const r = await produtoPorHandleESlug(handle, slug);
  if (!r) return new Response("Não encontrado", { status: 404 });
  const { produto, criador } = r;
  const ext = produto.logo_path?.slice(produto.logo_path.lastIndexOf(".") + 1) as keyof typeof MIME_DA_EXTENSAO | undefined;
  const icons = produto.logo_path
    ? [{ src: urlDaMarca(produto.logo_path), sizes: "any", type: ext ? MIME_DA_EXTENSAO[ext] : undefined, purpose: "any" }]
    : [
        { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      ];
  return Response.json(
    {
      name: produto.nome,
      short_name: produto.nome.slice(0, 24),
      description: produto.descricao ?? `Aprenda com ${criador.nome} em microaulas.`,
      start_url: `/@${criador.handle}/${produto.slug}`,
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: COR_FUNDO,
      theme_color: corDoTema(produto.cor_primaria, produto.cor_destaque),
      lang: "pt-BR",
      icons,
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300" } },
  );
}
