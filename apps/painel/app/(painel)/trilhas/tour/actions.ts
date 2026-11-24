"use server";

import { TOUR_ESTUDIO_VISTO } from "@edu/core";
import { marcarTourEstudio } from "@edu/db";
import { exigirCriador } from "@/lib/sessao";

/** Tour de exemplo do estúdio visto ou pulado: "Nova trilha" passa a ir direto para o formulário. */
export async function concluirTourEstudio() {
  const e = await exigirCriador();
  await marcarTourEstudio(e.usuario.id, [TOUR_ESTUDIO_VISTO]);
}
