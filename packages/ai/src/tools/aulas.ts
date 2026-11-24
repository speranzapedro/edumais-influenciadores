import {
  type Aula,
  type Bloco,
  type CardsDraft,
  CriterioAbertaSchema,
  OpcaoQuizSchema,
  proximoCodigo,
  todosTopicos,
  validarAula,
  validarAulas,
  verificarCoberturaAulas,
} from "@edu/core";
import { z } from "zod";
import { type ContextoTools, ErroTool, exigir, ferramenta, formatarPendencias } from "./base";

const BlocoTextoIn = z.object({
  tipo: z.literal("texto"),
  titulo: z.string().nullable().describe("rótulo curto para o aluno (ex.: 'Na prática', 'Atenção!') ou null; nunca 'Explicação', 'Prática', 'Gancho' etc."),
  texto: z.string().describe("40 a 320 caracteres, uma ideia"),
  dica: z.string().nullable().describe("macete/alerta opcional (até 160 caracteres) ou null"),
});

const BlocoQuizIn = z.object({
  tipo: z.literal("quiz"),
  pergunta: z.string(),
  opcoes: z.array(OpcaoQuizSchema).describe("exatamente 4 opções, 1 correta, feedback em todas"),
  skill_card_id: z.string().describe("card avaliado por este quiz"),
});

const BlocoCompletarIn = z.object({
  tipo: z.literal("completar"),
  texto: z
    .string()
    .describe(
      "frase de 20 a 280 caracteres com 1 a 3 lacunas marcadas como [[1]], [[2]], [[3]], em ordem (ex.: 'A tensão é medida em [[1]] e a corrente em [[2]].')",
    ),
  lacunas: z.array(z.object({ resposta: z.string().describe("palavra ou termo curto que completa a lacuna") })).describe("uma por marcador, na mesma ordem"),
  distratores: z.array(z.string()).describe("1 a 3 termos plausíveis do mesmo tipo que NÃO completam nenhuma lacuna"),
  explicacao: z.string().describe("25 a 280 caracteres: por que essas são as palavras certas"),
  skill_card_id: z.string().describe("card avaliado"),
});

const BlocoOrdenarIn = z.object({
  tipo: z.literal("ordenar"),
  instrucao: z.string().describe("15 a 220 caracteres (ex.: 'Ordene os passos para trocar uma tomada com segurança:')"),
  passos: z.array(z.string()).describe("3 a 6 passos curtos (até 120 caracteres), JÁ NA ORDEM CORRETA — o sistema embaralha para o aluno"),
  explicacao: z.string().describe("25 a 280 caracteres: a lógica da sequência"),
  skill_card_id: z.string().describe("card avaliado"),
});

const BlocoAbertaIn = z.object({
  tipo: z.literal("aberta"),
  pergunta: z.string().describe("situação-problema realista, 30 a 400 caracteres, que pede o que o aluno faria e por quê"),
  dica: z.string().nullable().describe("pista curta opcional (até 160 caracteres) ou null"),
  gabarito: z
    .object({
      resposta_modelo: z.string().describe("80 a 800 caracteres: a resposta que um bom aluno daria, fiel ao card e ao material"),
      criterios: z.array(CriterioAbertaSchema).describe("2 a 5 critérios verificáveis na resposta; marque essencial=true no que não pode faltar (ao menos 1)"),
      erros_comuns: z.array(z.string()).describe("0 a 4 erros comuns reais de alunos nessa situação"),
      alertas_criticos: z
        .array(z.string())
        .describe("condutas perigosas (segurança do paciente/trabalhador/cliente) que tornam a resposta inadequada; [] se não houver"),
    })
    .describe("gabarito usado pelo tutor de IA para dar feedback; o aluno nunca vê"),
  skill_card_id: z.string().describe("card principal mobilizado pela pergunta"),
});

const BlocoIn = z.discriminatedUnion("tipo", [BlocoTextoIn, BlocoQuizIn, BlocoCompletarIn, BlocoOrdenarIn, BlocoAbertaIn]);

