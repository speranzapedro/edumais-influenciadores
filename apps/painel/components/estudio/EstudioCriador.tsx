"use client";

import { TOUR_ESTUDIO } from "@edu/core";
import type { EstadoEstudio } from "@edu/db";
import { type ConfigEstudio, type EstadoTutor, Estudio } from "@edu/estudio";
import Link from "next/link";
import { useMemo } from "react";
import {
  alternarEdu,
  aplicarVisao,
  aprovar,
  desfazerEtapa,
  editarDados,
  excluirMaterial,
  reindexarTutor,
  revisarModulo,
  salvarEdicao,
  salvarOrientacao,
} from "@/app/(painel)/trilhas/[id]/actions";
import { concluirTourEstudio } from "@/app/(painel)/trilhas/tour/actions";
import { PainelPublicarCriador } from "./PainelPublicarCriador";

const CONFIG: ConfigEstudio = {
  acoes: {
    aprovar,
    desfazerEtapa,
    salvarEdicao,
    revisarModulo,
    aplicarVisao,
    salvarOrientacao,
    editarDados,
    excluirMaterial,
    alternarEdu,
    reindexarTutor,
    concluirTour: concluirTourEstudio,
  },
  rotas: {
    trilhas: "/produtos",
    estudio: (id) => `/trilhas/${id}/editar`,
    // Publicada: volta para a visualização da trilha (como está no app do aluno).
    voltar: (t) => (t.publicada ? `/trilhas/${t.id}` : "/produtos"),
    tour: (depois) => `/trilhas/tour?depois=${encodeURIComponent(depois)}`,
    depoisDoTour: "/produtos",
  },
  tour: TOUR_ESTUDIO,
};

/** Estúdio no painel do Edu+ Criador: a trilha pertence a um produto do criador (o voltar leva a ele). */
export function EstudioCriador({
  estado,
  produto,
  usuario,
  linkPagina,
  tutor,
  demo,
}: {
  estado: EstadoEstudio;
  produto: { id?: string; nome: string; publicado: boolean; assinantes: number };
  usuario: { id: string; nome: string };
  linkPagina: string;
  tutor?: EstadoTutor | null;
  /** Tour com a trilha de exemplo (somente leitura). */
  demo?: { depois: string };
}) {
  const config = useMemo<ConfigEstudio>(() => {
    if (!produto.id) return CONFIG;
    const pagina = `/produtos/${produto.id}`;
    return {
      ...CONFIG,
      rotas: {
        ...CONFIG.rotas,
        trilhas: pagina,
        voltar: (t) => (t.publicada ? `/trilhas/${t.id}` : pagina),
        depoisDoTour: `${pagina}/trilhas/nova`,
      },
    };
  }, [produto.id]);
  return (
    <Estudio
      estado={estado}
      config={config}
      usuario={usuario}
      tutor={tutor}
      demo={demo}
      contexto={
        <>
          trilha de{" "}
          {demo ? (
            <span className="font-semibold text-marca-700">{produto.nome}</span>
          ) : (
            <Link href={produto.id ? `/produtos/${produto.id}` : "/produtos"} className="font-semibold text-marca-700 hover:underline">
              {produto.nome}
            </Link>
          )}
        </>
      }
      painelPublicar={(p) => <PainelPublicarCriador {...p} produto={produto} linkPagina={linkPagina} />}
    />
  );
}
