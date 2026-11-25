import { tutorHabilitado } from "@edu/ai/tutor";
import { db, estadoIndiceTutor, exigirProdutoDoCriador, exigirTrilhaDoCriador, getEstudio } from "@edu/db";
import { notFound } from "next/navigation";
import { EstudioCriador } from "@/components/estudio/EstudioCriador";
import { exigirCriador, linkPublico } from "@/lib/sessao";

export const dynamic = "force-dynamic";
// As server actions herdam este limite; publicar também reindexa o Edu depois da resposta (after).
export const maxDuration = 120;

export default async function EstudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await exigirCriador();
  let produtoId: string;
  try {
    ({ produtoId } = await exigirTrilhaDoCriador(e, id));
  } catch {
    notFound();
  }
  const estado = await getEstudio(id);
  if (!estado) notFound();
  const [tutor, assinantes, produto] = await Promise.all([
    tutorHabilitado() ? estadoIndiceTutor(id) : Promise.resolve(undefined),
    db().from("assinaturas").select("id", { count: "exact", head: true }).eq("criador_id", e.usuario.id).in("status", ["cortesia", "ativa"]),
    exigirProdutoDoCriador(e, produtoId),
  ]);
  return (
    <EstudioCriador
      estado={estado}
      produto={{
        id: produto.id,
        nome: produto.nome,
        publicado: produto.status === "publicado" && e.perfil.pagina_status === "publicada",
        assinantes: assinantes.count ?? 0,
      }}
      usuario={{ id: e.usuario.id, nome: e.perfil.nome_publico }}
      linkPagina={linkPublico(e.perfil.handle)}
      tutor={tutor === undefined ? undefined : tutor && { status: tutor.status, trechos: tutor.trechos, indexado_em: tutor.indexado_em, erro: tutor.erro }}
    />
  );
}
