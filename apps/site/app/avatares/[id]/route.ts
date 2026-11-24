import { avatarSvg, ehPersonagem, PERSONAGENS } from "@/lib/avatares";

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(PERSONAGENS).map((id) => ({ id }));
}

/** SVG de cada personagem, gerado uma vez no build e servido como imagem estática. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ehPersonagem(id)) return new Response("not found", { status: 404 });
  return new Response(avatarSvg(id), {
    headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=3600, s-maxage=86400" },
  });
}
