import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { definirClienteAnthropic } from "../modelo";
import { clienteAnthropicFalso } from "../teste/anthropic-falso";
import type { CandidatoTrecho, ConsultorTutor } from "./busca";
import { type EventoTutor, responderTutor } from "./responder";

const candidato = (id: number, texto: string): CandidatoTrecho => ({
  id,
  origem: "aula",
  material_id: null,
  aula_id: `aula-${id}`,
  card_id: null,
  pagina_inicio: null,
  pagina_fim: null,
  avaliativo: false,
  caminho: `Revolução Francesa › Aula ${id}`,
  texto,
  tokens: 20,
  pos_lexica: id,
  pos_semantica: id,
  score: 1 / id,
});

/** Voyage falso: embedding de 1024 zeros e reordenação que mantém a ordem com relevância alta. */
function voyageFalso() {
  return vi.fn(async (url: string, init: { body: string }) => {
    const corpo = JSON.parse(init.body);
    const json = String(url).endsWith("/rerank")
      ? { data: corpo.documents.map((_: string, i: number) => ({ index: i, relevance_score: 0.9 - i * 0.1 })), usage: { total_tokens: 30 } }
      : { data: [{ data: [{ embedding: new Array(1024).fill(0) }] }], usage: { total_tokens: 10 } };
    return new Response(JSON.stringify(json), { status: 200, headers: { "Content-Type": "application/json" } });
  });
}

async function coletar(gerador: AsyncGenerator<EventoTutor>) {
  const eventos: EventoTutor[] = [];
  for await (const e of gerador) eventos.push(e);
  return eventos;
}

describe("tutor (Edu) com modelo e busca falsos", () => {
  const consultor: ConsultorTutor = {
    buscar: async () => [candidato(1, "A Bastilha caiu em 14 de julho de 1789."), candidato(2, "Napoleão deu o golpe em 1799.")],
  };

  beforeEach(() => {
    process.env.VOYAGE_API_KEY = "teste";
    vi.stubGlobal("fetch", voyageFalso());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    definirClienteAnthropic(null);
  });

  it("busca na trilha e responde em streaming com o mapa no prompt", async () => {
    const { cliente, chamadas } = clienteAnthropicFalso({ fluxos: ["A Bastilha caiu em 14 de julho de 1789, o marco da revolução."] });
    definirClienteAnthropic(cliente);
    const eventos = await coletar(
      responderTutor({ consultor, trilha: { id: "t1", titulo: "Revolução Francesa", mapa: "M1 Causas" }, historico: [], pergunta: "Quando caiu a Bastilha?" }),
    );
    const fim = eventos.at(-1);
    expect(fim?.tipo).toBe("fim");
    if (fim?.tipo !== "fim") return;
    expect(fim.resposta).toContain("14 de julho de 1789");
    expect(fim.recusada).toBe(false);
    expect(fim.trechos).toHaveLength(2);
    expect(fim.confiancaBaixa).toBe(false);
    expect(eventos.filter((e) => e.tipo === "texto").length).toBeGreaterThan(1);
    expect(JSON.stringify(chamadas[0].params.system)).toContain("M1 Causas");
  });

  it("reescreve a pergunta quando há histórico e recusa sem inventar quando não há resposta", async () => {
    const { cliente, chamadas } = clienteAnthropicFalso({ respostas: ["Quando Napoleão deu o golpe?"], fluxos: [""] });
    definirClienteAnthropic(cliente);
    const eventos = await coletar(
      responderTutor({
        consultor,
        trilha: { id: "t1", titulo: "Revolução Francesa", mapa: "M1" },
        historico: [{ pergunta: "Quem foi Napoleão?", resposta: "Um general francês." }],
        pergunta: "E o golpe?",
      }),
    );
    const fim = eventos.at(-1);
    if (fim?.tipo !== "fim") throw new Error("sem fim");
    expect(fim.consulta).toBe("Quando Napoleão deu o golpe?");
    expect(fim.recusada).toBe(true);
    expect(fim.resposta).toBe("Não consigo ajudar com isso por aqui.");
    expect(chamadas.map((c) => c.tipo)).toEqual(["create", "stream"]);
  });
});
