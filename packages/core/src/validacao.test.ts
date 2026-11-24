import { describe, expect, it } from "vitest";
import type { Aula, BlocoAberta, BlocoCompletar, BlocoOrdenar, CardsDraft, Ementa } from "./conteudo";
import {
  desafioObvio,
  validarAberta,
  validarAula,
  validarAulas,
  validarCards,
  validarCompletar,
  validarEmenta,
  validarOrdenar,
  validarVisao,
  verificarCoberturaAulas,
  verificarCoberturaCards,
  verificarCoberturaCompetencias,
} from "./validacao";

const desc = "Descrição suficientemente longa para passar no validador de tamanho.";

const ementa: Ementa = {
  curso: "Eletricidade Básica",
  objetivo_geral: "Capacitar o aluno a compreender os fundamentos da eletricidade com segurança no trabalho.",
  publico_alvo: "Alunos do 1º ano do técnico",
  competencias: [
    { id: "K1", texto: "Identificar tensão e corrente em circuitos" },
    { id: "K2", texto: "Reconhecer riscos de choque elétrico" },
    { id: "K3", texto: "Aplicar as exigências básicas da NR-10" },
  ],
  modulos: [
    {
      id: "M1",
      titulo: "Fundamentos",
      descricao: "Conceitos de tensão e corrente.",
      topicos: [
        { id: "T1", titulo: "Tensão elétrica", descricao: desc, fontes: [{ material_id: "mat1", pagina: 1 }] },
        { id: "T2", titulo: "Corrente elétrica", descricao: desc, fontes: [{ material_id: "mat1", pagina: 2 }] },
      ],
    },
    {
      id: "M2",
      titulo: "Segurança",
      descricao: "Normas e riscos elétricos.",
      topicos: [
        { id: "T3", titulo: "Choque elétrico", descricao: desc, fontes: [{ material_id: "mat1", pagina: 3 }] },
        { id: "T4", titulo: "NR-10", descricao: desc, fontes: [{ material_id: "matX", pagina: 4 }] },
      ],
    },
  ],
};

const conceito = "x".repeat(250);
const exemplo = "Exemplo prático do dia a dia de um eletricista.";
const card = (id: string, topicos: string[]) => ({
  id,
  titulo: `Card ${id}`,
  conceito,
  pontos_chave: ["um", "dois", "três"],
  exemplo,
  topico_ids: topicos,
  fontes: [{ material_id: "mat1", pagina: 1 }],
});

describe("validarEmenta", () => {
  it("acusa fonte inexistente", () => {
    const p = validarEmenta(ementa, ["mat1"]);
    expect(p.some((x) => x.regra === "fonte_inexistente" && x.alvo === "T4")).toBe(true);
  });
  it("aceita ementa ok", () => {
    expect(validarEmenta(ementa, ["mat1", "matX"]).filter((x) => x.nivel === "erro")).toHaveLength(0);
  });
});

describe("cobertura de cards", () => {
  it("detecta tópico sem card e referência inválida", () => {
    const draft: CardsDraft = { cards: [card("C1", ["T1", "T2"]), card("C2", ["T3", "T9"])] };
    const cob = verificarCoberturaCards(ementa, draft);
    expect(cob.percentual).toBe(75);
    expect(cob.topicosSemCard.map((t) => t.id)).toEqual(["T4"]);
    expect(cob.referenciasInvalidas).toEqual([{ card_id: "C2", topico_id: "T9" }]);
    expect(validarCards(ementa, draft, ["mat1"]).some((x) => x.regra === "topico_sem_card")).toBe(true);
  });
});

const quiz = (id: string, cardId: string, corretaEm = 0) => ({
  id,
  tipo: "quiz" as const,
  pergunta: "Qual é a unidade de medida da tensão elétrica?",
  skill_card_id: cardId,
  opcoes: ["Volt", "Ampere", "Ohm", "Watt"].map((texto, i) => ({
    texto,
    correta: i === corretaEm,
    feedback: i === corretaEm ? "Isso! Tensão é medida em volts (V)." : "Não. Essa unidade mede outra grandeza elétrica.",
  })),
});
const texto = (id: string) => ({ id, tipo: "texto" as const, titulo: null, texto: "Texto curto explicando um conceito importante da aula.", dica: null });

