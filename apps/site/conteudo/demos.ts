import type { Bloco } from "@edu/core";
import type { Personagem } from "@/lib/avatares";

/**
 * A trilha e a aula de exemplo, no formato real do app (blocos com gabarito).
 * Alimentam as telas do app na landing e a aula jogável em /experimente, que corrige no navegador
 * com as mesmas regras do servidor (`corrigirDesafio`). Sem pergunta aberta: a demo fica nos
 * desafios corrigíveis.
 */
export interface DemoApp {
  aluno: { nome: string; avatar: Personagem };
  painel: { ofensiva: number; xp: number; indicador: { valor: string; rotulo: string } };
  trilha: { id: string; titulo: string; cor: string; icone: string; feitas: number; total: number };
  /** Outras trilhas da home (a primeira da lista é sempre a trilha acima). */
  outras: { titulo: string; cor: string; icone: string; concluidas: number; total: number }[];
  modulo: { titulo: string; aulas: { titulo: string; estado: "concluida" | "atual" | "bloqueada" }[] };
  aula: { id: string; titulo: string; objetivo: string; posicao: number };
  blocos: Bloco[];
  /** Linhas da celebração. */
  festa: { eventos: { descricao: string; pontos: number }[] };
}

const INFLUENCIADORES: DemoApp = {
  aluno: { nome: "Caio", avatar: "caio" },
  painel: { ofensiva: 12, xp: 520, indicador: { valor: "4º", rotulo: "no ranking" } },
  trilha: { id: "demo-revolucoes", titulo: "Revoluções que mudaram o mundo", cor: "rosa", icone: "landmark", feitas: 3, total: 12 },
  outras: [
    { titulo: "Grandes navegações", cor: "azul", icone: "globe", concluidas: 10, total: 10 },
    { titulo: "Guerra Fria em 10 aulas", cor: "verde", icone: "flag", concluidas: 1, total: 10 },
  ],
  modulo: {
    titulo: "Revolução Francesa",
    aulas: [
      { titulo: "A França antes de 1789", estado: "concluida" },
      { titulo: "Os três estados", estado: "concluida" },
      { titulo: "A queda da Bastilha", estado: "atual" },
      { titulo: "O Terror", estado: "bloqueada" },
      { titulo: "A chegada de Napoleão", estado: "bloqueada" },
    ],
  },
  aula: { id: "00000000-0000-4000-8000-000000000301", titulo: "A queda da Bastilha", objetivo: "Entender o estopim da Revolução Francesa.", posicao: 3 },
  blocos: [
    {
      id: "00000000-0000-4000-8000-000000000311",
      tipo: "texto",
      titulo: null,
      texto: "Em 14 de julho de 1789, o povo de Paris invadiu a Bastilha, uma prisão que simbolizava o poder do rei. Foi o estopim da Revolução Francesa.",
      dica: "Lá dentro só havia sete presos: o que importava era o símbolo.",
    },
    {
      id: "00000000-0000-4000-8000-000000000312",
      tipo: "texto",
      titulo: "Por que o povo se revoltou",
      texto: "O pão estava caro, o Estado quebrado e só o Terceiro Estado pagava impostos, enquanto clero e nobreza tinham privilégios.",
      dica: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000313",
      tipo: "quiz",
      pergunta: "O que era a Bastilha?",
      skill_card_id: "bastilha",
      opcoes: [
        { texto: "O palácio do rei", correta: false, feedback: "Quase! O rei morava em Versalhes." },
        { texto: "Uma catedral de Paris", correta: false, feedback: "Quase! Você deve estar pensando em Notre-Dame." },
        { texto: "Uma prisão-fortaleza", correta: true, feedback: "Isso! Uma prisão que simbolizava o poder absoluto do rei." },
        { texto: "O parlamento francês", correta: false, feedback: "Quase! Os deputados se reuniam nos Estados Gerais." },
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000314",
      tipo: "completar",
      texto: "A Bastilha caiu em [[1]] e o lema da revolução era liberdade, igualdade e [[2]].",
      lacunas: [{ resposta: "1789" }, { resposta: "fraternidade" }],
      distratores: ["1815"],
      explicacao: "14 de julho de 1789 virou a data nacional da França.",
      skill_card_id: "bastilha",
    },
    {
      id: "00000000-0000-4000-8000-000000000315",
      tipo: "ordenar",
      instrucao: "Coloque os fatos em ordem.",
      passos: ["Os Estados Gerais são convocados", "A queda da Bastilha", "A Declaração dos Direitos do Homem", "Napoleão chega ao poder"],
      explicacao: "Maio de 1789, julho de 1789, agosto de 1789 e 1799.",
      skill_card_id: "bastilha",
    },
  ],
  festa: {
    eventos: [
      { descricao: "Aula concluída", pontos: 10 },
      { descricao: "Desafios certos", pontos: 15 },
    ],
  },
};

export const DEMO = INFLUENCIADORES;
