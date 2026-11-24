"use client";

import { TOUR_ESTUDIO } from "@edu/core";
import type { EstadoEstudio } from "@edu/db";
import { type ConfigEstudio, type EstadoTutor, Estudio } from "@edu/estudio";
import Link from "next/link";
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
    trilhas: "/trilhas",
    estudio: (id) => `/trilhas/${id}/editar`,
    // Publicada: volta para a visualização da trilha (como está no app do aluno).
    voltar: (t) => (t.publicada ? `/trilhas/${t.id}` : "/trilhas"),
    tour: (depois) => `/trilhas/tour?depois=${encodeURIComponent(depois)}`,
    depoisDoTour: "/trilhas/nova",
  },
  tour: TOUR_ESTUDIO,
};

/** Estúdio no painel do Edu+ Criador: toda trilha entra no produto do criador. */
export function EstudioCriador({
  estado,
  produto,
  usuario,
  linkPagina,
  tutor,
  demo,
}: {
  estado: EstadoEstudio;
  produto: { nome: string; publicado: boolean; assinantes: number };
  usuario: { id: string; nome: string };
  linkPagina: string;
  tutor?: EstadoTutor | null;
  /** Tour com a trilha de exemplo (somente leitura). */
  demo?: { depois: string };
}) {
  return (
    <Estudio
      estado={estado}
      config={CONFIG}
      usuario={usuario}
      tutor={tutor}
      demo={demo}
      contexto={
        <>
          trilha de{" "}
          {demo ? (
            <span className="font-semibold text-marca-700">{produto.nome}</span>
          ) : (
            <Link href="/perfil#produto" className="font-semibold text-marca-700 hover:underline">
              {produto.nome}
            </Link>
          )}
        </>
      }
      painelPublicar={(p) => <PainelPublicarCriador {...p} produto={produto} linkPagina={linkPagina} />}
    />
  );
}