describe("validarAula", () => {
  const aula: Aula = {
    id: "A1",
    modulo_id: "M1",
    titulo: "Tensão e corrente",
    objetivo: "Diferenciar tensão de corrente elétrica.",
    skill_card_ids: ["C1"],
    // Explicação (3 textos) → Prática (3 quizzes, um texto de ponte, mais um quiz).
    blocos: [texto("B1"), texto("B2"), texto("B3"), quiz("B4", "C1"), quiz("B5", "C1", 2), quiz("B6", "C1", 1), texto("B7"), quiz("B8", "C1", 3)],
  };
  const ESTRUTURA = ["aula_curta", "explicacao_curta", "texto_seguido", "desafio_seguido", "desafio_obvio"];

  it("aceita aula bem formada", () => {
    const p = validarAula(aula, new Set(["C1"]), new Set(["M1"]));
    expect(p.filter((x) => x.nivel === "erro")).toEqual([]);
    expect(p.filter((x) => ESTRUTURA.includes(x.regra))).toEqual([]);
  });

  it("exige exatamente uma correta e proíbe 'todas as anteriores'", () => {
    const ruim = quiz("B4", "C1");
    ruim.opcoes[1].correta = true;
    ruim.opcoes[3].texto = "Todas as anteriores";
    const p = validarAula({ ...aula, blocos: [...aula.blocos.slice(0, 3), ruim, ...aula.blocos.slice(4)] }, new Set(["C1"]), new Set(["M1"]));
    expect(p.map((x) => x.regra)).toEqual(expect.arrayContaining(["quiz_1_correta", "opcao_proibida"]));
  });

  it("exige abrir com texto e ter 6+ blocos", () => {
    const p = validarAula({ ...aula, blocos: [quiz("B1", "C1"), quiz("B2", "C1")] }, null, null);
    expect(p.map((x) => x.regra)).toEqual(expect.arrayContaining(["abre_com_texto", "blocos_qtd"]));
  });

  it("6 ou 7 blocos é só aviso; acima de 12 é erro", () => {
    const sete = validarAula({ ...aula, blocos: aula.blocos.slice(0, 7) }, null, null);
    expect(sete.find((x) => x.regra === "aula_curta")?.nivel).toBe("aviso");
    expect(sete.some((x) => x.regra === "blocos_qtd")).toBe(false);
    const treze = [...aula.blocos, ...["B9", "B10", "B11", "B12", "B13"].map((id) => quiz(id, "C1", 1))];
    expect(validarAula({ ...aula, blocos: treze }, null, null).some((x) => x.regra === "blocos_qtd")).toBe(true);
  });

  it("avisa quando o primeiro desafio vem antes de 3 textos de explicação", () => {
    const p = validarAula({ ...aula, blocos: [texto("B1"), quiz("B2", "C1"), ...aula.blocos.slice(2)] }, null, null);
    expect(p.find((x) => x.regra === "explicacao_curta")?.alvo).toBe("B2");
  });

  it("até 5 textos ou 5 desafios seguidos sem aviso; o 6º avisa", () => {
    const ts = (n: number) => Array.from({ length: n }, (_, i) => texto(`T${i + 1}`));
    const qs = (n: number) => Array.from({ length: n }, (_, i) => quiz(`Q${i + 1}`, "C1", i % 4));
    const regras = (blocos: Aula["blocos"]) => validarAula({ ...aula, blocos }, null, null).map((x) => x.regra);
    const ok = regras([...ts(5), ...qs(5)]);
    expect(ok).not.toContain("texto_seguido");
    expect(ok).not.toContain("desafio_seguido");
    expect(regras([...ts(6), ...qs(5)])).toContain("texto_seguido");
    expect(regras([...ts(5), ...qs(6)])).toContain("desafio_seguido");
  });

  it("cobertura: card sem aula vira erro", () => {
    const p = validarAulas(ementa, { cards: [card("C1", ["T1"]), card("C2", ["T2"])] }, { aulas: [aula] });
    expect(p.some((x) => x.regra === "card_sem_aula" && x.alvo === "C2")).toBe(true);
  });
});

