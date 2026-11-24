"use server";

import { corrigirNaPrevia, ErroPermissao } from "@edu/db";
import { z } from "zod";
import { exigirCriador } from "@/lib/sessao";

const Uuid = z.string().uuid();
const Indices = z.array(z.number().int().min(0).max(19)).min(1).max(10);
const RespostaDesafio = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("quiz"), opcao: z.number().int().min(0).max(9) }),
  z.object({ tipo: z.literal("completar"), escolhas: Indices }),
  z.object({ tipo: z.literal("ordenar"), ordem: Indices }),
]);

/** Corrige uma resposta da prévia com as regras do app do aluno, sem registrar nada. */
export async function responderNaPrevia(trilhaId: string, aulaId: string, blocoId: string, resposta: z.infer<typeof RespostaDesafio>) {
  const e = await exigirCriador();
  const p = z.object({ trilhaId: Uuid, aulaId: Uuid, blocoId: Uuid, resposta: RespostaDesafio }).safeParse({ trilhaId, aulaId, blocoId, resposta });
  if (!p.success) return { erro: "Resposta inválida." } as const;
  try {
    return { correcao: await corrigirNaPrevia(e, p.data) } as const;
  } catch (err) {
    if (err instanceof ErroPermissao) return { erro: err.message } as const;
    if (err instanceof Error) return { erro: err.message } as const;
    throw err;
  }
}
