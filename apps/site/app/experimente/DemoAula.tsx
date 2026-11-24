"use client";

import { type ConfigAula, Player, ProvedorAula, TEXTOS_FA } from "@edu/aula-ui";
import { type BlocoCorrigivel, blocoParaAluno, type CorrecaoDesafio, corrigirDesafio, type EventoXp } from "@edu/core";
import { useMemo, useRef, useState } from "react";
import { DEMO } from "@/conteudo/demos";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * O player do app do aluno com ações simuladas: a correção usa as mesmas regras do servidor e a
 * conclusão monta a recompensa a partir das respostas desta tentativa. Sair ou voltar à trilha
 * recomeça a aula (embutida no celular da landing) ou volta para a landing (tela cheia).
 */
export function DemoAula({ embutida, rodada }: { embutida: boolean; rodada: number }) {
  const demo = DEMO;
  const volta = "/";
  const [tentativa] = useState(() => crypto.randomUUID());
  const respostas = useRef(new Map<string, boolean>());
  // `r` muda a cada volta: a página remonta a aula do zero (ver `key` em page.tsx).
  const recomecar = `/experimente?${embutida ? "embutida=1&" : ""}r=${rodada + 1}`;

  const config = useMemo<ConfigAula>(
    () => ({
      textos: TEXTOS_FA,
      rotas: {
        trilha: () => (embutida ? recomecar : volta),
        aula: () => recomecar,
        // Sem pergunta aberta na demo: a rota nunca é chamada.
        aberta: () => recomecar,
        progresso: embutida ? recomecar : volta,
      },
      acoes: {
        async responder(_aulaId, blocoId, resposta) {
          await esperar(450);
          const bloco = demo.blocos.find((b) => b.id === blocoId) as BlocoCorrigivel | undefined;
          if (!bloco) return { erro: "Desafio não encontrado." };
          const correcao: CorrecaoDesafio = corrigirDesafio(bloco, resposta);
          respostas.current.set(blocoId, correcao.correta);
          return { correcao };
        },
        async concluirAula() {
          await esperar(500);
          const total = demo.blocos.filter((b) => b.tipo !== "texto").length;
          const acertos = [...respostas.current.values()].filter(Boolean).length;
          const eventos: EventoXp[] = [
            { fonte: "aula", ref_key: "demo-aula", pontos: 10, descricao: "Aula concluída" },
            ...(acertos
              ? [
                  {
                    fonte: "aula" as const,
                    ref_key: "demo-acertos",
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
              streak: { atual: demo.painel.ofensiva + 1 },
              novoDiaAtivo: true,
              marcoAtingido: null,
              aulaJaConcluida: false,
              trilhaConcluida: false,
              novasConquistas: [],
              xpTotal: demo.painel.xp + xpGanho,
              acertos,
              total,
            },
            proxima: null,
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
    [embutida, recomecar],
  );

  return (
    <div className="sem-grao min-h-dvh bg-fundo">
      <ProvedorAula config={config}>
        <Player
          key={tentativa}
          aula={{ id: demo.aula.id, titulo: demo.aula.titulo, objetivo: demo.aula.objetivo }}
          trilha={{ id: demo.trilha.id, titulo: demo.trilha.titulo, cor: demo.trilha.cor, icone: demo.trilha.icone }}
          blocos={demo.blocos.map(blocoParaAluno)}
          abertasAnteriores={{}}
          posicao={demo.aula.posicao}
          totalAulas={demo.trilha.total}
          modo="aula"
          tentativa={tentativa}
          edu={false}
        />
      </ProvedorAula>
    </div>
  );
}
