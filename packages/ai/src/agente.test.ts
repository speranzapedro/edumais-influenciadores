import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executarAgente, gerarEmParalelo, rodarEtapa } from "./agente";
import type { EventoAgente } from "./eventos";
import { definirClienteAnthropic, usoVazio } from "./modelo";
import { revisarQualidade } from "./revisor";
import { clienteAnthropicFalso } from "./teste/anthropic-falso";
import { ementaComTopicos, ementaVazia, fonteDeTeste } from "./teste/contexto";

const perfil = { nome: "Bia História", publico: "Seguidores de Bia História que assinaram o produto." };
const modelo = "claude-haiku-5-5";

const topico = (titulo: string, competencia_ids: string[]) => ({
  titulo,
  descricao: `Tópico sobre ${titulo}, com os subtemas principais.`,
  fontes: [{ material_id: "m1", pagina: 1 }],
  competencia_ids,
});

const card = (titulo: string, topico_ids: string[]) => ({
  titulo,
  conceito: `${titulo}: ${"explicação do conceito para o fã entender sem pressa e sem jargão. ".repeat(4)}`,
  pontos_chave: ["Primeiro ponto verificável.", "Segundo ponto verificável.", "Terceiro ponto verificável."],
  exemplo: "Um exemplo concreto do cotidiano que ilustra o conceito.",
  topico_ids,
  fontes: [{ material_id: "m1", pagina: 1 }],
});

function base(eventos: EventoAgente[]) {
  return {
    modo: "geracao" as const,
    inicial: { ementa: ementaVazia(), cards: { cards: [] }, aulas: { aulas: [] } },
    fonte: fonteDeTeste(),
    emit: (e: EventoAgente) => eventos.push(e),
    perfil,
    modelo,
    contextoTrilha: { produto: "Revoluções que mudaram o mundo", titulo: "Revolução Francesa", objetivo: "Entender a revolução." },
  };
}