const EditarTextoIn = z.object({
  bloco_id: z.string(),
  titulo: z.string().nullable().optional(),
  texto: z.string().optional(),
  dica: z.string().nullable().optional(),
});
const EditarQuizIn = z.object({
  bloco_id: z.string(),
  pergunta: z.string().optional(),
  opcoes: z.array(OpcaoQuizSchema).optional().describe("as 4 opções completas, se for mudar alguma"),
  skill_card_id: z.string().optional(),
});
const InserirBlocoIn = z.object({ aula_id: z.string(), apos_bloco_id: z.string().nullable().describe("null = no início da aula"), bloco: BlocoIn });
const SubstituirBlocoIn = z.object({ bloco_id: z.string(), bloco: BlocoIn.describe("o bloco completo") });
const RemoverBlocoIn = z.object({ bloco_id: z.string() });
const ReordenarBlocosIn = z.object({ aula_id: z.string(), bloco_ids: z.array(z.string()).describe("todos os ids da aula, na nova ordem") });

/** Uma correção do lote de corrigir_aulas (mesmos campos das tools individuais + a ação). */
const CorrecaoIn = z.discriminatedUnion("acao", [
  EditarTextoIn.extend({ acao: z.literal("editar_texto") }),
  EditarQuizIn.extend({ acao: z.literal("editar_quiz") }),
  SubstituirBlocoIn.extend({ acao: z.literal("substituir_bloco") }),
  InserirBlocoIn.extend({ acao: z.literal("inserir_bloco") }),
  RemoverBlocoIn.extend({ acao: z.literal("remover_bloco") }),
  ReordenarBlocosIn.extend({ acao: z.literal("reordenar_blocos") }),
]);

const AulaPlanoIn = z.object({
  modulo_id: z.string(),
  titulo: z.string(),
  objetivo: z.string().describe("o que o aluno consegue fazer ao final (1 frase)"),
  skill_card_ids: z.array(z.string()).min(1).max(4),
});

/**
 * Tools oferecidas aos workers de aulas na geração (um por módulo). As correções vão todas por
 * corrigir_aulas, em lote: cada chamada ao modelo relê o contexto inteiro, então aplicar várias correções
 * numa chamada só é o que barateia — e cada uma é a menor edição (reescrever a aula gera texto, o que mais
 * custa). Ficam de fora as tools de nível de aula e a de reler o rascunho: o worker escreveu tudo.
 */
export const TOOLS_GERACAO_AULAS = [
  "listar_materiais",
  "buscar_nos_materiais",
  "ler_paginas",
  "revisar_qualidade",
  "planejar_aulas",
  "escrever_aula",
  "corrigir_aulas",
  "validar_aulas",
];

/** Módulo "dono" de cada card (o do seu primeiro tópico). */
export function moduloDoCard(ementaTopicos: Map<string, string>, card: { topico_ids: string[] }) {
  for (const t of card.topico_ids) {
    const m = ementaTopicos.get(t);
    if (m) return m;
  }
  return null;
}

