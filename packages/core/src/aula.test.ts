import { describe, expect, it } from "vitest";
import { apurarTentativa, blocoParaAluno, corrigirCompletar, corrigirDesafio, corrigirOrdenar, corrigirQuiz, embaralhar, rotuloBlocoTexto } from "./aula";
import type { BlocoAberta, BlocoCompletar, BlocoOrdenar, BlocoQuiz } from "./conteudo";

const quiz: BlocoQuiz = {
  id: "B1",
  tipo: "quiz",
  pergunta: "Qual a unidade de tensão elétrica?",
  skill_card_id: "C1",
  opcoes: [
    { texto: "Ampère", correta: false, feedback: "Ampère mede corrente." },
    { texto: "Volt", correta: true, feedback: "Isso! Tensão é medida em volts." },
  ],
};

const completar: BlocoCompletar = {
  id: "5b0f8a52-7d0e-4a3c-9a55-1f1c2b3d4e5f",
  tipo: "completar",
  texto: "Copas representa emoções, enquanto [[1]] se relaciona a bens materiais e [[2]] a ação.",
  lacunas: [{ resposta: "Ouros" }, { resposta: "Paus" }],
  distratores: ["Espadas"],
  explicacao: "Ouros é o naipe material e Paus o da ação.",
  skill_card_id: "C1",
};

const ordenar: BlocoOrdenar = {
  id: "9c1e2d3f-1111-4a3c-9a55-1f1c2b3d4e5f",
  tipo: "ordenar",
  instrucao: "Ordene os passos:",
  passos: ["Desligar o disjuntor", "Testar ausência de tensão", "Trocar a tomada", "Religar e testar"],
  explicacao: "Desenergize, confirme, troque e só então religue.",
  skill_card_id: "C1",
};

const aberta: BlocoAberta = {
  id: "B9",
  tipo: "aberta",
  pergunta: "Um paciente chega com dor no braço. O que você faria primeiro?",
  dica: "Pense na avaliação inicial.",
  gabarito: {
    resposta_modelo: "Avaliaria sinais vitais e características da dor.",
    criterios: [{ descricao: "Avalia antes de intervir", essencial: true }],
    erros_comuns: ["Medicar sem prescrição"],
    alertas_criticos: ["Administrar medicamento sem prescrição"],
  },
  skill_card_id: "C1",
};

describe("player com correção no servidor", () => {
  it("não envia gabarito nem feedback ao aluno", () => {
    const b = blocoParaAluno(quiz);
    expect(JSON.stringify(b)).not.toContain("correta");
    expect(JSON.stringify(b)).not.toContain("feedback");
    expect(b).toEqual({ id: "B1", tipo: "quiz", pergunta: quiz.pergunta, opcoes: [{ texto: "Ampère" }, { texto: "Volt" }] });
  });

  it("corrige a opção escolhida e aponta a correta", () => {
    expect(corrigirQuiz(quiz, 0)).toEqual({ tipo: "quiz", correta: false, feedback: "Ampère mede corrente.", indiceCorreto: 1 });
    expect(corrigirQuiz(quiz, 1).correta).toBe(true);
    expect(() => corrigirQuiz(quiz, 5)).toThrow();
    expect(() => corrigirQuiz(quiz, 0.5)).toThrow();
  });

  it("apura acertos só com todos os desafios respondidos", () => {
    expect(apurarTentativa(["B1", "B2"], [{ bloco_id: "B1", correta: true }])).toEqual({ total: 2, acertos: 1, completa: false });
    expect(
      apurarTentativa(
        ["B1", "B2"],
        [
          { bloco_id: "B1", correta: true },
          { bloco_id: "B2", correta: false },
          { bloco_id: "X9", correta: true },
        ],
      ),
    ).toEqual({ total: 2, acertos: 1, completa: true });
    expect(apurarTentativa([], [])).toEqual({ total: 0, acertos: 0, completa: true });
  });
});