describe("agente do estúdio (com modelo falso)", () => {
  beforeEach(() => {
    delete process.env.MODO_ECONOMICO;
    delete process.env.REVISOR_PEDAGOGICO;
  });
  afterEach(() => definirClienteAnthropic(null));

  it("gera a ementa com as tools e encerra com o resumo do modelo", async () => {
    const { cliente, chamadas } = clienteAnthropicFalso({
      rodadas: [
        [
          {
            chamadas: [
              {
                nome: "definir_estrutura",
                input: {
                  modulos: [
                    { titulo: "Causas", descricao: "Por que começou.", topicos: [topico("Fome", ["K1"]), topico("Impostos", ["K1"])] },
                    { titulo: "Napoleão", descricao: "Do golpe ao império.", topicos: [topico("Brumário", ["K2"]), topico("Império", ["K2"])] },
                  ],
                },
              },
              { nome: "validar_ementa", input: {} },
            ],
          },
          { texto: "Montei 2 módulos com 4 tópicos." },
        ],
      ],
    });
    definirClienteAnthropic(cliente);
    const eventos: EventoAgente[] = [];
    const r = await executarAgente({ ...base(eventos), etapa: "ementa" });

    expect(r.ementa.modulos.map((m) => m.titulo)).toEqual(["Causas", "Napoleão"]);
    expect(r.pendencias.filter((p) => p.nivel === "erro").map((p) => `${p.regra}: ${p.mensagem}`)).toEqual([]);
    expect(r.resumo).toBe("Montei 2 módulos com 4 tópicos.");
    expect(r.uso.input_tokens).toBeGreaterThan(0);
    expect(eventos.at(-1)).toMatchObject({ tipo: "fim", resumo: "Montei 2 módulos com 4 tópicos." });
    // O prompt do sistema fala com o criador.
    const system = JSON.stringify(chamadas[0].params.system);
    expect(system).toContain("Bia História, criador de conteúdo");
    expect(JSON.stringify(chamadas[0].params.messages)).toContain("Produto: Revoluções que mudaram o mundo");
  });

  it("pede uma nova rodada quando a validação ainda aponta erros", async () => {
    const { cliente, chamadas } = clienteAnthropicFalso({
      rodadas: [
        // 1ª rodada: K2 fica sem tópico (erro de validação).
        [
          {
            chamadas: [
              {
                nome: "definir_estrutura",
                input: { modulos: [{ titulo: "Causas", descricao: "d", topicos: [topico("Fome", ["K1"]), topico("Impostos", ["K1"])] }] },
              },
            ],
          },
        ],
        // 2ª rodada: o modelo corrige.
        [{ chamadas: [{ nome: "adicionar_topico", input: { modulo_id: "M1", ...topico("Brumário", ["K2"]) } }] }, { texto: "Corrigi a competência K2." }],
      ],
    });
    definirClienteAnthropic(cliente);
    const eventos: EventoAgente[] = [];
    const r = await executarAgente({ ...base(eventos), etapa: "ementa" });

    expect(chamadas.filter((c) => c.tipo === "runner")).toHaveLength(2);
    expect(JSON.stringify(chamadas[1].params.messages)).toContain("[Verificação automática do sistema]");
    expect(r.pendencias.some((p) => p.regra === "competencia_sem_topico")).toBe(false);
    expect(eventos.some((e) => e.tipo === "status" && e.texto.includes("Corrigindo"))).toBe(true);
  });

  it("falha com mensagem clara quando o modelo recusa", async () => {
    const { cliente } = clienteAnthropicFalso({ rodadas: [[{ texto: "", stopReason: "refusal" }]] });
    definirClienteAnthropic(cliente);
    await expect(executarAgente({ ...base([]), etapa: "ementa" })).rejects.toThrow("O modelo recusou a solicitação.");
  });

  it("gera os cards dos módulos em paralelo, um worker por módulo", async () => {
    const { cliente, chamadas } = clienteAnthropicFalso({
      rodadas: [
        [{ chamadas: [{ nome: "criar_skill_cards", input: { cards: [card("Fome", ["T1"]), card("Bastilha", ["T2"])] } }] }, { texto: "M1 pronto." }],
        [{ chamadas: [{ nome: "criar_skill_cards", input: { cards: [card("Brumário", ["T3"])] } }] }, { texto: "M2 pronto." }],
      ],
    });
    definirClienteAnthropic(cliente);
    const eventos: EventoAgente[] = [];
    const r = await gerarEmParalelo("cards", { ...base(eventos), inicial: { ementa: ementaComTopicos(), cards: { cards: [] }, aulas: { aulas: [] } } });

    expect(chamadas.filter((c) => c.tipo === "runner")).toHaveLength(2);
    expect(r.cards.cards.map((c) => c.titulo)).toEqual(["Fome", "Bastilha", "Brumário"]);
    // Ids renumerados depois de juntar os workers.
    expect(r.cards.cards.map((c) => c.id)).toEqual(["C1", "C2", "C3"]);
    expect(eventos.some((e) => e.tipo === "status" && e.texto.includes("2 módulos em paralelo"))).toBe(true);
  });

  it("gera a visão geral numa chamada só, com ids estáveis de competências", async () => {
    const saida = {
      curso: "Revoluções que mudaram o mundo",
      objetivo_geral: "Ao final, você vai entender as grandes revoluções.",
      publico_alvo: "Seguidores curiosos por história.",
      competencias: [
        { id: "K1", texto: "Explicar as causas da Revolução Francesa" },
        { id: null, texto: "Comparar revoluções" },
      ],
      resumo: "Propus 2 competências.",
    };
    const { cliente } = clienteAnthropicFalso({ respostas: [JSON.stringify(saida), "isto não é json"] });
    definirClienteAnthropic(cliente);
    const r = await rodarEtapa({ ...base([]), etapa: "visao" });
    // K1 continua; a competência nova ganha o próximo id livre (K2 saiu da visão).
    expect(r.visao.competencias.map((c) => c.id)).toEqual(["K1", "K2"]);
    expect(r.resumo).toBe("Propus 2 competências.");
    await expect(rodarEtapa({ ...base([]), etapa: "visao" })).rejects.toThrow("JSON válido");
  });

  it("o revisor pedagógico devolve a avaliação estruturada", async () => {
    const avaliacao = { nota_geral: 4, criterios: [{ criterio: "clareza", nota: 4, comentario: "Boa." }], problemas: [], pontos_fortes: ["Sequência clara."] };
    const { cliente, chamadas } = clienteAnthropicFalso({ respostas: [JSON.stringify(avaliacao)] });
    definirClienteAnthropic(cliente);
    const uso = usoVazio();
    const r = await revisarQualidade({ perfil, etapa: "ementa", modelo, materiais: [], contexto: null, draft: ementaComTopicos(), foco: "módulo M1", uso });
    expect(r.nota_geral).toBe(4);
    expect(uso.input_tokens).toBe(100);
    expect(String(chamadas[0].params.system)).toContain("criador de conteúdo, vende aos seguidores");
  });
});
