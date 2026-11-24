import { FonteSchema, proximoCodigo, type SkillCard, todosTopicos, validarCard, validarCards, verificarCoberturaCards } from "@edu/core";
import { z } from "zod";
import { type ContextoTools, ErroTool, exigir, ferramenta, formatarPendencias } from "./base";

const CardIn = z.object({
  titulo: z.string().describe("nome da habilidade, curto e específico"),
  conceito: z.string().describe("explicação central (180 a 900 caracteres)"),
  pontos_chave: z.array(z.string()).describe("3 a 5 afirmações curtas e verificáveis"),
  exemplo: z.string().describe("situação concreta do trabalho/cotidiano (30 a 450 caracteres)"),
  topico_ids: z.array(z.string()).min(1).describe("tópicos da ementa cobertos (ex.: ['T3'])"),
  fontes: z.array(FonteSchema),
});

export function toolsCards(ctx: ContextoTools) {
  const { ws } = ctx;
  const materiais = () => new Set(ws.materiaisIds);
  // Workers paralelos só enxergam (e só cobrem) os tópicos do seu módulo.
  const ementaEscopo = () => (ctx.escopoModulo ? { ...ws.ementa, modulos: ws.ementa.modulos.filter((m) => m.id === ctx.escopoModulo) } : ws.ementa);
  const topicosValidos = () => new Set(todosTopicos(ementaEscopo()).map((t) => t.id));

  const novoCard = (c: z.infer<typeof CardIn>): SkillCard => {
    const card = {
      id: proximoCodigo(
        `${ctx.prefixoIds}C`,
        ws.cards.cards.map((x) => x.id),
      ),
      ...c,
    };
    ws.cards.cards.push(card); // reposicionado pelo chamador quando preciso
    return card;
  };

  const checarTopicos = (ids: string[]) => {
    const validos = topicosValidos();
    const invalidos = ids.filter((t) => !validos.has(t));
    if (invalidos.length) throw new ErroTool(`Tópicos inexistentes na ementa: ${invalidos.join(", ")}.`);
  };

  const resumoCriados = (cards: SkillCard[]) =>
    cards
      .map((c) => {
        const erros = validarCard(c, materiais()).filter((p) => p.nivel === "erro");
        return `${c.id} "${c.titulo}" → ${c.topico_ids.join(", ")}${erros.length ? ` ⚠ ${erros.map((e) => e.mensagem).join(" ")}` : ""}`;
      })
      .join("\n");

  const criar = ferramenta(ctx, {
    name: "criar_skill_cards",
    description:
      "Cria um lote de Cards de Conhecimento (ex.: todos os de um módulo), na ordem de aprendizagem. Os ids (C1, C2…) são atribuídos pelo sistema. " +
      "Use apos_card_id para inserir o lote logo depois de um card existente; omitido = no fim.",
    altera: true,
    inputSchema: z.object({ cards: z.array(CardIn).min(1), apos_card_id: z.string().nullable().optional() }),
    run: ({ cards, apos_card_id }) => {
      for (const c of cards) checarTopicos(c.topico_ids);
      const criados = cards.map(novoCard);
      if (apos_card_id) {
        const lista = ws.cards.cards.filter((c) => !criados.includes(c));
        const i = lista.findIndex((c) => c.id === apos_card_id);
        if (i < 0) throw new ErroTool(`Card ${apos_card_id} não existe.`);
        lista.splice(i + 1, 0, ...criados);
        ws.cards.cards = lista;
      }
      for (const c of criados) ws.marcar(c.id, "adicionado");
      const cob = verificarCoberturaCards(ementaEscopo(), ws.cards);
      return `${criados.length} card(s) criado(s). Cobertura atual: ${cob.percentual}% dos tópicos.\n${resumoCriados(criados)}`;
    },
  });

  const editar = ferramenta(ctx, {
    name: "editar_skill_card",
    description: "Edita campos de um Card de Conhecimento. Envie só o que muda.",
    altera: true,
    inputSchema: z.object({
      card_id: z.string(),
      titulo: z.string().optional(),
      conceito: z.string().optional(),
      pontos_chave: z.array(z.string()).optional(),
      exemplo: z.string().optional(),
      topico_ids: z.array(z.string()).min(1).optional(),
      fontes: z.array(FonteSchema).optional(),
    }),
    run: ({ card_id, ...campos }) => {
      const c = exigir(ws.card(card_id), `Card ${card_id} não existe.`);
      if (campos.topico_ids) checarTopicos(campos.topico_ids);
      Object.assign(c, Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined)));
      ws.marcar(card_id, "alterado");
      return `Card ${card_id} atualizado.\n${resumoCriados([c])}`;
    },
  });

  const remover = ferramenta(ctx, {
    name: "remover_skill_cards",
    description: "Remove um ou mais Cards de Conhecimento.",
    altera: true,
    inputSchema: z.object({ card_ids: z.array(z.string()).min(1) }),
    run: ({ card_ids }) => {
      for (const id of card_ids) exigir(ws.card(id), `Card ${id} não existe.`);
      ws.cards.cards = ws.cards.cards.filter((c) => !card_ids.includes(c.id));
      for (const id of card_ids) ws.marcar(id, "removido");
      const cob = verificarCoberturaCards(ementaEscopo(), ws.cards);
      return `Removido(s): ${card_ids.join(", ")}. Cobertura atual: ${cob.percentual}%.`;
    },
  });

  const dividir = ferramenta(ctx, {
    name: "dividir_skill_card",
    description: "Substitui um card que mistura conceitos por 2 a 4 cards atômicos, na mesma posição.",
    altera: true,
    inputSchema: z.object({ card_id: z.string(), novos: z.array(CardIn).min(2).max(4) }),
    run: ({ card_id, novos }) => {
      const original = exigir(ws.card(card_id), `Card ${card_id} não existe.`);
      for (const c of novos) checarTopicos(c.topico_ids);
      const criados = novos.map(novoCard);
      const lista = ws.cards.cards.filter((c) => !criados.includes(c));
      const i = lista.indexOf(original);
      lista.splice(i, 1, ...criados);
      ws.cards.cards = lista;
      ws.marcar(card_id, "removido");
      for (const c of criados) ws.marcar(c.id, "adicionado");
      return `Card ${card_id} dividido em ${criados.map((c) => c.id).join(", ")}.\n${resumoCriados(criados)}`;
    },
  });

  const mesclar = ferramenta(ctx, {
    name: "mesclar_skill_cards",
    description: "Funde 2 a 4 cards redundantes em um só, na posição do primeiro.",
    altera: true,
    inputSchema: z.object({ card_ids: z.array(z.string()).min(2).max(4), novo: CardIn }),
    run: ({ card_ids, novo }) => {
      const originais = card_ids.map((id) => exigir(ws.card(id), `Card ${id} não existe.`));
      checarTopicos(novo.topico_ids);
      const criado = novoCard(novo);
      const lista = ws.cards.cards.filter((c) => c !== criado);
      const i = lista.indexOf(originais[0]);
      lista.splice(i, 0, criado);
      ws.cards.cards = lista.filter((c) => !card_ids.includes(c.id));
      for (const id of card_ids) ws.marcar(id, "removido");
      ws.marcar(criado.id, "adicionado");
      return `Cards ${card_ids.join(", ")} fundidos em ${criado.id}.`;
    },
  });

  const cobertura = ferramenta(ctx, {
    name: "verificar_cobertura",
    description: "Mostra quais tópicos da ementa estão cobertos por cards, quais faltam e referências inválidas. A meta é 100%.",
    inputSchema: z.object({}),
    run: () => {
      const cob = verificarCoberturaCards(ementaEscopo(), ws.cards);
      const titulos = new Map(todosTopicos(ementaEscopo()).map((t) => [t.id, t.titulo]));
      const linhas = [`Cobertura: ${cob.percentual}% (${cob.totalTopicos - cob.topicosSemCard.length}/${cob.totalTopicos} tópicos).`];
      if (cob.topicosSemCard.length) {
        linhas.push("Tópicos SEM card (crie cards para eles):", ...cob.topicosSemCard.map((t) => `- ${t.id} [${t.modulo_id}] ${t.titulo}`));
      }
      if (cob.referenciasInvalidas.length) {
        linhas.push("Referências inválidas:", ...cob.referenciasInvalidas.map((r) => `- ${r.card_id} → ${r.topico_id}`));
      }
      if (cob.topicosSobrecobertos.length) {
        linhas.push(
          "Tópicos com muitos cards (verifique redundância):",
          ...cob.topicosSobrecobertos.map((t) => `- ${t.id} ${titulos.get(t.id)}: ${t.cards.join(", ")}`),
        );
      }
      ctx.emit({ tipo: "validacao", pendencias: validarCards(ementaEscopo(), ws.cards, ws.materiaisIds), cobertura: cob.percentual });
      return linhas.join("\n");
    },
  });

  const validar = ferramenta(ctx, {
    name: "validar_skill_cards",
    description: "Roda as checagens automáticas dos cards (tamanhos, pontos-chave, tópicos, fontes, duplicidades, cobertura). Corrija todos os erros.",
    inputSchema: z.object({}),
    run: () => {
      const p = validarCards(ementaEscopo(), ws.cards, ws.materiaisIds);
      const cob = verificarCoberturaCards(ementaEscopo(), ws.cards);
      ctx.emit({ tipo: "validacao", pendencias: p, cobertura: cob.percentual });
      return `${ws.cards.cards.length} cards · cobertura ${cob.percentual}%.\n${formatarPendencias(p)}`;
    },
  });

  return [criar, editar, remover, dividir, mesclar, cobertura, validar];
}
