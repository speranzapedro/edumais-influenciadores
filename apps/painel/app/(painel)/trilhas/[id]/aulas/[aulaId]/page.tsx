import { aulaNaPrevia, ErroPermissao, previaDaTrilha } from "@edu/db";
import { classesBotao } from "@edu/ui";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Celular } from "@/components/previa/Celular";
import { ListaAulas } from "@/components/previa/ListaAulas";
import { PreviaAula } from "@/components/previa/PreviaAula";
import { Topo } from "@/components/Topo";
import { exigirCriador } from "@/lib/sessao";

export const dynamic = "force-dynamic";
// A pergunta aberta usa a rota ./aberta; as correções são server actions curtas.
export const maxDuration = 60;

/** Prévia de uma aula publicada no player do app do aluno (nada é salvo). */
export default async function AulaNaPreviaPage({ params }: { params: Promise<{ id: string; aulaId: string }> }) {
  const { id, aulaId } = await params;
  const e = await exigirCriador();
  let dados: [Awaited<ReturnType<typeof previaDaTrilha>>, Awaited<ReturnType<typeof aulaNaPrevia>>];
  try {
    dados = await Promise.all([previaDaTrilha(e, id), aulaNaPrevia(e, id, aulaId)]);
  } catch (err) {
    if (err instanceof ErroPermissao) notFound();
    throw err;
  }
  const [{ trilha, modulos }, a] = dados;
  if (trilha.status !== "publicada") redirect(`/trilhas/${id}/editar`);

  return (
    <div className="pb-12">
      <Topo
        titulo={`Aula ${a.posicao}: ${a.aula.titulo}`}
        subtitulo={
          <>
            Prévia como o aluno vê ·{" "}
            <Link href={`/trilhas/${id}`} className="font-semibold text-marca-700 hover:underline">
              {trilha.titulo}
            </Link>
          </>
        }
        acoes={
          <>
            <Link href={`/trilhas/${id}`} className={classesBotao("contorno", "md")}>
              <ArrowLeft className="size-4" /> Trilha
            </Link>
            <Link href={`/trilhas/${id}/editar`} className={classesBotao("primario", "md")}>
              <Pencil className="size-4" /> Editar
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-8 px-8 pt-4 lg:flex-row lg:items-start">
        <div className="lg:sticky lg:top-6">
          <Celular>
            <PreviaAula
              key={a.aula.id}
              trilha={a.aula.trilha}
              aula={{ id: a.aula.id, titulo: a.aula.titulo, objetivo: a.aula.objetivo }}
              blocos={a.blocos}
              posicao={a.posicao}
              totalAulas={a.totalAulas}
              proxima={a.proxima}
            />
          </Celular>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-suave">
            <Eye className="size-3.5" /> Prévia: suas respostas não são salvas.
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <ListaAulas modulos={modulos} hrefAula={(x) => `/trilhas/${id}/aulas/${x}`} atual={aulaId} />
        </div>
      </div>
    </div>
  );
}
