import { describe, expect, it } from "vitest";
import { blocoContextoTrilha, renumerarAulas } from "./agente";
import { paginarTexto } from "./ingestao";
import { blocosDeMateriais, FonteEmMemoria } from "./materiais";
import { SCHEMA_AVALIACAO } from "./revisor";
import { rotularTool } from "./tools/rotulos";

const fonte = new FonteEmMemoria(
  [{ id: "m1", nome: "apostila.md", mime: "text/markdown", paginas: 2 }],
  [
    { material_id: "m1", pagina: 1, texto: "A Lei de Ohm relaciona tensão, corrente e resistência: V = R × I." },
    { material_id: "m1", pagina: 2, texto: "O disjuntor protege o circuito contra curto-circuito e sobrecarga." },
  ],
);

describe("materiais", () => {
  it("busca encontra a página certa (sem acento e sem caixa)", async () => {
    const r = await fonte.buscar("DISJUNTOR curto", 5);
    expect(r[0]).toMatchObject({ material_id: "m1", pagina: 2 });
  });

  it("monta documentos com marcadores de página e material_id no contexto", async () => {
    const { blocos, modoBusca } = await blocosDeMateriais(fonte);
    expect(modoBusca).toBe(false);
    const doc = blocos[0] as { type: string; source: { data: string }; context: string };
    expect(doc.type).toBe("document");
    expect(doc.source.data).toContain("[[página 2]]");
    expect(doc.context).toContain("material_id: m1");
  });

  it("pagina texto corrido respeitando parágrafos", () => {
    const texto = Array.from({ length: 10 }, (_, i) => `Parágrafo ${i} ${"x".repeat(900)}`).join("\n\n");
    const paginas = paginarTexto(texto, 3200);
    expect(paginas.length).toBeGreaterThan(2);
    expect(paginas.every((p) => p.length <= 3700)).toBe(true);
  });
});

describe("orquestração", () => {
  it("renumera aulas e blocos dos workers sem colisão", () => {
    const aula = (id: string, blocos: string[]) => ({
      id,
      modulo_id: "M1",
      titulo: "t",
      objetivo: "o",
      skill_card_ids: ["C1"],
      blocos: blocos.map((b) => ({ id: b, tipo: "texto" as const, titulo: null, texto: "x", dica: null })),
    });
    const r = renumerarAulas([aula("M1-A1", ["M1-B1", "M1-B2"]), aula("M2-A1", ["M2-B1"])]);
    expect(r.map((a) => a.id)).toEqual(["A1", "A2"]);
    expect(r.flatMap((a) => a.blocos.map((b) => b.id))).toEqual(["B1", "B2", "B3"]);
  });

  it("rotula ações para a UI", () => {
    expect(rotularTool("buscar_nos_materiais", { consulta: "NR-10" })).toBe("🔎 Buscou “NR-10”");
  });
});

describe("revisor", () => {
  it("envia a gravidade como enum no schema da saída estruturada", () => {
    const s = SCHEMA_AVALIACAO as unknown as {
      $schema?: string;
      additionalProperties: boolean;
      properties: { problemas: { items: { additionalProperties: boolean; properties: { gravidade: { enum: string[] } } } } };
    };
    expect(s.$schema).toBeUndefined();
    expect(s.additionalProperties).toBe(false);
    const problema = s.properties.problemas.items;
    expect(problema.additionalProperties).toBe(false);
    expect(problema.properties.gravidade.enum).toEqual(["alta", "media", "baixa"]);
  });
});

describe("contexto da trilha", () => {
  it("lista produto, trilha e a orientação do criador", () => {
    const bloco = blocoContextoTrilha({
      produto: "Revoluções que mudaram o mundo",
      titulo: "Circuitos residenciais",
      descricao: null,
      objetivo: "  Dimensionar circuitos com segurança.  ",
      conteudos: "Só os capítulos 3 a 5",
    });
    expect(bloco).toContain("SOBRE ESTA TRILHA");
    expect(bloco).toContain("- Produto: Revoluções que mudaram o mundo");
    expect(bloco).toContain("- Objetivo da trilha: Dimensionar circuitos com segurança.");
    expect(bloco).toContain("- Conteúdos a considerar (recorte do material): Só os capítulos 3 a 5");
    expect(bloco).not.toContain("Descrição");
  });

  it("omite os campos vazios", () => {
    const bloco = blocoContextoTrilha({ produto: "Lógica para todos", titulo: "Algoritmos", objetivo: "  ", conteudos: null });
    expect(bloco.split("\n")).toEqual([
      "SOBRE ESTA TRILHA (cadastrado pelo professor; vale para todas as etapas):",
      "- Produto: Lógica para todos",
      "- Trilha: Algoritmos",
    ]);
  });
});

