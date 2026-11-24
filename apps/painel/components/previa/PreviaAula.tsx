"use client";

import { type ConfigAula, Player, ProvedorAula, TEXTOS_FA } from "@edu/aula-ui";
import type { BlocoAluno, EventoXp } from "@edu/core";
import { useMemo, useRef, useState } from "react";
import { responderNaPrevia } from "@/app/(painel)/trilhas/[id]/aulas/[aulaId]/actions";

/**
 * O player do app do aluno com a aula publicada. A correção é a do servidor (sem gravar) e a
 * conclusão monta a celebração só com as respostas desta prévia: nada vai para o progresso.
 */
export function PreviaAula({
  trilha,
  aula,
  blocos,
  posicao,
  totalAulas,
  proxima,
}: {
  trilha: { id: string; titulo: string; cor: string; icone: string };
  aula: { id: string; titulo: string; objetivo: string | null };
  blocos: BlocoAluno[];
  posicao: number;
  totalAulas: number;
  proxima: { id: string; titulo: string } | null;
}) {
  const [tentativa] = useState(() => crypto.randomUUID());
  const respostas = useRef(new Map<string, boolean>());
  const base = `/trilhas/${trilha.id}`;

  const config = useMemo<ConfigAula>(
    () => ({
      textos: TEXTOS_FA,
      rotas: {
        trilha: () => base,
        aula: (id) => `${base}/aulas/${id}`,
        aberta: (id) => `${base}/aulas/${id}/aberta`,
        progresso: base,
      },
      acoes: {
        async responder(aulaId, blocoId, resposta) {
          const r = await responderNaPrevia(trilha.id, aulaId, blocoId, resposta);
          if ("correcao" in r && r.correcao) respostas.current.set(blocoId, r.correcao.correta);
          return r;
        },
        async concluirAula() {
          const total = blocos.filter((b) => b.tipo === "quiz" || b.tipo === "completar" || b.tipo === "ordenar").length;
          const acertos = [...respostas.current.values()].filter(Boolean).length;
          const eventos: EventoXp[] = [
            { fonte: "aula", ref_key: "previa-aula", pontos: 10, descricao: "Aula concluída" },
            ...(acertos
              ? [
                  {
                    fonte: "aula" as const,
                    ref_key: "previa-acertos",
                    pontos: acertos * 5,
                    descricao: `${acertos} ${acertos === 1 ? "desafio certo" : "desafios certos"}`,
                  },
                ]
              : []),
          ];
          const xpGanho = eventos.reduce((s, e) => s + e.pontos, 0);
          return {
            recompensa: {
              eventos,
              xpGanho,
              streak: { atual: 1 },
              novoDiaAtivo: false,
              marcoAtingido: null,
              aulaJaConcluida: false,
              trilhaConcluida: !proxima,
              novasConquistas: [],
              xpTotal: xpGanho,
              acertos,
              total,
            },
            proxima,
            // A recompensa do banco tem mais campos; a celebração só usa estes.
          } as never;
        },
        async eduAbrir() {
          return null;
        },
        async eduAvaliar() {},
        async eduConfirmarAviso() {},
      },
    }),
    [base, blocos, proxima, trilha.id],
  );

  return (
    <ProvedorAula config={config}>
      <Player
        aula={aula}
        trilha={trilha}
        blocos={blocos}
        abertasAnteriores={{}}
        posicao={posicao}
        totalAulas={totalAulas}
        modo="aula"
        tentativa={tentativa}
        edu={false}
      />
    </ProvedorAula>
  );
}
