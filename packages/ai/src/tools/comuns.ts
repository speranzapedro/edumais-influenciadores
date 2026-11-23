import { z } from "zod";
import { type ContextoTools, ErroTool, ferramenta } from "./base";

const MAX_CARACTERES_LEITURA = 16_000;

export function toolsComuns(ctx: ContextoTools) {
  const { ws, fonte } = ctx;

  const listar = ferramenta(ctx, {
    name: "listar_materiais",
    description: "Lista os materiais enviados pelo professor (id, nome, tipo e número de páginas).",
    inputSchema: z.object({}),
    run: async () => {
      const m = await fonte.listar();
      return m.map((x) => `${x.id} · ${x.nome} · ${x.paginas} página(s) · ${x.mime}`).join("\n") || "Nenhum material.";
    },
  });

  const buscar = ferramenta(ctx, {
    name: "buscar_nos_materiais",
    description:
      "Busca por palavras-chave em todos os materiais e devolve os trechos mais relevantes com material e página. " +
      "Use para conferir definições, valores, normas e procedimentos antes de escrever, e para achar as páginas-fonte. " +
      "Por padrão exige todos os termos; use OR entre termos alternativos (ex.: 'aterramento OR terra').",
    inputSchema: z.object({
      consulta: z.string().min(2).describe("termos de busca em português"),
      limite: z.number().int().min(1).max(10).optional().describe("máximo de trechos (padrão 6)"),
    }),
    run: async ({ consulta, limite }) => {
      const r = await fonte.buscar(consulta, limite ?? 6);
      if (r.length === 0) return `Nenhum trecho encontrado para "${consulta}". Tente sinônimos ou menos termos.`;
      return (
        `${r.length} trecho(s) para "${consulta}":\n` +
        r.map((t) => `• ${t.material_nome} (material_id ${t.material_id}), p. ${t.pagina}: ${t.trecho}`).join("\n")
      );
    },
  });

  const ler = ferramenta(ctx, {
    name: "ler_paginas",
    description: "Lê o texto integral de um intervalo de páginas de um material (até 8 páginas por chamada).",
    inputSchema: z.object({
      material_id: z.string(),
      pagina_inicio: z.number().int().min(1),
      pagina_fim: z.number().int().min(1),
    }),
    run: async ({ material_id, pagina_inicio, pagina_fim }) => {
      if (pagina_fim < pagina_inicio) throw new ErroTool("pagina_fim deve ser maior ou igual a pagina_inicio.");
      const fim = Math.min(pagina_fim, pagina_inicio + 7);
      const paginas = await fonte.lerPaginas(material_id, pagina_inicio, fim);
      if (paginas.length === 0) throw new ErroTool(`Nada encontrado em ${material_id} p. ${pagina_inicio}-${fim}. Confira o id com listar_materiais.`);
      let texto = paginas.map((p) => `[[página ${p.pagina}]]\n${p.texto}`).join("\n\n");
      if (texto.length > MAX_CARACTERES_LEITURA) texto = `${texto.slice(0, MAX_CARACTERES_LEITURA)}\n… (cortado; leia um intervalo menor)`;
      return `Páginas ${pagina_inicio}-${fim} lidas.\n${texto}`;
    },
  });

  const verRascunho = ferramenta(ctx, {
    name: "ver_rascunho",
    description:
      "Mostra o estado atual do rascunho desta etapa (como JSON). Informe item_id (ex.: M2, T4, C7, A3, B12) para ver só um item. " +
      "Use antes de editar algo que você não criou nesta conversa.",
    inputSchema: z.object({ item_id: z.string().nullable().optional() }),
    run: ({ item_id }) => {
      if (!item_id) {
        if (ws.etapa === "aulas") {
          return (
            "Visão geral das aulas (use item_id para ver os blocos):\n" +
            ws.aulas.aulas.map((a) => `${a.id} [${a.modulo_id}] "${a.titulo}" · cards ${a.skill_card_ids.join(", ")} · ${a.blocos.length} blocos`).join("\n")
          );
        }
        return JSON.stringify(ws.draft());
      }
      const item = ws.modulo(item_id) ?? ws.topico(item_id)?.topico ?? ws.card(item_id) ?? ws.aula(item_id) ?? ws.bloco(item_id)?.bloco;
      if (!item) throw new ErroTool(`Item ${item_id} não encontrado.`);
      return JSON.stringify(item);
    },
  });

  const revisar = ferramenta(ctx, {
    name: "revisar_qualidade",
    description:
      "Pede a um revisor pedagógico independente uma avaliação do rascunho atual (notas por critério e problemas com sugestões). " +
      "Chame depois que a validação estiver sem erros. Opcionalmente informe um foco (ex.: 'quizzes do módulo M2').",
    inputSchema: z.object({ foco: z.string().nullable().optional() }),
    run: async ({ foco }) => {
      if (ctx.revisoes.feitas >= ctx.revisoes.limite) {
        return "Limite de revisões desta execução atingido. Aplique as sugestões da última revisão e finalize.";
      }
      ctx.revisoes.feitas++;
      const av = await ctx.revisar(foco ?? null);
      ctx.revisoes.ultima = av;
      ctx.emit({ tipo: "qualidade", avaliacao: av });
      const criterios = av.criterios.map((c) => `- ${c.criterio}: ${c.nota}/5 — ${c.comentario}`).join("\n");
      const problemas = av.problemas.length
        ? av.problemas.map((p) => `- (${p.gravidade}) ${p.alvo}: ${p.problema} → ${p.sugestao}`).join("\n")
        : "- nenhum problema relevante";
      return `Nota geral ${av.nota_geral}/5.\nCritérios:\n${criterios}\nProblemas:\n${problemas}\nAplique todas as correções procedentes (alta, média e baixa) de uma vez: numa única resposta, com várias chamadas de tool.`;
    },
  });

  return [listar, buscar, ler, verRascunho, revisar];
}
