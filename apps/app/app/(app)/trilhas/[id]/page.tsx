import { produtoDaTrilha } from "@edu/db";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Endereço antigo da trilha (avisos e links antigos): leva ao endereço dentro do produto. */
export default async function TrilhaAntiga({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const marca = await produtoDaTrilha(id);
  if (!marca) notFound();
  redirect(`/@${marca.handle}/${marca.produto.slug}/trilha/${id}`);
}
