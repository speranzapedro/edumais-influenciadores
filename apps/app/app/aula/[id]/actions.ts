"use server";

import { caminhoDaTrilha, concluirAula as concluir, ErroAula, responderDesafio } from "@edu/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAluno } from "@/lib/sessao";

const Uuid = z.string().uuid();
const Indices = z.array(z.number().int().min(0).max(19)).min(1).max(10);
const RespostaDesafio = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("quiz"), opcao: z.number().int().min(0).max(9) }),
  z.object({ tipo: z.literal("completar"), escolhas: Indices }),
  z.object({ tipo: z.literal("ordenar"), ordem: Indices }),
]);

/** Corrige uma resposta no servidor e registra (o gabarito nunca vai para o navegador). */
export async function responder(aulaId: string, blocoId: string, resposta: z.infer<typeof RespostaDesafio>, tentativa: string) {
  const aluno = await exigirAluno();
  const p = z.object({ aulaId: Uuid, blocoId: Uuid, tentativa: Uuid, resposta: RespostaDesafio }).safeParse({ aulaId, blocoId, tentativa, resposta });
  if (!p.success) return { erro: "Resposta inválida." } as const;
  try {
    return { correcao: await responderDesafio({ aluno, ...p.data }) } as const;
  } catch (e) {
    if (e instanceof ErroAula) return { erro: e.message } as const;
    throw e;
  }
}

/** Conclui a aula apurando os acertos registrados nesta tentativa. */
export async function concluirAula(aulaId: string, trilhaId: string, tentativa: string) {
  const aluno = await exigirAluno();
  const p = z.object({ aulaId: Uuid, trilhaId: Uuid, tentativa: Uuid }).safeParse({ aulaId, trilhaId, tentativa });
  if (!p.success) return { erro: "Requisição inválida." } as const;
  try {
    const recompensa = await concluir(aluno, aulaId, tentativa);
    const caminho = await caminhoDaTrilha(trilhaId, aluno);
    const proxima = caminho?.aulas.find((a) => a.estado === "atual") ?? null;
    revalidatePath("/", "layout");
    return { recompensa, proxima: proxima ? { id: proxima.id, titulo: proxima.titulo } : null } as const;
  } catch (e) {
    if (e instanceof ErroAula) return { erro: e.message } as const;
    throw e;
  }
}