describe("novos tipos de bloco", () => {
  const completar = (id: string): BlocoCompletar => ({
    id,
    tipo: "completar",
    texto: "A tensão é medida em [[1]] e a corrente em [[2]].",
    lacunas: [{ resposta: "volts" }, { resposta: "ampères" }],
    distratores: ["ohms"],
    explicacao: "Tensão em volts (V) e corrente em ampères (A).",
    skill_card_id: "C1",
  });
  const ordenar = (id: string): BlocoOrdenar => ({
    id,
    tipo: "ordenar",
    instrucao: "Ordene os passos para trocar uma tomada com segurança:",
    passos: ["Desligar o disjuntor do circuito", "Testar a ausência de tensão", "Trocar a tomada"],
    explicacao: "Primeiro desenergize, depois confirme com o teste e só então mexa na instalação.",
    skill_card_id: "C1",
  });
  const aberta = (id: string): BlocoAberta => ({
    id,
    tipo: "aberta",
    pergunta: "Um cliente reclama que o disjuntor do chuveiro desarma toda vez que liga. O que você faria?",
    dica: null,
    gabarito: {
      resposta_modelo:
        "Desligaria o circuito, verificaria a potência do chuveiro e a bitola do fio, e compararia com a corrente nominal do disjuntor antes de qualquer troca.",
      criterios: [
        { descricao: "Desenergiza o circuito antes de inspecionar", essencial: true },
        { descricao: "Compara potência do chuveiro com o disjuntor e a fiação", essencial: false },
      ],
      erros_comuns: ["Trocar por um disjuntor maior sem checar a fiação"],
      alertas_criticos: ["Aumentar o disjuntor sem trocar o fio (risco de incêndio)"],
    },
    skill_card_id: "C1",
  });
  const base: Aula = {
    id: "A1",
    modulo_id: "M1",
    titulo: "Grandezas elétricas",
    objetivo: "Reconhecer as unidades de tensão e corrente.",
    skill_card_ids: ["C1"],
    blocos: [texto("B1"), completar("B2"), texto("B3"), ordenar("B4"), texto("B5"), aberta("B6")],
  };

  it("aceita aula com completar, ordenar e aberta", () => {
    expect(validarAula(base, new Set(["C1"]), new Set(["M1"])).filter((x) => x.nivel === "erro")).toEqual([]);
  });

  it("a pergunta aberta não conta como desafio corrigível", () => {
    const p = validarAula({ ...base, blocos: [texto("B1"), completar("B2"), texto("B3"), texto("B4"), aberta("B5"), texto("B6")] }, null, null);
    expect(p.map((x) => x.regra)).toContain("poucos_desafios");
  });

  it("permite no máximo uma pergunta aberta", () => {
    const p = validarAula({ ...base, blocos: [...base.blocos, aberta("B7")] }, null, null);
    expect(p.map((x) => x.regra)).toContain("abertas_demais");
  });

  it("confere marcadores de lacuna e opções repetidas", () => {
    const ruim = { ...completar("B2"), texto: "A tensão é medida em [[1]].", distratores: ["Volts"] };
    expect(validarCompletar(ruim).map((x) => x.regra)).toEqual(expect.arrayContaining(["lacunas_marcadores", "opcao_repetida"]));
  });

  it("exige passos suficientes e sem repetição", () => {
    const ruim = { ...ordenar("B4"), passos: ["Desligar o disjuntor", "Desligar o disjuntor"] };
    expect(validarOrdenar(ruim).map((x) => x.regra)).toEqual(expect.arrayContaining(["passos_qtd", "passo_repetido"]));
  });

  it("exige critério essencial no gabarito da aberta", () => {
    const ruim = aberta("B6");
    ruim.gabarito.criterios = ruim.gabarito.criterios.map((c) => ({ ...c, essencial: false }));
    expect(validarAberta(ruim).map((x) => x.regra)).toContain("criterio_essencial");
  });

  it("cobertura conta completar e ordenar, mas não a aberta", () => {
    const soAberta: Aula = { ...base, blocos: [texto("B1"), aberta("B2")] };
    const cards = { cards: [card("C1", ["T1"])] };
    expect(verificarCoberturaAulas(ementa, cards, { aulas: [soAberta] }).cardsSemDesafio).toEqual(["C1"]);
    expect(verificarCoberturaAulas(ementa, cards, { aulas: [base] }).cardsSemDesafio).toEqual([]);
  });
});

describe("visão geral e competências", () => {
  const visao = { curso: "Eletricidade", objetivo_geral: ementa.objetivo_geral, publico_alvo: ementa.publico_alvo, competencias: ementa.competencias };

  it("aceita uma visão completa e acusa a falta de competências", () => {
    expect(validarVisao(visao).filter((x) => x.nivel === "erro")).toEqual([]);
    expect(validarVisao({ ...visao, competencias: [] }).map((x) => x.regra)).toContain("sem_competencias");
  });

  it("aceita competências no formato antigo (texto) ao validar o schema", async () => {
    const { EmentaSchema } = await import("./conteudo");
    const r = EmentaSchema.parse({ ...ementa, competencias: ["Identificar tensão e corrente", "Reconhecer riscos"] });
    expect(r.competencias).toEqual([
      { id: "K1", texto: "Identificar tensão e corrente" },
      { id: "K2", texto: "Reconhecer riscos" },
    ]);
  });

  it("ementa antiga (sem vínculos) não ganha erros de competência", () => {
    expect(validarEmenta(ementa).map((x) => x.regra)).not.toContain("competencia_sem_topico");
  });

  it("cobra competência sem tópico e vínculo inexistente", () => {
    const ligada: Ementa = structuredClone(ementa);
    ligada.modulos[0].topicos[0].competencia_ids = ["K1"];
    ligada.modulos[0].topicos[1].competencia_ids = ["K1", "K9"];
    ligada.modulos[1].topicos[0].competencia_ids = ["K2"];
    const regras = validarEmenta(ligada).map((x) => `${x.regra}:${x.alvo}`);
    expect(regras).toContain("competencia_sem_topico:K3");
    expect(regras).toContain("competencia_inexistente:T2");
    expect(regras).toContain("topico_sem_competencia:T4");
    const cob = verificarCoberturaCompetencias(ligada);
    expect(cob.matriz.K1).toEqual(["T1", "T2"]);
    expect(cob.percentual).toBe(67);
  });
});