describe("embaralhamento determinístico", () => {
  it("é estável para a mesma semente e é uma permutação válida", () => {
    const a = embaralhar(6, "x");
    expect(embaralhar(6, "x")).toEqual(a);
    expect([...a].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("nunca devolve a identidade com 2+ itens", () => {
    for (let i = 0; i < 200; i++) {
      const p = embaralhar(3, `s${i}`);
      expect(p.every((v, k) => v === k)).toBe(false);
    }
  });
});

describe("completar lacunas", () => {
  const aluno = blocoParaAluno(completar);

  it("envia as opções embaralhadas e sem gabarito", () => {
    if (aluno.tipo !== "completar") throw new Error();
    expect([...aluno.opcoes].sort()).toEqual(["Espadas", "Ouros", "Paus"]);
    expect(aluno.nLacunas).toBe(2);
    expect(JSON.stringify(aluno)).not.toContain("explicacao");
    expect(JSON.stringify(aluno)).not.toContain("resposta");
  });

  it("corrige pelas opções que o aluno viu", () => {
    if (aluno.tipo !== "completar") throw new Error();
    const idx = (t: string) => aluno.opcoes.indexOf(t);
    const certo = corrigirCompletar(completar, [idx("Ouros"), idx("Paus")]);
    expect(certo).toMatchObject({ tipo: "completar", correta: true, porLacuna: [true, true] });
    const errado = corrigirCompletar(completar, [idx("Ouros"), idx("Espadas")]);
    expect(errado).toMatchObject({ correta: false, porLacuna: [true, false], respostasCorretas: ["Ouros", "Paus"] });
  });

  it("rejeita respostas malformadas", () => {
    expect(() => corrigirCompletar(completar, [0])).toThrow();
    expect(() => corrigirCompletar(completar, [0, 0])).toThrow();
    expect(() => corrigirCompletar(completar, [0, 9])).toThrow();
  });
});

describe("ordenar passos", () => {
  const aluno = blocoParaAluno(ordenar);

  it("envia os passos fora da ordem correta", () => {
    if (aluno.tipo !== "ordenar") throw new Error();
    expect(aluno.passos).not.toEqual(ordenar.passos);
    expect([...aluno.passos].sort()).toEqual([...ordenar.passos].sort());
  });

  it("corrige a ordem montada pelo aluno", () => {
    if (aluno.tipo !== "ordenar") throw new Error();
    const certa = ordenar.passos.map((p) => aluno.passos.indexOf(p));
    expect(corrigirOrdenar(ordenar, certa)).toMatchObject({ tipo: "ordenar", correta: true });
    const exibida = aluno.passos.map((_, i) => i);
    const r = corrigirOrdenar(ordenar, exibida);
    expect(r.correta).toBe(false);
    expect(r.ordemCorreta).toEqual(ordenar.passos);
    expect(() => corrigirOrdenar(ordenar, [0, 1, 2])).toThrow();
  });

  it("corrigirDesafio recusa resposta de outro tipo", () => {
    expect(() => corrigirDesafio(ordenar, { tipo: "quiz", opcao: 0 })).toThrow();
  });
});

describe("pergunta aberta", () => {
  it("nunca envia o gabarito ao navegador", () => {
    const b = blocoParaAluno(aberta);
    expect(b).toEqual({ id: "B9", tipo: "aberta", pergunta: aberta.pergunta, dica: aberta.dica });
    expect(JSON.stringify(b)).not.toContain("gabarito");
  });
});

describe("rótulo do bloco de texto para o aluno", () => {
  it("troca ou remove os nomes internos do roteiro e mantém os demais", () => {
    expect(rotuloBlocoTexto("Gancho")).toBe("Para começar");
    expect(rotuloBlocoTexto("Conceito")).toBeNull();
    expect(rotuloBlocoTexto("conceito 2")).toBeNull();
    expect(rotuloBlocoTexto("Explicação")).toBeNull();
    expect(rotuloBlocoTexto("Prática")).toBeNull();
    expect(rotuloBlocoTexto("Aplicação:")).toBe("Na prática");
    expect(rotuloBlocoTexto("Atenção!")).toBe("Atenção!");
    expect(rotuloBlocoTexto(null)).toBeNull();
  });
});
