import { db, produtoDaTrilha, talvez } from "@edu/db";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Endereço antigo da aula: leva à aula dentro do produto (/@criador/<produto>/aula/<id>). */
export default async function AulaAntiga({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aula = /^[0-9a-f-]{36}$/i.test(id) ? talvez(await db().from("aulas").select("trilha_id").eq("id", id).maybeSingle(), "aula") : null;
  const marca = aula ? await produtoDaTrilha(aula.trilha_id) : null;
  if (!marca) notFound();
  redirect(`/@${marca.handle}/${marca.produto.slug}/aula/${id}`);
}
