import type { AulasDraft, CardsDraft, Ementa, Etapa } from "@edu/core";
import type { AvaliacaoQualidade, EventoAgente } from "../eventos";
import { FonteEmMemoria } from "../materiais";
import type { ContextoTools, Ferramenta } from "../tools/base";
import { Workspace } from "../workspace";

/** Material de exemplo com duas páginas, usado pelos testes das tools. */
export const fonteDeTeste = () =>
  new FonteEmMemoria(
    [{ id: "m1", nome: "roteiro.md", mime: "text/markdown", paginas: 2 }],
    [
      { material_id: "m1", pagina: 1, texto: "A Revolução Francesa começou em 1789 com a queda da Bastilha, em Paris." },
      { material_id: "m1", pagina: 2, texto: "Napoleão Bonaparte chegou ao poder com o golpe do 18 de Brumário, em 1799." },
    ],
  );

export const ementaVazia = (): Ementa => ({
  curso: "Revoluções que mudaram o mundo",
  objetivo_geral: "Entender as causas e as consequências das grandes revoluções da história.",
  publico_alvo: "Seguidores curiosos por história.",
  competencias: [
    { id: "K1", texto: "Explicar as causas da Revolução Francesa" },
    { id: "K2", texto: "Relacionar a revolução à ascensão de Napoleão" },
  ],
  modulos: [],
});

export const ementaComTopicos = (): Ementa => ({
  ...ementaVazia(),
  modulos: [
    {
      id: "M1",
      titulo: "Antes da Bastilha",
      descricao: "As causas da revolução.",
      topicos: [
        {
          id: "T1",
          titulo: "Crise do Antigo Regime",
          descricao: "Fome, impostos e privilégios.",
          fontes: [{ material_id: "m1", pagina: 1 }],
          competencia_ids: ["K1"],
        },
        { id: "T2", titulo: "Queda da Bastilha", descricao: "O 14 de julho de 1789.", fontes: [{ material_id: "m1", pagina: 1 }], competencia_ids: ["K1"] },
      ],
    },
    {
      id: "M2",
      titulo: "Napoleão",
      descricao: "Do golpe ao império.",
      topicos: [{ id: "T3", titulo: "18 de Brumário", descricao: "O golpe de 1799.", fontes: [{ material_id: "m1", pagina: 2 }], competencia_ids: ["K2"] }],
    },
  ],
});

export interface ContextoDeTeste {
  ctx: ContextoTools;
  ws: Workspace;
  eventos: EventoAgente[];
  /** Ferramentas por nome. */
  tools: (lista: Ferramenta[]) => Record<string, Ferramenta>;
}

/** Workspace + contexto das tools sem modelo, sem banco e sem rede. */
export function contextoDeTeste(
  etapa: Etapa,
  inicial: { ementa?: Ementa; cards?: CardsDraft; aulas?: AulasDraft } = {},
  opcoes: { escopoModulo?: string | null; prefixoIds?: string; revisar?: () => Promise<AvaliacaoQualidade>; limiteRevisoes?: number } = {},
): ContextoDeTeste {
  const eventos: EventoAgente[] = [];
  const emit = (e: EventoAgente) => eventos.push(e);
  const ws = new Workspace(
    etapa,
    { ementa: inicial.ementa ?? ementaVazia(), cards: inicial.cards ?? { cards: [] }, aulas: inicial.aulas ?? { aulas: [] } },
    [{ id: "m1", nome: "roteiro.md", mime: "text/markdown", paginas: 2 }],
    emit,
  );
  const ctx: ContextoTools = {
    ws,
    fonte: fonteDeTeste(),
    emit,
    acoes: [],
    revisar: opcoes.revisar ?? (async () => ({ nota_geral: 5, criterios: [], problemas: [], pontos_fortes: [] })),
    revisoes: { feitas: 0, limite: opcoes.limiteRevisoes ?? 1, ultima: null },
    escopoModulo: opcoes.escopoModulo ?? null,
    prefixoIds: opcoes.prefixoIds ?? "",
    rotular: (nome) => nome,
  };
  return { ctx, ws, eventos, tools: (lista) => Object.fromEntries(lista.map((t) => [t.name, t])) };
}
