import { type Ementa, FonteSchema, type Modulo, proximoCodigo, type Topico, todosTopicos, validarEmenta, verificarCoberturaCompetencias } from "@edu/core";
import { z } from "zod";
import { type ContextoTools, ErroTool, exigir, ferramenta, formatarPendencias } from "./base";

const TopicoIn = z.object({
  titulo: z.string().describe("título curto e específico do tópico"),
  descricao: z.string().describe("1 a 3 frases: o que o aluno vai saber/fazer, com os subtemas"),
  fontes: z.array(FonteSchema).describe("páginas do material onde o tópico é tratado"),
  competencia_ids: z.array(z.string()).describe("ids das competências da visão geral (K1, K2…) que o tópico desenvolve — normalmente 1 ou 2"),
});

const ModuloIn = z.object({
  titulo: z.string(),
  descricao: z.string().describe("1 a 2 frases sobre o que o módulo entrega"),
  topicos: z.array(TopicoIn),
});

export function resumoEmenta(e: Ementa): string {
  const vinculos = (t: Topico) => (t.competencia_ids?.length ? ` [${t.competencia_ids.join(", ")}]` : "");
  return e.modulos.map((m) => `${m.id} ${m.titulo}\n${m.topicos.map((t) => `   ${t.id} ${t.titulo}${vinculos(t)}`).join("\n")}`).join("\n");
}

/** Cobertura das competências em texto, para o retorno das tools. */
function resumoCompetencias(e: Ementa): string {
  const cob = verificarCoberturaCompetencias(e);
  const linhas = e.competencias.map((c) => `   ${c.id} ← ${cob.matriz[c.id].join(", ") || "NENHUM TÓPICO"}`);
  return `Competências (${cob.percentual}% com tópico):\n${linhas.join("\n")}`;
}

