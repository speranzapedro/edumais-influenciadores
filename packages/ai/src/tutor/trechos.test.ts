import type { Bloco, Ementa } from "@edu/core";
import { describe, expect, it } from "vitest";
import {
  type ConteudoTrilha,
  estruturar,
  montarMapa,
  montarSecoes,
  nivelTitulo,
  removerCabecalhosRodapes,
  TAMANHO_TRECHO,
  trechosDeAula,
  trechosDeMaterial,
} from "./trechos";

const ementa: Ementa = {
  curso: "Eletricidade",
  objetivo_geral: "Instalar circuitos com segurança.",
  publico_alvo: "Alunos do técnico",
  competencias: [{ id: "K1", texto: "Ler esquemas" }],
  modulos: [
    { id: "M1", titulo: "Fundamentos", descricao: "Base da eletricidade", topicos: [{ id: "T1", titulo: "Lei de Ohm", descricao: "V = R × I", fontes: [] }] },
  ],
};

const blocos: Bloco[] = [
  { id: "B1", tipo: "texto", titulo: "Lei de Ohm", texto: "A tensão é o produto da resistência pela corrente.", dica: "Lembre do triângulo VRI." },
  {
    id: "B2",
    tipo: "quiz",
    pergunta: "Qual a corrente em 10 V sobre 5 Ω?",
    opcoes: [
      { texto: "2 A", correta: true, feedback: "Isso: I = V/R = 2 A." },
      { texto: "50 A", correta: false, feedback: "Você multiplicou." },
    ],
    skill_card_id: "C1",
  },
  {
    id: "B3",
    tipo: "completar",
    texto: "A unidade de resistência é o [[1]].",
    lacunas: [{ resposta: "ohm" }],
    distratores: ["volt"],
    explicacao: "Resistência se mede em ohm.",
    skill_card_id: "C1",
  },
  {
    id: "B4",
    tipo: "ordenar",
    instrucao: "Ordene os passos para medir corrente.",
    passos: ["Desligar o circuito", "Abrir o circuito", "Ligar o amperímetro em série"],
    explicacao: "Primeiro desligue.",
    skill_card_id: "C1",
  },
  {
    id: "B5",
    tipo: "aberta",
    pergunta: "Explique por que o amperímetro vai em série no circuito.",
    dica: null,
    gabarito: {
      resposta_modelo: "Porque toda a corrente precisa passar por ele.",
      criterios: [{ descricao: "Cita a corrente", essencial: true }],
      erros_comuns: ["Dizer paralelo"],
      alertas_criticos: [],
    },
    skill_card_id: "C1",
  },
];

describe("limpeza e estrutura", () => {
  it("remove cabeçalho/rodapé repetidos e números de página", () => {
    const paginas = [1, 2, 3, 4, 5].map(
      (n) => `Apostila FAETEC — Eletricidade\nIntrodução ao tema ${n}.\nConteúdo da página ${n} sobre circuitos.\nMais texto ${n}.\nPágina ${n} de 5`,
    );
    const limpas = removerCabecalhosRodapes(paginas);
    expect(limpas.every((p) => !p.includes("Apostila FAETEC"))).toBe(true);
    expect(limpas.every((p) => !/Página \d de 5/.test(p))).toBe(true);
    expect(limpas[2]).toContain("Conteúdo da página 3");
  });

  it("reconhece títulos e rejeita citações, legendas, sumário e itens de lista", () => {
    expect(nivelTitulo("CAPÍTULO I")).toBe(1);
    expect(nivelTitulo("DIREITOS")).toBe(2);
    expect(nivelTitulo("DAS RELAÇÕES COM A PESSOA.")).toBe(2);
    expect(nivelTitulo("1 INTRODUÇÃO")).toBe(1);
    expect(nivelTitulo("2.3.1 História e evolução filosófica")).toBe(3);
    expect(nivelTitulo("## Lei de Ohm")).toBe(2);
    expect(nivelTitulo("(CASANOVA, 2014).")).toBeNull();
    expect(nivelTitulo("QUADRO 2 – TIPOS DE MEMORANDOS")).toBeNull();
    expect(nivelTitulo("2.3 ÉTICA ........................ 30")).toBeNull();
    expect(nivelTitulo("2. Focalizada")).toBeNull();
    expect(nivelTitulo("Art. 10 - Recusar-se a executar atividades que não sejam de sua competência técnica,")).toBeNull();
  });

  it("junta linhas quebradas, desfaz hifenização e preserva listas", () => {
    const u = estruturar([{ pagina: 1, texto: "O disjuntor protege o circui-\nto contra sobrecarga e\ncurto-circuito.\n- Item um\n- Item dois" }]);
    expect(u.map((x) => x.texto)).toEqual(["O disjuntor protege o circuito contra sobrecarga e curto-circuito.", "- Item um", "- Item dois"]);
  });
});

