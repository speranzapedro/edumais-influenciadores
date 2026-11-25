"use client";

import { type ConfigAula, ProvedorAula, TEXTOS_FA } from "@edu/aula-ui";
import { useMemo } from "react";
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

/**
 * Dentro de um produto (/@criador/<produto>): o player volta para a trilha e segue para a próxima aula
 * sem sair do app do criador. A correção da pergunta aberta continua na rota /aula/<id>/aberta.
 */
export function ProvedorAulaDoProduto({ base, inicio, children }: { base: string; inicio: string; children: React.ReactNode }) {
  const config = useMemo<ConfigAula>(
    () => ({
      ...CONFIG,
      rotas: {
        trilha: (id) => `${base}/trilha/${id}`,
        aula: (id) => `${base}/aula/${id}`,
        aberta: (id) => `/aula/${id}/aberta`,
        progresso: `${inicio}/progresso`,
      },
    }),
    [base, inicio],
  );
  return <ProvedorAula config={config}>{children}</ProvedorAula>;
}
