import { montarContextoAberta } from "@edu/core";
import { afterEach, describe, expect, it } from "vitest";
import { definirClienteAnthropic } from "../modelo";
import { clienteAnthropicFalso } from "../teste/anthropic-falso";
import { avaliarRespostaAberta, type EventoFeedback } from "./avaliar";
import { MARCADOR_ANALISE } from "./prompt";

const contexto = montarContextoAberta({
  criador: { nome: "Bia História", publico: "Seguidores de Bia História." },
  produto: "Revoluções que mudaram o mundo",
  trilha: "Revolução Francesa",
  ementa: null,
  cards: [{ id: "C1", titulo: "Queda da Bastilha", conceito: "O 14 de julho de 1789.", pontos_chave: ["Paris"], exemplo: null }],
  aula: {
    titulo: "A Bastilha",
    objetivo: null,
    modulo_id: "M1",
    modulo_titulo: "Causas",
    skill_card_ids: ["C1"],
    blocos: [
      { id: "B1", tipo: "texto", titulo: null, texto: "A Bastilha era uma prisão.", dica: null },
      {
        id: "B2",
        tipo: "aberta",
        pergunta: "Por que a queda da Bastilha virou símbolo?",
        dica: null,
        gabarito: {
          resposta_modelo: "Porque representava o poder do rei.",
          criterios: [{ descricao: "Cita o poder do rei", essencial: true }],
          erros_comuns: [],
          alertas_criticos: [],
        },
        skill_card_id: "C1",
      },
    ],
  },
  blocoId: "B2",
});

async function coletar(g: AsyncGenerator<EventoFeedback>) {
  const ev: EventoFeedback[] = [];
  for await (const e of g) ev.push(e);
  return ev;
}

describe("feedback da pergunta aberta (modelo falso)", () => {
  afterEach(() => definirClienteAnthropic(null));

  it("entrega o texto em pedaços e separa a análise interna", async () => {
    const texto = `Boa! Você lembrou do poder do rei.\nResumindo: a Bastilha simbolizava o rei.\n${MARCADOR_ANALISE}{"classificacao":"adequada","criterios":[{"indice":1,"atendido":true}]}`;
    const { cliente, chamadas } = clienteAnthropicFalso({ fluxos: [texto] });
    definirClienteAnthropic(cliente);
    const eventos = await coletar(avaliarRespostaAberta(contexto, "Porque era o poder do rei."));
    const visivel = eventos.flatMap((e) => (e.tipo === "texto" ? [e.delta] : [])).join("");
    expect(visivel).not.toContain(MARCADOR_ANALISE);
    const fim = eventos.at(-1);
    if (fim?.tipo !== "fim") throw new Error("sem fim");
    expect(fim.feedback).toContain("Resumindo");
    expect(fim.analise?.classificacao).toBe("adequada");
    expect(JSON.stringify(chamadas[0].params.system)).toContain("Bia História, criador de conteúdo");
  });

  it("falha quando o modelo não devolve feedback", async () => {
    const { cliente } = clienteAnthropicFalso({ fluxos: [""] });
    definirClienteAnthropic(cliente);
    await expect(coletar(avaliarRespostaAberta(contexto, "não sei"))).rejects.toThrow("O tutor não devolveu feedback.");
  });
});