describe("visão geral", () => {
  const atuais = [
    { id: "K1", texto: "Identificar grandezas" },
    { id: "K2", texto: "Calcular potência" },
  ];

  it("mantém os ids que continuam e dá o próximo K às novas", async () => {
    const { atribuirIds } = await import("./visao");
    const r = atribuirIds(
      [
        { id: "K2", texto: "Calcular potência e energia" },
        { id: null, texto: "Estimar consumo" },
        { id: "K9", texto: "Id desconhecido vira novo" },
        { id: "K2", texto: "Id repetido vira novo" },
      ],
      atuais,
    );
    expect(r.map((c) => c.id)).toEqual(["K2", "K3", "K4", "K5"]);
  });

  it("marca o que mudou para a tela", async () => {
    const { mudancasVisao } = await import("./visao");
    const base = { curso: "X", objetivo_geral: "Obj", publico_alvo: "P", competencias: atuais };
    const depois = {
      ...base,
      objetivo_geral: "Outro",
      competencias: [
        { id: "K1", texto: "Identificar grandezas elétricas" },
        { id: "K3", texto: "Nova" },
      ],
    };
    expect(mudancasVisao(base, depois)).toEqual({ visao: "alterado", K1: "alterado", K3: "adicionado", K2: "removido" });
  });
});

describe("visão geral: primeira geração", () => {
  it("marca a visão como nova, não alterada", async () => {
    const { mudancasVisao } = await import("./visao");
    const vazia = { curso: "", objetivo_geral: "", publico_alvo: "", competencias: [] };
    const nova = { ...vazia, curso: "X", objetivo_geral: "Obj", competencias: [{ id: "K1", texto: "Uma" }] };
    expect(mudancasVisao(vazia, nova)).toEqual({ visao: "adicionado", K1: "adicionado" });
  });
});

