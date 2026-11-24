import { type AulasDraft, assinaturaCards, assinaturaModulo, type CardsDraft, cardsDoModulo, type Ementa, type Etapa, visaoDaEmenta } from "@edu/core";
import type { EstadoEstudio, MensagemChat } from "@edu/db";
import dados from "./estudio-demo.json";

/**
 * Trilha de exemplo do tour do estúdio: sempre a mesma para todo mundo, montada a partir de um recorte
 * da trilha de Eletricidade do seed (2 módulos). Nada aqui vai para o banco: o estúdio roda em modo demo.
 */
export const ID_TRILHA_DEMO = "demo";

const ementa = dados.ementa as Ementa;
const cards = dados.cards as CardsDraft;
const aulas = dados.aulas as AulasDraft;
const quando = "2026-01-01T12:00:00.000Z";

const etapa = (e: Etapa, revisoes: Record<string, string> = {}) => ({
  trilha_id: ID_TRILHA_DEMO,
  etapa: e,
  status: "aprovada" as const,
  versao_atual: 1,
  versao_aprovada: 1,
  qualidade: null,
  gerando_desde: null,
  revisoes,
  updated_at: quando,
});

let n = 0;
const msg = (e: Etapa, role: "user" | "assistant", texto: string): MensagemChat => ({
  id: `demo-msg-${++n}`,
  etapa: e,
  role,
  texto,
  eventos: {},
  foco: null,
  versao: role === "assistant" ? 1 : null,
  created_at: quando,
});

/** Módulos já revisados no exemplo: o M1, para o tour mostrar o check "Revisado" marcado. */
const m1 = ementa.modulos[0];

export function estadoDemo(produto: { id: string; nome: string }): EstadoEstudio {
  return {
    trilha: {
      id: ID_TRILHA_DEMO,
      produto_id: produto.id,
      criador_id: "demo",
      titulo: "Eletricidade Básica e Segurança",
      descricao: ementa.objetivo_geral,
      cor: "laranja",
      icone: "zap",
      status: "publicada",
      ordem: 1,
      ementa: null,
      publicada_em: quando,
      tutor_ativo: false,
      orientacao_objetivo: "Preparar o fã para entender a Lei de Ohm e trabalhar com segurança em instalações de baixa tensão.",
      orientacao_conteudos: "Foque nos capítulos de Lei de Ohm e de segurança da apostila. Deixe de fora a parte de motores.",
      orientacao_complementos: "Incluir o dispositivo DR, que não aparece na apostila.",
      created_at: quando,
      updated_at: quando,
    },
    etapas: {
      visao: etapa("visao"),
      ementa: etapa("ementa", { [m1.id]: assinaturaModulo(m1) }),
      cards: etapa("cards", { [m1.id]: assinaturaCards(cardsDoModulo(ementa, cards, m1.id)) }),
      aulas: etapa("aulas"),
    },
    rascunhos: { visao: visaoDaEmenta(ementa), ementa, cards, aulas },
    materiais: dados.materiais.map((m) => ({
      id: m.id,
      trilha_id: ID_TRILHA_DEMO,
      storage_path: "",
      nome: m.nome,
      mime: "application/pdf",
      tamanho_bytes: m.paginas * 48_000,
      paginas: m.paginas,
      status: "pronto",
      erro: null,
      created_at: quando,
    })),
    mensagens: [
      msg("visao", "user", "Gere a visão geral a partir dos materiais e da orientação."),
      msg(
        "visao",
        "assistant",
        "Propus a visão geral com foco na Lei de Ohm e na segurança, como você pediu. Incluí o dispositivo DR como complemento, já que ele não aparece na apostila. Vale conferir o público-alvo.",
      ),
      msg("ementa", "user", "Gere a ementa a partir da visão geral aprovada."),
      msg(
        "ementa",
        "assistant",
        "Montei 2 módulos com 9 tópicos, cada um ligado às competências da visão. O tópico de aterramento e DR veio do complemento e ficou sem fonte no material.",
      ),
      msg("ementa", "user", "Coloque a NR-10 antes da sequência de desenergização."),
      msg("ementa", "assistant", "Feito: no M2, a NR-10 (T8) agora vem antes da sequência de desenergização (T9)."),
      msg("cards", "user", "Gere os Cards de Conhecimento a partir da ementa aprovada."),
      msg(
        "cards",
        "assistant",
        `Criei ${cards.cards.length} Cards de Conhecimento cobrindo 100% dos tópicos da ementa, cada um com conceito, pontos-chave e um exemplo prático.`,
      ),
      msg("aulas", "user", "Gere as aulas a partir dos Cards de Conhecimento aprovados."),
      msg(
        "aulas",
        "assistant",
        `Montei ${aulas.aulas.length} aulas curtas, cada uma com uma explicação seguida de prática (quiz, completar, ordenar e uma pergunta aberta). Todos os cards entram em alguma aula e são avaliados por pelo menos um desafio.`,
      ),
    ],
    produto,
  };
}