export function toolsEmenta(ctx: ContextoTools) {
  const { ws } = ctx;
  const novoModuloId = () =>
    proximoCodigo(
      "M",
      ws.ementa.modulos.map((m) => m.id),
    );
  const novoTopicoId = () => proximoCodigo("T", ws.idsTopicos());

  const criarTopico = (t: z.infer<typeof TopicoIn>): Topico => {
    const topico = { id: novoTopicoId(), ...t };
    return topico;
  };

  /** Vínculos com competências que não existem na visão geral (o tópico é criado; a validação cobra). */
  const avisoVinculos = (topicos: Topico[]) => {
    const validas = new Set(ws.ementa.competencias.map((c) => c.id));
    const ruins = topicos.flatMap((t) => (t.competencia_ids ?? []).filter((k) => !validas.has(k)).map((k) => `${t.id}→${k}`));
    return ruins.length ? `\nATENÇÃO: competências inexistentes (${ruins.join(", ")}); use só ${[...validas].join(", ")}.` : "";
  };

  const inserir = <T>(lista: T[], item: T, posicao?: number | null) => {
    const i = posicao ? Math.max(0, Math.min(lista.length, posicao - 1)) : lista.length;
    lista.splice(i, 0, item);
  };

  const definir = ferramenta(ctx, {
    name: "definir_estrutura",
    description:
      "Cria (ou substitui por completo) a estrutura da ementa: todos os módulos com seus tópicos, na ordem de aprendizagem, " +
      "cada tópico ligado às competências da visão geral que desenvolve. Os dados gerais (objetivo, público, competências) já vêm da visão aprovada e não mudam. " +
      "Os ids (M1, T1…) são atribuídos pelo sistema e devolvidos. Use na geração inicial; para ajustes use as tools granulares.",
    altera: true,
    inputSchema: z.object({ modulos: z.array(ModuloIn).min(1) }),
    run: ({ modulos }) => {
      for (const m of ws.ementa.modulos) {
        ws.marcar(m.id, "removido");
        for (const t of m.topicos) ws.marcar(t.id, "removido");
      }
      ws.ementa = { ...ws.ementa, modulos: [] };
      for (const m of modulos) {
        const modulo: Modulo = { id: novoModuloId(), titulo: m.titulo, descricao: m.descricao, topicos: [] };
        ws.ementa.modulos.push(modulo);
        ws.marcar(modulo.id, "adicionado");
        for (const t of m.topicos) {
          const topico = criarTopico(t);
          modulo.topicos.push(topico);
          ws.marcar(topico.id, "adicionado");
        }
      }
      const n = todosTopicos(ws.ementa).length;
      return `Estrutura definida: ${ws.ementa.modulos.length} módulos, ${n} tópicos.\n${resumoEmenta(ws.ementa)}\n${resumoCompetencias(ws.ementa)}${avisoVinculos(todosTopicos(ws.ementa))}`;
    },
  });

  const addModulo = ferramenta(ctx, {
    name: "adicionar_modulo",
    description: "Adiciona um módulo (com seus tópicos). posicao é 1-based; omitida = no fim.",
    altera: true,
    inputSchema: ModuloIn.extend({ posicao: z.number().int().min(1).nullable().optional() }),
    run: ({ posicao, ...m }) => {
      const modulo: Modulo = { id: novoModuloId(), titulo: m.titulo, descricao: m.descricao, topicos: [] };
      for (const t of m.topicos) {
        const topico = criarTopico(t);
        modulo.topicos.push(topico);
        ws.marcar(topico.id, "adicionado");
      }
      inserir(ws.ementa.modulos, modulo, posicao);
      ws.marcar(modulo.id, "adicionado");
      return `Módulo ${modulo.id} "${modulo.titulo}" adicionado com tópicos ${modulo.topicos.map((t) => t.id).join(", ") || "(nenhum)"}.${avisoVinculos(modulo.topicos)}`;
    },
  });

  const editModulo = ferramenta(ctx, {
    name: "editar_modulo",
    description: "Edita título e/ou descrição de um módulo.",
    altera: true,
    inputSchema: z.object({ modulo_id: z.string(), titulo: z.string().optional(), descricao: z.string().optional() }),
    run: ({ modulo_id, titulo, descricao }) => {
      const m = exigir(ws.modulo(modulo_id), `Módulo ${modulo_id} não existe.`);
      if (titulo !== undefined) m.titulo = titulo;
      if (descricao !== undefined) m.descricao = descricao;
      ws.marcar(m.id, "alterado");
      return `Módulo ${m.id} atualizado.`;
    },
  });

  const remModulo = ferramenta(ctx, {
    name: "remover_modulo",
    description: "Remove um módulo e todos os seus tópicos. Para preservar tópicos, mova-os antes com mover_topico.",
    altera: true,
    inputSchema: z.object({ modulo_id: z.string() }),
    run: ({ modulo_id }) => {
      const i = ws.ementa.modulos.findIndex((m) => m.id === modulo_id);
      if (i < 0) throw new ErroTool(`Módulo ${modulo_id} não existe.`);
      const [m] = ws.ementa.modulos.splice(i, 1);
      ws.marcar(m.id, "removido");
      for (const t of m.topicos) ws.marcar(t.id, "removido");
      return `Módulo ${m.id} removido (${m.topicos.length} tópicos removidos junto).`;
    },
  });

  const addTopico = ferramenta(ctx, {
    name: "adicionar_topico",
    description: "Adiciona um tópico a um módulo. posicao é 1-based dentro do módulo; omitida = no fim.",
    altera: true,
    inputSchema: TopicoIn.extend({ modulo_id: z.string(), posicao: z.number().int().min(1).nullable().optional() }),
    run: ({ modulo_id, posicao, ...t }) => {
      const m = exigir(ws.modulo(modulo_id), `Módulo ${modulo_id} não existe.`);
      const topico = criarTopico(t);
      inserir(m.topicos, topico, posicao);
      ws.marcar(topico.id, "adicionado");
      return `Tópico ${topico.id} "${topico.titulo}" adicionado ao módulo ${m.id} (posição ${m.topicos.indexOf(topico) + 1}).${avisoVinculos([topico])}`;
    },
  });

  const editTopico = ferramenta(ctx, {
    name: "editar_topico",
    description: "Edita campos de um tópico. Envie só o que muda.",
    altera: true,
    inputSchema: z.object({
      topico_id: z.string(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      fontes: z.array(FonteSchema).optional(),
      competencia_ids: z.array(z.string()).optional().describe("substitui a lista de competências do tópico"),
    }),
    run: ({ topico_id, ...campos }) => {
      const r = exigir(ws.topico(topico_id), `Tópico ${topico_id} não existe.`);
      Object.assign(r.topico, Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined)));
      ws.marcar(topico_id, "alterado");
      return `Tópico ${topico_id} atualizado.${avisoVinculos([r.topico])}`;
    },
  });

  const remTopico = ferramenta(ctx, {
    name: "remover_topico",
    description: "Remove um tópico.",
    altera: true,
    inputSchema: z.object({ topico_id: z.string() }),
    run: ({ topico_id }) => {
      const r = exigir(ws.topico(topico_id), `Tópico ${topico_id} não existe.`);
      r.modulo.topicos.splice(r.indice, 1);
      ws.marcar(topico_id, "removido");
      return `Tópico ${topico_id} removido.`;
    },
  });

  const moverTopico = ferramenta(ctx, {
    name: "mover_topico",
    description: "Move um tópico para outro módulo e/ou posição (1-based; omitida = no fim do módulo de destino).",
    altera: true,
    inputSchema: z.object({
      topico_id: z.string(),
      para_modulo_id: z.string(),
      posicao: z.number().int().min(1).nullable().optional(),
    }),
    run: ({ topico_id, para_modulo_id, posicao }) => {
      const r = exigir(ws.topico(topico_id), `Tópico ${topico_id} não existe.`);
      const destino = exigir(ws.modulo(para_modulo_id), `Módulo ${para_modulo_id} não existe.`);
      r.modulo.topicos.splice(r.indice, 1);
      inserir(destino.topicos, r.topico, posicao);
      ws.marcar(topico_id, "alterado");
      return `Tópico ${topico_id} agora está em ${destino.id}, posição ${destino.topicos.indexOf(r.topico) + 1}.`;
    },
  });

  const validar = ferramenta(ctx, {
    name: "validar_ementa",
    description:
      "Roda as checagens automáticas da ementa (tamanhos, fontes, duplicidades, equilíbrio e cobertura das competências: toda competência precisa de ao menos um tópico). Corrija todos os erros.",
    inputSchema: z.object({}),
    run: () => {
      const p = validarEmenta(ws.ementa, ws.materiaisIds);
      ctx.emit({ tipo: "validacao", pendencias: p });
      return `${formatarPendencias(p)}\n${resumoCompetencias(ws.ementa)}`;
    },
  });

  return [definir, addModulo, editModulo, remModulo, addTopico, editTopico, remTopico, moverTopico, validar];
}