describe("geração de aulas por módulo (contexto enxuto)", () => {
  const card = (id: string, topico: string) => ({ id, titulo: `Card ${id}`, conceito: "c", pontos_chave: [], exemplo: "e", topico_ids: [topico], fontes: [] });
  const ementa = {
    curso: "X",
    objetivo_geral: "O",
    publico_alvo: "P",
    competencias: [],
    modulos: [
      { id: "M1", titulo: "Um", descricao: "d", topicos: [{ id: "T1", titulo: "t1", descricao: "d", fontes: [] }] },
      { id: "M2", titulo: "Dois", descricao: "d", topicos: [{ id: "T2", titulo: "t2", descricao: "d", fontes: [] }] },
    ],
  };
  const cards = { cards: [card("C1", "T1"), card("C2", "T2")] };

  it("com escopo, só os cards do módulo vão para a parte do módulo; a estrutura fica inteira", async () => {
    const { partesContextoAprovado, contextoAprovado } = await import("./agente");
    const p = partesContextoAprovado("aulas", ementa, cards, undefined, "M1");
    expect(p.comum).toContain("M2 Dois");
    expect(p.comum).not.toContain("CARDS DE CONHECIMENTO");
    expect(p.modulo).toContain('"C1"');
    expect(p.modulo).not.toContain('"C2"');
    const completo = contextoAprovado("aulas", ementa, cards)!;
    expect(completo).toContain('"C1"');
    expect(completo).toContain('"C2"');
  });

  it("prefixo: um ponto de cache na parte comum e outro na do módulo (nunca mais que 2)", async () => {
    const { montarPrefixo } = await import("./agente");
    const pontos = (b: unknown[]) => b.filter((x) => (x as { cache_control?: unknown }).cache_control).length;
    const materiais = [{ type: "text" as const, text: "material" }];
    expect(pontos(montarPrefixo({ trilha: "T", materiais, comum: "estrutura", modulo: "cards" }))).toBe(2);
    expect(pontos(montarPrefixo({ trilha: null, materiais, comum: "tudo", modulo: null }))).toBe(1);
    // O bloco de material compartilhado com o revisor não é alterado.
    expect((materiais[0] as { cache_control?: unknown }).cache_control).toBeUndefined();
  });

  it("os workers recebem só tools que existem, sem as de nível de aula nem a de reler o rascunho", async () => {
    const { TOOLS_GERACAO_AULAS, toolsAulas } = await import("./tools/aulas");
    const { toolsComuns } = await import("./tools/comuns");
    const { Workspace } = await import("./workspace");
    const ws = new Workspace("aulas", { ementa, cards, aulas: { aulas: [] } }, [], () => {});
    const ctx = {
      ws,
      fonte,
      emit: () => {},
      acoes: [],
      revisar: async () => ({}) as never,
      revisoes: { feitas: 0, limite: 1, ultima: null },
      escopoModulo: "M1",
      prefixoIds: "M1-",
      rotular: () => "",
    };
    const nomes = [...toolsComuns(ctx), ...toolsAulas(ctx)].map((t) => t.name);
    for (const n of TOOLS_GERACAO_AULAS) expect(nomes).toContain(n);
    for (const n of ["adicionar_aula", "editar_aula", "mover_aula", "remover_aula", "ver_rascunho", "substituir_bloco", "editar_quiz"])
      expect(TOOLS_GERACAO_AULAS).not.toContain(n);
    expect(TOOLS_GERACAO_AULAS).toContain("corrigir_aulas");

    // Aula válida: a validação volta curta.
    const tools = Object.fromEntries(toolsAulas(ctx).map((t) => [t.name, t]));
    await tools.planejar_aulas.run({ aulas: [{ modulo_id: "M1", titulo: "Aula", objetivo: "o", skill_card_ids: ["C1"] }] });
    const aulaId = ws.aulas.aulas[0].id;
    const r = await tools.escrever_aula.run({ aula_id: aulaId, blocos: [{ tipo: "texto", titulo: null, texto: "curto", dica: null }] });
    expect(String(r)).toContain("erro"); // texto curto demais e sem desafios: a lista de pendências aparece

    // corrigir_aulas aplica o lote; uma correção inválida não impede as outras.
    const bloco = ws.aulas.aulas[0].blocos[0].id;
    const lote = String(
      await tools.corrigir_aulas.run({
        correcoes: [
          { acao: "editar_texto", bloco_id: bloco, texto: "Um texto novo, um pouco maior, para a aula de teste." },
          { acao: "remover_bloco", bloco_id: "M1-B999" },
          {
            acao: "inserir_bloco",
            aula_id: aulaId,
            apos_bloco_id: bloco,
            bloco: { tipo: "texto", titulo: null, texto: "Outro bloco de texto da aula.", dica: null },
          },
        ],
      }),
    );
    expect(lote).toContain("1. ✅");
    expect(lote).toContain("2. ❌");
    expect(lote).toContain("3. ✅");
    expect(ws.aulas.aulas[0].blocos).toHaveLength(2);
    expect(ws.aulas.aulas[0].blocos[0]).toMatchObject({ texto: "Um texto novo, um pouco maior, para a aula de teste." });
  });

  it("acentos escapados pelo modelo (\\u00e7 literal) chegam decodificados; o que já estava salvo vira pendência", async () => {
    const { toolsAulas } = await import("./tools/aulas");
    const { Workspace } = await import("./workspace");
    const { validarWorkspace } = await import("./validacoes");
    const ws = new Workspace("aulas", { ementa, cards, aulas: { aulas: [] } }, [], () => {});
    const ctx = {
      ws,
      fonte,
      emit: () => {},
      acoes: [],
      revisar: async () => ({}) as never,
      revisoes: { feitas: 0, limite: 1, ultima: null },
      escopoModulo: "M1",
      prefixoIds: "M1-",
      rotular: () => "",
    };
    const tools = Object.fromEntries(toolsAulas(ctx).map((t) => [t.name, t]));
    await tools.planejar_aulas.run({ aulas: [{ modulo_id: "M1", titulo: "Introdu\\u00e7\\u00e3o", objetivo: "o", skill_card_ids: ["C1"] }] });
    await tools.escrever_aula.run({
      aula_id: ws.aulas.aulas[0].id,
      blocos: [{ tipo: "texto", titulo: null, texto: "Aten\\u00e7\\u00e3o \\u00e0 tens\\u00e3o.", dica: null }],
    });
    expect(ws.aulas.aulas[0].titulo).toBe("Introdução");
    expect(ws.aulas.aulas[0].blocos[0]).toMatchObject({ texto: "Atenção à tensão." });
    expect(validarWorkspace(ws).some((p) => p.regra === "escape_unicode")).toBe(false);

    ws.aulas.aulas[0].objetivo = "Plat\\u00e3o";
    const pend = validarWorkspace(ws).filter((p) => p.regra === "escape_unicode");
    expect(pend).toEqual([expect.objectContaining({ nivel: "erro", alvo: ws.aulas.aulas[0].id })]);
    expect(pend[0].mensagem).toContain('"objetivo"');
  });
});
