import { tutorHabilitado } from "@edu/ai/tutor";
import { ErroPermissao, exigirTrilhaDoCriador, previaDaTrilha } from "@edu/db";
import { Cartao, classesBotao, Pill } from "@edu/ui";
import { ArrowLeft, BadgeDollarSign, Eye, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CaminhoPrevia } from "@/components/previa/CaminhoPrevia";
import { Celular } from "@/components/previa/Celular";
import { ListaAulas } from "@/components/previa/ListaAulas";
import { Topo } from "@/components/Topo";
import { exigirCriador } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const dataLonga = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

/** Visualização da trilha publicada como ela está no app do aluno. Editar leva ao estúdio. */
export default async function TrilhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await exigirCriador();
  let previa: Awaited<ReturnType<typeof previaDaTrilha>>;
  try {
    await exigirTrilhaDoCriador(e, id);
    previa = await previaDaTrilha(e, id);
  } catch (err) {
    if (err instanceof ErroPermissao) notFound();
    throw err;
  }
  const { trilha, modulos, totalAulas } = previa;
  // Rascunho não está no app: vai direto para o estúdio.
  if (trilha.status !== "publicada") redirect(`/trilhas/${id}/editar`);

  const hrefAula = (aulaId: string) => `/trilhas/${id}/aulas/${aulaId}`;
  const edu = tutorHabilitado() && trilha.tutor_ativo;

  return (
    <div className="pb-12">
      <Topo
        titulo={trilha.titulo}
        subtitulo={<>Como a trilha aparece no app do aluno · {e.produto.nome}</>}
        acoes={
          <>
            <Link href="/trilhas" className={classesBotao("contorno", "md")}>
              <ArrowLeft className="size-4" /> Trilhas
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
            <CaminhoPrevia
              trilha={trilha}
              modulos={modulos}
              totalAulas={totalAulas}
              criador={{ id: e.usuario.id, nome: e.perfil.nome_publico }}
              hrefAula={hrefAula}
            />
          </Celular>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-suave">
            <Eye className="size-3.5" /> Prévia: todas as aulas abrem e nada do que você responde é salvo.
          </p>
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <Cartao className="flex flex-wrap items-center gap-x-6 gap-y-3 p-5 text-sm">
            <div className="flex items-center gap-2">
              <Pill tom="verde">Publicada</Pill>
              {trilha.publicada_em && <span className="text-suave">desde {dataLonga(trilha.publicada_em)}</span>}
            </div>
            <div>
              <span className="font-bold">{modulos.length}</span> <span className="text-suave">{modulos.length === 1 ? "módulo" : "módulos"}</span>
              {" · "}
              <span className="font-bold">{totalAulas}</span> <span className="text-suave">{totalAulas === 1 ? "aula" : "aulas"}</span>
            </div>
            {tutorHabilitado() && (
              <div className="text-suave">
                Edu <span className="font-semibold text-tinta">{edu ? "ligado" : "desligado"}</span> nesta trilha
              </div>
            )}
            <Link href="/vendas" className="ml-auto inline-flex items-center gap-1.5 font-semibold text-marca-700 hover:underline">
              <BadgeDollarSign className="size-4" /> Conclusão em Vendas
            </Link>
          </Cartao>

          {totalAulas === 0 ? (
            <Cartao className="p-10 text-center text-sm text-suave">Esta trilha não tem aulas publicadas.</Cartao>
          ) : (
            <ListaAulas modulos={modulos} hrefAula={hrefAula} />
          )}
        </div>
      </div>
    </div>
  );
}
