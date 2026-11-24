"use server";

import { abrirEdu, avaliarRespostaEdu, type EstadoEdu, marcarAvisoEdu } from "@edu/db";
import { z } from "zod";
import { exigirAluno } from "@/lib/sessao";

const Uuid = z.string().uuid();

/** Estado do painel do Edu ao abrir (null = Edu indisponível nesta trilha). */
export async function abrir(trilhaId: string, aulaId: string | null): Promise<EstadoEdu | null> {
  const aluno = await exigirAluno();
  if (!Uuid.safeParse(trilhaId).success || (aulaId !== null && !Uuid.safeParse(aulaId).success)) return null;
  return abrirEdu(aluno, trilhaId, aulaId);
}

const Avaliacao = z.object({
  mensagemId: Uuid,
  avaliacao: z.enum(["util", "nao_ajudou"]).nullable(),
  motivo: z.string().max(80).nullable(),
});

export async function avaliar(mensagemId: string, avaliacao: "util" | "nao_ajudou" | null, motivo: string | null) {
  const aluno = await exigirAluno();
  const p = Avaliacao.parse({ mensagemId, avaliacao, motivo });
  await avaliarRespostaEdu({ aluno, ...p });
}

export async function confirmarAviso() {
  await marcarAvisoEdu(await exigirAluno());
}