describe("desafio óbvio", () => {
  const txt = "Na unidade de medida, a tensão elétrica é o volt, e a corrente é medida em ampère.";
  it("quiz: resposta correta copiada do texto anterior", () => {
    const q = quiz("B2", "C1");
    q.opcoes[0].texto = "A tensão elétrica é o volt";
    expect(desafioObvio(txt, q)).toBe(true);
    expect(desafioObvio(txt, quiz("B2", "C1"))).toBe(false); // "Volt" sozinho não basta
  });
  it("completar: frase do texto com a palavra tirada", () => {
    const base = {
      id: "B3",
      tipo: "completar" as const,
      lacunas: [{ resposta: "volt" }],
      distratores: ["ohm"],
      explicacao: "x".repeat(30),
      skill_card_id: "C1",
    };
    expect(desafioObvio(txt, { ...base, texto: "Na unidade de medida, a tensão elétrica é o [[1]]." })).toBe(true);
    expect(desafioObvio(txt, { ...base, texto: "Um chuveiro ligado em 220 [[1]] puxa mais corrente." })).toBe(false);
  });
  it("vira aviso na validação da aula, mesmo copiando de um texto de vários desafios atrás", () => {
    const q = quiz("B6", "C1");
    q.opcoes[0].texto = "A tensão elétrica é o volt";
    const aula: Aula = {
      id: "A1",
      modulo_id: "M1",
      titulo: "Tensão",
      objetivo: "Reconhecer a unidade de tensão.",
      skill_card_ids: ["C1"],
      blocos: [{ ...texto("B1"), texto: txt }, texto("B2"), texto("B3"), quiz("B4", "C1", 2), quiz("B5", "C1", 1), q, texto("B7"), quiz("B8", "C1", 3)],
    };
    expect(validarAula(aula, null, null).some((x) => x.regra === "desafio_obvio" && x.alvo === "B6")).toBe(true);
  });

  // Casos reais das trilhas publicadas.
  const comOpcoes = (correta: string, erradas: string[]) => {
    const q = quiz("B2", "C1");
    q.opcoes = [correta, ...erradas].map((t, i) => ({ ...q.opcoes[i], texto: t }));
    return q;
  };
  const curto =
    "Curto-circuito é quando a corrente acha um caminho de resistência quase zero, sem passar pela carga. Pela Lei de Ohm, R quase zero gera corrente enorme.";

  it("eco: só a correta repete as palavras da explicação, mesmo com paráfrase", () => {
    const q = comOpcoes("A corrente encontra um caminho de resistência quase zero, sem passar pela carga", [
      "A carga passa a receber uma tensão menor que o normal",
      "A resistência do circuito inteiro aumenta muito",
      "O circuito fica aberto e a corrente para de circular",
    ]);
    expect(desafioObvio(curto, q)).toBe(true);
  });

  it("eco: não marca o desafio que leva o conceito a um caso novo", () => {
    const q = comOpcoes("Dispara, porque quase não há resistência nesse caminho", [
      "Cai, porque o abajur apagou",
      "Para, porque o circuito abriu",
      "Fica igual, porque a tensão da tomada não mudou",
    ]);
    expect(desafioObvio(curto, q)).toBe(false);
  });

  it("eco: não marca resposta de um termo só (classificar um caso pela definição)", () => {
    const flor = "Flor monóclina tem androceu e gineceu; flor díclina tem só um dos dois. O ovário pode ser livre (hipógino) ou soldado ao hipanto (epígino).";
    expect(desafioObvio(flor, comOpcoes("Díclina", ["Hipógina", "Monóclina", "Epígena"]))).toBe(false);
  });
});