describe("trechos", () => {
  it("material: trechos dentro dos limites, com páginas e caminho pelos títulos", () => {
    const paragrafo = "A corrente elétrica é o fluxo ordenado de elétrons em um condutor. ".repeat(12);
    const paginas = [
      { pagina: 1, texto: `CAPÍTULO 1\nCORRENTE\n${paragrafo}\n\n${paragrafo}` },
      { pagina: 2, texto: `TENSÃO\n${paragrafo}` },
    ];
    const ts = trechosDeMaterial({ id: "m1", nome: "apostila_eletricidade.pdf", paginas });
    expect(ts.length).toBeGreaterThan(1);
    expect(ts.every((t) => t.texto.length <= TAMANHO_TRECHO.maximo + 200)).toBe(true);
    expect(ts[0].caminho).toBe("Apostila eletricidade › CAPÍTULO 1 › CORRENTE");
    expect(ts.at(-1)!.caminho).toBe("Apostila eletricidade › CAPÍTULO 1 › TENSÃO");
    expect(ts.at(-1)!.pagina_inicio).toBe(2);
  });

  it("material: trecho que junta seções curtas cita o caminho comum a elas", () => {
    const ts = trechosDeMaterial({
      id: "m1",
      nome: "marketing.md",
      paginas: [
        {
          pagina: 1,
          texto:
            "# Marketing digital\n\n## Redes sociais\nPublique com frequência e responda mensagens em até um dia.\n\n## Tráfego pago\nComece com orçamento pequeno e meça o custo por contato.",
        },
      ],
    });
    expect(ts).toHaveLength(1);
    expect(ts[0].caminho).toBe("Marketing › Marketing digital");
  });

  it("material: descarta referências bibliográficas", () => {
    const ts = trechosDeMaterial({
      id: "m1",
      nome: "x.pdf",
      paginas: [
        {
          pagina: 1,
          texto: `INTRODUÇÃO\n${"Texto útil sobre ética profissional na enfermagem. ".repeat(10)}\nREFERÊNCIAS\nBRASIL. Lei número tal, de 1986. Dispõe sobre o exercício.\nSILVA, J. Ética. São Paulo: Editora, 2010.`,
        },
      ],
    });
    expect(ts.map((t) => t.texto).join(" ")).not.toContain("SILVA, J.");
  });

  it("aula: nunca indexa gabarito, só enunciados, marcados como avaliativos", () => {
    const ts = trechosDeAula({
      id: "a1",
      ordem: 3,
      modulo_id: "M1",
      modulo_titulo: "Fundamentos",
      titulo: "Lei de Ohm",
      objetivo: "Calcular corrente.",
      blocos,
    });
    const tudo = ts.map((t) => t.texto).join("\n");
    expect(tudo).toContain("A tensão é o produto");
    expect(tudo).toContain("Qual a corrente em 10 V sobre 5 Ω?");
    expect(tudo).toContain("A unidade de resistência é o ____.");
    for (const vazamento of ["2 A", "Isso: I = V/R", "ohm.", "Desligar o circuito", "Primeiro desligue", "toda a corrente precisa passar", "Dizer paralelo"]) {
      expect(tudo).not.toContain(vazamento);
    }
    const comEscape = trechosDeAula({
      id: "a2",
      ordem: 1,
      modulo_id: "M1",
      modulo_titulo: null,
      titulo: "T",
      objetivo: null,
      blocos: [{ ...blocos[1], pergunta: "Qual conta voc\\u00ea faz?" } as Bloco],
    });
    expect(comEscape[0].texto).toContain("Qual conta você faz?");
    const exercicios = ts.find((t) => t.avaliativo)!;
    expect(exercicios.caminho).toBe("Fundamentos › Aula 3: Lei de Ohm › Exercícios");
    expect(ts.filter((t) => !t.avaliativo).every((t) => !t.texto.includes("Quiz:"))).toBe(true);
  });

  it("seções têm hash estável e mudam quando o conteúdo ou o modelo muda", () => {
    const conteudo: ConteudoTrilha = {
      titulo: "Eletricidade",
      descricao: null,
      ementa,
      materiais: [{ id: "m1", nome: "a.md", paginas: [{ pagina: 1, texto: "Texto sobre a Lei de Ohm e circuitos elétricos residenciais simples." }] }],
      aulas: [{ id: "a1", ordem: 1, modulo_id: "M1", modulo_titulo: "Fundamentos", titulo: "Lei de Ohm", objetivo: null, blocos }],
      cards: [{ id: "c1", titulo: "Lei de Ohm", conceito: "V = R × I", pontos_chave: ["Tensão", "Corrente"], exemplo: null, topico_ids: ["T1"] }],
    };
    const a = montarSecoes(conteudo, "modelo-x");
    expect(a.map((s) => s.chave)).toEqual(["material:m1:1", "aula:a1", "cards:M1:1"]);
    expect(montarSecoes(conteudo, "modelo-x").map((s) => s.hash)).toEqual(a.map((s) => s.hash));
    expect(montarSecoes(conteudo, "modelo-y")[0].hash).not.toBe(a[0].hash);
    const alterado = { ...conteudo, cards: [{ ...conteudo.cards[0], conceito: "V = R × I (alterado)" }] };
    const b = montarSecoes(alterado, "modelo-x");
    expect(b[0].hash).toBe(a[0].hash);
    expect(b[2].hash).not.toBe(a[2].hash);
    expect(a[2].trechos[0].caminho).toBe("Fundamentos › Card: Lei de Ohm");

    const mapa = montarMapa(conteudo);
    expect(mapa).toContain("## Módulo 1: Fundamentos");
    expect(mapa).toContain("- Aula 1: Lei de Ohm");
    expect(mapa).toContain("Cards de Conhecimento: Lei de Ohm");
  });
});
