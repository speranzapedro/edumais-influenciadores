"use client";

import { type ConfigAula, ProvedorAula, TEXTOS_FA } from "@edu/aula-ui";
import { concluirAula, responder } from "@/app/aula/[id]/actions";
import { abrir, avaliar, confirmarAviso } from "@/app/edu/actions";

const CONFIG: ConfigAula = {
  acoes: { responder, concluirAula, eduAbrir: abrir, eduAvaliar: avaliar, eduConfirmarAviso: confirmarAviso },
  textos: TEXTOS_FA,
};

/** Liga o player de aula e o Edu às server actions deste app. */
export function ProvedorAulaFa({ children }: { children: React.ReactNode }) {
  return <ProvedorAula config={CONFIG}>{children}</ProvedorAula>;
}