export function toolsAulas(ctx: ContextoTools) {
  const { ws, prefixoIds } = ctx;
  const topicoModulo = new Map(todosTopicos(ws.ementa).map((t) => [t.id, t.modulo_id]));
  const idsCards = new Set(ws.cards.cards.map((c) => c.id));
  const idsModulos = new Set(ws.ementa.modulos.map((m) => m.id));

  const cardsEscopo = (): CardsDraft => ({
    cards: ctx.escopoModulo ? ws.cards.cards.filter((c) => moduloDoCard(topicoModulo, c) === ctx.escopoModulo) : ws.cards.cards,
  });

  const checarModulo = (id: string) => {
    if (!idsModulos.has(id)) throw new ErroTool(`Módulo ${id} não existe.`);
    if (ctx.escopoModulo && id !== ctx.escopoModulo) throw new ErroTool(`Nesta execução você só cria aulas do módulo ${ctx.escopoModulo}.`);
  };
  const checarCards = (ids: string[]) => {
    const invalidos = ids.filter((c) => !idsCards.has(c));
    if (invalidos.length) throw new ErroTool(`Cards inexistentes: ${invalidos.join(", ")}.`);
  };

  const novoAulaId = () =>
    proximoCodigo(
      `${prefixoIds}A`,
      ws.aulas.aulas.map((a) => a.id),
    );
  const novoBlocoId = () => proximoCodigo(`${prefixoIds}B`, ws.idsBlocos());

  const criarBloco = (b: z.infer<typeof BlocoIn>): Bloco => {
    if (b.tipo !== "texto") checarCards([b.skill_card_id]);
    return { id: novoBlocoId(), ...b } as Bloco;
  };

  // Curta quando está tudo certo: o retorno de cada tool fica no histórico e é relido nas chamadas seguintes.
  const validacaoDaAula = (a: Aula) => {
    const p = validarAula(a, idsCards, idsModulos);
    return p.length ? formatarPendencias(p, 20) : "✅ ok";
  };

  const resumoPlano = (aulas: Aula[]) => aulas.map((a) => `${a.id} [${a.modulo_id}] "${a.titulo}" · cards ${a.skill_card_ids.join(", ")}`).join("\n");

  const planejar = ferramenta(ctx, {
    name: "planejar_aulas",
    description:
      "Define o plano de aulas (substitui o plano existente do escopo): para cada aula, módulo, título, objetivo e os 1 a 4 cards que ela combina, na ordem. " +
      "As aulas são criadas sem blocos; depois escreva cada uma com escrever_aula. Todos os cards do escopo devem entrar em alguma aula.",
    altera: true,
    inputSchema: z.object({ aulas: z.array(AulaPlanoIn).min(1) }),
    run: ({ aulas }) => {
      for (const a of aulas) {
        checarModulo(a.modulo_id);
        checarCards(a.skill_card_ids);
      }
      const fora = ws.aulas.aulas.filter((a) => ctx.escopoModulo && a.modulo_id !== ctx.escopoModulo);
      for (const a of ws.aulas.aulas) if (!fora.includes(a)) ws.marcar(a.id, "removido");
      ws.aulas.aulas = [...fora];
      const criadas: Aula[] = [];
      for (const a of aulas) {
        const aula: Aula = { id: novoAulaId(), ...a, blocos: [] };
        ws.aulas.aulas.push(aula);
        criadas.push(aula);
        ws.marcar(aula.id, "adicionado");
      }
      const usados = new Set(criadas.flatMap((a) => a.skill_card_ids));
      const faltando = cardsEscopo()
        .cards.filter((c) => !usados.has(c.id))
        .map((c) => c.id);
      return `${criadas.length} aula(s) planejada(s).\n${resumoPlano(criadas)}${faltando.length ? `\n⚠ Cards ainda fora do plano: ${faltando.join(", ")}` : "\nTodos os cards do escopo estão no plano."}`;
    },
  });

  const escrever = ferramenta(ctx, {
    name: "escrever_aula",
    description: "Escreve (ou reescreve por completo) todos os blocos de uma aula, em ordem. Devolve a validação da aula — corrija os erros apontados.",
    altera: true,
    inputSchema: z.object({ aula_id: z.string(), blocos: z.array(BlocoIn).min(1) }),
    run: ({ aula_id, blocos }) => {
      const aula = exigir(ws.aula(aula_id), `Aula ${aula_id} não existe. Planeje antes com planejar_aulas.`);
      for (const b of aula.blocos) ws.marcar(b.id, "removido");
      aula.blocos = [];
      for (const b of blocos) {
        const bloco = criarBloco(b);
        aula.blocos.push(bloco);
        ws.marcar(bloco.id, "adicionado");
      }
      ws.marcar(aula.id, "alterado");
      return `Aula ${aula.id} escrita com ${aula.blocos.length} blocos (${aula.blocos.map((b) => b.id).join(", ")}).\nValidação: ${validacaoDaAula(aula)}`;
    },
  });

  const adicionarAula = ferramenta(ctx, {
    name: "adicionar_aula",
    description: "Adiciona uma aula nova (opcionalmente já com blocos) depois de apos_aula_id (null = no início; omitido = no fim).",
    altera: true,
    inputSchema: AulaPlanoIn.extend({
      apos_aula_id: z.string().nullable().optional(),
      blocos: z.array(BlocoIn).optional(),
    }),
    run: ({ apos_aula_id, blocos, ...plano }) => {
      checarModulo(plano.modulo_id);
      checarCards(plano.skill_card_ids);
      const aula: Aula = { id: novoAulaId(), ...plano, blocos: [] };
      for (const b of blocos ?? []) aula.blocos.push(criarBloco(b));
      if (apos_aula_id === undefined) ws.aulas.aulas.push(aula);
      else if (apos_aula_id === null) ws.aulas.aulas.unshift(aula);
      else {
        const i = ws.aulas.aulas.findIndex((a) => a.id === apos_aula_id);
        if (i < 0) throw new ErroTool(`Aula ${apos_aula_id} não existe.`);
        ws.aulas.aulas.splice(i + 1, 0, aula);
      }
      ws.marcar(aula.id, "adicionado");
      return `Aula ${aula.id} "${aula.titulo}" adicionada.${aula.blocos.length ? `\nValidação: ${validacaoDaAula(aula)}` : " Escreva os blocos com escrever_aula."}`;
    },
  });

  const editarAula = ferramenta(ctx, {
    name: "editar_aula",
    description: "Edita título, objetivo, módulo ou cards de uma aula. Envie só o que muda.",
    altera: true,
    inputSchema: z.object({
      aula_id: z.string(),
      titulo: z.string().optional(),
      objetivo: z.string().optional(),
      modulo_id: z.string().optional(),
      skill_card_ids: z.array(z.string()).min(1).max(4).optional(),
    }),
    run: ({ aula_id, ...campos }) => {
      const aula = exigir(ws.aula(aula_id), `Aula ${aula_id} não existe.`);
      if (campos.modulo_id) checarModulo(campos.modulo_id);
      if (campos.skill_card_ids) checarCards(campos.skill_card_ids);
      Object.assign(aula, Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined)));
      ws.marcar(aula.id, "alterado");
      return `Aula ${aula.id} atualizada.`;
    },
  });

  const removerAula = ferramenta(ctx, {
    name: "remover_aula",
    description: "Remove uma aula inteira. Garanta que os cards dela continuem cobertos por outra aula.",
    altera: true,
    inputSchema: z.object({ aula_id: z.string() }),
    run: ({ aula_id }) => {
      const aula = exigir(ws.aula(aula_id), `Aula ${aula_id} não existe.`);
      ws.aulas.aulas = ws.aulas.aulas.filter((a) => a !== aula);
      ws.marcar(aula.id, "removido");
      return `Aula ${aula_id} removida.`;
    },
  });

  const moverAula = ferramenta(ctx, {
    name: "mover_aula",
    description: "Muda a posição de uma aula na trilha: coloca depois de apos_aula_id (null = primeira).",
    altera: true,
    inputSchema: z.object({ aula_id: z.string(), apos_aula_id: z.string().nullable() }),
    run: ({ aula_id, apos_aula_id }) => {
      const aula = exigir(ws.aula(aula_id), `Aula ${aula_id} não existe.`);
      const lista = ws.aulas.aulas.filter((a) => a !== aula);
      const i = apos_aula_id === null ? -1 : lista.findIndex((a) => a.id === apos_aula_id);
      if (apos_aula_id !== null && i < 0) throw new ErroTool(`Aula ${apos_aula_id} não existe.`);
      lista.splice(i + 1, 0, aula);
      ws.aulas.aulas = lista;
      ws.marcar(aula.id, "alterado");
      return `Aula ${aula_id} agora é a ${lista.indexOf(aula) + 1}ª da trilha.`;
    },
  });

  // ── Correções bloco a bloco: as mesmas operações servem às tools individuais (chat) e a corrigir_aulas (lote). ──
  /** Cada operação aplica a mudança e devolve a aula afetada e a mensagem. */
  const ops = {
    editar_texto: ({ bloco_id, ...campos }: z.infer<typeof EditarTextoIn>) => {
      const r = exigir(ws.bloco(bloco_id), `Bloco ${bloco_id} não existe.`);
      if (r.bloco.tipo !== "texto")
        throw new ErroTool(`${bloco_id} é um bloco do tipo ${r.bloco.tipo}; use ${r.bloco.tipo === "quiz" ? "editar_quiz" : "substituir_bloco"}.`);
      Object.assign(r.bloco, Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined)));
      ws.marcar(bloco_id, "alterado");
      return { aula: r.aula, msg: `Bloco ${bloco_id} atualizado.` };
    },
    editar_quiz: ({ bloco_id, ...campos }: z.infer<typeof EditarQuizIn>) => {
      const r = exigir(ws.bloco(bloco_id), `Bloco ${bloco_id} não existe.`);
      if (r.bloco.tipo !== "quiz")
        throw new ErroTool(`${bloco_id} é um bloco do tipo ${r.bloco.tipo}; use ${r.bloco.tipo === "texto" ? "editar_bloco_texto" : "substituir_bloco"}.`);
      if (campos.skill_card_id) checarCards([campos.skill_card_id]);
      Object.assign(r.bloco, Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined)));
      ws.marcar(bloco_id, "alterado");
      return { aula: r.aula, msg: `Quiz ${bloco_id} atualizado.` };
    },
    inserir_bloco: ({ aula_id, apos_bloco_id, bloco }: z.infer<typeof InserirBlocoIn>) => {
      const aula = exigir(ws.aula(aula_id), `Aula ${aula_id} não existe.`);
      const i = apos_bloco_id === null ? -1 : aula.blocos.findIndex((b) => b.id === apos_bloco_id);
      if (apos_bloco_id !== null && i < 0) throw new ErroTool(`Bloco ${apos_bloco_id} não está na aula ${aula_id}.`);
      const novo = criarBloco(bloco);
      aula.blocos.splice(i + 1, 0, novo);
      ws.marcar(novo.id, "adicionado");
      return { aula, msg: `Bloco ${novo.id} inserido na aula ${aula_id}.` };
    },
    substituir_bloco: ({ bloco_id, bloco }: z.infer<typeof SubstituirBlocoIn>) => {
      const r = exigir(ws.bloco(bloco_id), `Bloco ${bloco_id} não existe.`);
      if (bloco.tipo !== "texto") checarCards([bloco.skill_card_id]);
      r.aula.blocos[r.indice] = { id: bloco_id, ...bloco } as Bloco;
      ws.marcar(bloco_id, "alterado");
      return { aula: r.aula, msg: `Bloco ${bloco_id} substituído (${bloco.tipo}).` };
    },
    remover_bloco: ({ bloco_id }: z.infer<typeof RemoverBlocoIn>) => {
      const r = exigir(ws.bloco(bloco_id), `Bloco ${bloco_id} não existe.`);
      r.aula.blocos.splice(r.indice, 1);
      ws.marcar(bloco_id, "removido");
      return { aula: r.aula, msg: `Bloco ${bloco_id} removido.` };
    },
    reordenar_blocos: ({ aula_id, bloco_ids }: z.infer<typeof ReordenarBlocosIn>) => {
      const aula = exigir(ws.aula(aula_id), `Aula ${aula_id} não existe.`);
      const atuais = new Set(aula.blocos.map((b) => b.id));
      if (bloco_ids.length !== atuais.size || !bloco_ids.every((id) => atuais.has(id))) {
        throw new ErroTool(`Informe exatamente os ids atuais da aula: ${[...atuais].join(", ")}.`);
      }
      aula.blocos = bloco_ids.map((id) => aula.blocos.find((b) => b.id === id)!);
      ws.marcar(aula.id, "alterado");
      return { aula, msg: `Blocos da aula ${aula_id} reordenados.` };
    },
  };
  const comValidacao = ({ aula, msg }: { aula: Aula; msg: string }) => `${msg}\nValidação da aula ${aula.id}: ${validacaoDaAula(aula)}`;

  const editarTexto = ferramenta(ctx, {
    name: "editar_bloco_texto",
    description: "Edita um bloco de texto. Envie só o que muda (use null para limpar título/dica).",
    altera: true,
    inputSchema: EditarTextoIn,
    run: (input) => comValidacao(ops.editar_texto(input)),
  });

  const editarQuiz = ferramenta(ctx, {
    name: "editar_quiz",
    description: "Edita um quiz. Para mudar opções, envie as 4 opções completas (texto, correta, feedback).",
    altera: true,
    inputSchema: EditarQuizIn,
    run: (input) => comValidacao(ops.editar_quiz(input)),
  });

  const inserirBloco = ferramenta(ctx, {
    name: "inserir_bloco",
    description: "Insere um bloco numa aula depois de apos_bloco_id (null = no início da aula).",
    altera: true,
    inputSchema: InserirBlocoIn,
    run: (input) => comValidacao(ops.inserir_bloco(input)),
  });

  const substituirBloco = ferramenta(ctx, {
    name: "substituir_bloco",
    description:
      "Substitui o conteúdo de um bloco, mantendo o id e a posição. Use para editar completar, ordenar ou pergunta aberta (inclusive o gabarito) " +
      "ou para trocar o tipo de um bloco. Envie o bloco completo.",
    altera: true,
    inputSchema: SubstituirBlocoIn,
    run: (input) => comValidacao(ops.substituir_bloco(input)),
  });

  const removerBloco = ferramenta(ctx, {
    name: "remover_bloco",
    description: "Remove um bloco de uma aula.",
    altera: true,
    inputSchema: RemoverBlocoIn,
    run: (input) => comValidacao(ops.remover_bloco(input)),
  });

  const reordenar = ferramenta(ctx, {
    name: "reordenar_blocos",
    description: "Define a nova ordem dos blocos de uma aula (lista com todos os ids da aula).",
    altera: true,
    inputSchema: ReordenarBlocosIn,
    run: (input) => comValidacao(ops.reordenar_blocos(input)),
  });

  const corrigir = ferramenta(ctx, {
    name: "corrigir_aulas",
    description:
      "Aplica de uma vez uma lista de correções bloco a bloco (editar texto, editar quiz, substituir, inserir, remover ou reordenar blocos), na ordem dada. " +
      "Use para aplicar TODAS as correções da revisão numa única chamada, cada uma com a menor edição que resolve o problema. " +
      "Uma correção com erro não impede as outras; devolve o resultado de cada uma e a validação das aulas afetadas.",
    altera: true,
    inputSchema: z.object({ correcoes: z.array(CorrecaoIn).min(1) }),
    run: ({ correcoes }) => {
      const afetadas = new Map<string, Aula>();
      const linhas = correcoes.map((c, i) => {
        try {
          const { acao, ...dados } = c;
          const r = (ops[acao] as (d: unknown) => { aula: Aula; msg: string })(dados);
          afetadas.set(r.aula.id, r.aula);
          return `${i + 1}. ✅ ${r.msg}`;
        } catch (e) {
          return `${i + 1}. ❌ ${e instanceof Error ? e.message : String(e)}`;
        }
      });
      const validacoes = [...afetadas.values()].map((a) => `${a.id}: ${validacaoDaAula(a)}`);
      return `${correcoes.length} correção(ões):\n${linhas.join("\n")}\nValidação das aulas afetadas:\n${validacoes.join("\n") || "—"}`;
    },
  });

  const validar = ferramenta(ctx, {
    name: "validar_aulas",
    description:
      "Valida as aulas do escopo (estrutura, desafios, gabaritos, tamanhos) e a cobertura: todo card em alguma aula e avaliado por ao menos um desafio corrigível (quiz, completar ou ordenar). " +
      "Informe aula_id para validar só uma aula.",
    inputSchema: z.object({ aula_id: z.string().nullable().optional() }),
    run: ({ aula_id }) => {
      if (aula_id) {
        const aula = exigir(ws.aula(aula_id), `Aula ${aula_id} não existe.`);
        return validacaoDaAula(aula);
      }
      const cards = cardsEscopo();
      const ementaEscopo = ctx.escopoModulo ? { ...ws.ementa, modulos: ws.ementa.modulos.filter((m) => m.id === ctx.escopoModulo) } : ws.ementa;
      const aulasEscopo = { aulas: ws.aulas.aulas.filter((a) => !ctx.escopoModulo || a.modulo_id === ctx.escopoModulo) };
      // Valida contra todos os cards existentes, mas a cobertura só considera os cards do escopo.
      const p = validarAulas(ementaEscopo, cards, aulasEscopo, { idsCardsValidos: idsCards });
      const cob = verificarCoberturaAulas(ementaEscopo, cards, aulasEscopo);
      ctx.emit({ tipo: "validacao", pendencias: p, cobertura: cob.percentualAvaliados });
      return `${aulasEscopo.aulas.length} aulas · ${cob.percentualCards}% dos cards em aulas · ${cob.percentualAvaliados}% avaliados por desafios.\n${formatarPendencias(p)}`;
    },
  });

  return [
    planejar,
    escrever,
    adicionarAula,
    editarAula,
    removerAula,
    moverAula,
    editarTexto,
    editarQuiz,
    substituirBloco,
    inserirBloco,
    removerBloco,
    reordenar,
    corrigir,
    validar,
  ];
}
