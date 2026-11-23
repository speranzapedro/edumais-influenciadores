import type Anthropic from "@anthropic-ai/sdk";
import {
  type Aula,
  type AulasDraft,
  type CardsDraft,
  type Ementa,
  type Etapa,
  type Pendencia,
  resumoDesafios,
  type SkillCard,
  todosTopicos,
  type VisaoGeral,
  verificarCoberturaAulas,
  verificarCoberturaCards,
  visaoDaEmenta,
} from "@edu/core";
import { blocoContextoTrilha, type ContextoTrilha, type Foco, limiteCaracteres, type MensagemHistorico } from "./contexto";
import type { AcaoRegistrada, AvaliacaoQualidade, Emissor, EventoAgente, TipoMudanca } from "./eventos";
import { blocosDeMateriais, type FonteMateriais } from "./materiais";
import {
  anthropic,
  custoUsd,
  juntarUso,
  modeloAtual,
  modeloPlanejamento,
  modeloRevisor,
  modoEconomico,
  paramsRaciocinio,
  revisorLigado,
  somarUso,
  type Uso,
  usoVazio,
} from "./modelo";
import { revisarQualidade } from "./revisor";
import { SKILL_AULAS, SKILL_AULAS_GERACAO_MODULO } from "./skills/aulas";
import { AJUSTES_CRIADOR, type PerfilCriadorIA, SKILL_REFINAMENTO, skillBase } from "./skills/base";
import { SKILL_CARDS } from "./skills/cards";
import { SKILL_EMENTA } from "./skills/ementa";
import { moduloDoCard, TOOLS_GERACAO_AULAS, toolsAulas } from "./tools/aulas";
import type { ContextoTools, Ferramenta } from "./tools/base";
import { toolsCards } from "./tools/cards";
import { toolsComuns } from "./tools/comuns";
import { resumoEmenta, toolsEmenta } from "./tools/ementa";
import { rotularEscrevendo, rotularTool } from "./tools/rotulos";
import { validarWorkspace } from "./validacoes";
import { gerarVisao } from "./visao";
import { Workspace } from "./workspace";

export type { ContextoTrilha, Foco, MensagemHistorico };
export { blocoContextoTrilha };

/** Etapas feitas pelo agente com tools (a visão geral é uma chamada única, em visao.ts). */
type EtapaAgente = Exclude<Etapa, "visao">;

export interface ExecutarAgenteParams {
  etapa: Etapa;
  modo: "geracao" | "refinamento";
  /** Rascunhos das etapas. Sem `visao`, a visão vem dos dados gerais da ementa (trilhas antigas, evals). */
  inicial: { visao?: VisaoGeral; ementa: Ementa; cards: CardsDraft; aulas: AulasDraft };
  fonte: FonteMateriais;
  emit: Emissor;
  historico?: MensagemHistorico[];
  mensagem?: string;
  foco?: Foco | null;
  signal?: AbortSignal;
  modelo?: string;
  /** Workers de aulas: módulo pelo qual esta execução responde. */
  escopoModulo?: string | null;
  prefixoIds?: string;
  /** Não repassar o texto do modelo (usado quando vários workers rodam em paralelo). */
  silenciarTexto?: boolean;
  limiteRevisoes?: number;
  maxCorrecoes?: number;
  effort?: "low" | "medium" | "high";
  /** Criador e público: ajusta papel e tom dos prompts. */
  perfil: PerfilCriadorIA;
  /** Produto, trilha e a orientação do criador (objetivo e recorte), no prefixo cacheado. */
  contextoTrilha?: ContextoTrilha | null;
  /** Chamado uma vez, quando a primeira resposta do modelo começa a chegar (o prefixo já está no cache). */
  aoIniciarResposta?: () => void;
}

export interface ResultadoAgente {
  etapa: Etapa;
  visao: VisaoGeral;
  ementa: Ementa;
  cards: CardsDraft;
  aulas: AulasDraft;
  mudancas: Record<string, TipoMudanca>;
  resumo: string;
  acoes: AcaoRegistrada[];
  pendencias: Pendencia[];
  qualidade: AvaliacaoQualidade | null;
  /** Uso total da execução (agente + revisor). */
  uso: Uso;
  /** Parte do uso que veio das chamadas ao revisor pedagógico. */
  usoRevisor: Uso;
  custo_usd: number;
  modelo: string;
}

const SKILLS: Record<EtapaAgente, string> = { ementa: SKILL_EMENTA, cards: SKILL_CARDS, aulas: SKILL_AULAS };
const EFFORT: Record<EtapaAgente, "medium" | "high"> = { ementa: "high", cards: "high", aulas: "high" };
const NOMES: Record<EtapaAgente, string> = { ementa: "Ementa", cards: "Cards de Conhecimento", aulas: "Aulas" };

/** Visão geral vigente: a aprovada, ou (trilhas anteriores à etapa) os dados gerais da ementa. */
export const visaoDe = (inicial: ExecutarAgenteParams["inicial"]) => inicial.visao ?? visaoDaEmenta(inicial.ementa);

const MODO_ECONOMICO = `
## Modo econômico
A revisão pedagógica (\`revisar_qualidade\`) está desativada nesta execução: ignore esse passo do fluxo de trabalho. Valide o rascunho, corrija os erros apontados e encerre com o resumo para o professor.`;

const MODO_BUSCA = `
## Materiais extensos
Os materiais são grandes demais para virem inteiros: no início da conversa há só uma prévia de cada página. Use buscar_nos_materiais e ler_paginas para ler o conteúdo de que precisar antes de escrever.`;

/**
 * Contexto somente leitura das etapas já aprovadas, em duas partes para o prefixo cacheado:
 * `comum` é igual para todos os workers paralelos; `modulo` só existe nas aulas com escopo de módulo
 * (os cards daquele módulo, em vez de todos os cards da trilha).
 */
export function partesContextoAprovado(
  etapa: Etapa,
  ementa: Ementa,
  cards: CardsDraft,
  visao: VisaoGeral = visaoDaEmenta(ementa),
  escopoModulo: string | null = null,
): { comum: string | null; modulo: string | null } {
  if (etapa === "visao") return { comum: null, modulo: null };
  if (etapa === "ementa")
    return {
      comum: `VISÃO GERAL APROVADA pelo professor (somente leitura; é a base da estrutura):\n\`\`\`json\n${JSON.stringify(visao)}\n\`\`\``,
      modulo: null,
    };
  if (etapa === "cards") return { comum: `EMENTA APROVADA (somente leitura):\n\`\`\`json\n${JSON.stringify(ementa)}\n\`\`\``, modulo: null };
  const resumo = `Estrutura da ementa aprovada:\n${resumoEmenta(ementa)}`;
  if (!escopoModulo)
    return { comum: `${resumo}\n\nCARDS DE CONHECIMENTO APROVADOS (somente leitura):\n\`\`\`json\n${JSON.stringify(cards)}\n\`\`\``, modulo: null };
  const topicoModulo = new Map(todosTopicos(ementa).map((t) => [t.id, t.modulo_id]));
  const doModulo = { cards: cards.cards.filter((c) => moduloDoCard(topicoModulo, c) === escopoModulo) };
  return {
    comum: resumo,
    modulo: `CARDS DE CONHECIMENTO APROVADOS DO MÓDULO ${escopoModulo} (somente leitura; os demais módulos são feitos por outros agentes):\n\`\`\`json\n${JSON.stringify(doModulo)}\n\`\`\``,
  };
}

/** Contexto somente leitura das etapas já aprovadas (as duas partes juntas). */
export function contextoAprovado(etapa: Etapa, ementa: Ementa, cards: CardsDraft, visao?: VisaoGeral, escopoModulo: string | null = null): string | null {
  const { comum, modulo } = partesContextoAprovado(etapa, ementa, cards, visao, escopoModulo);
  return [comum, modulo].filter(Boolean).join("\n\n") || null;
}

/**
 * Prefixo cacheado da conversa: trilha + materiais + etapas aprovadas. Um ponto de cache no fim da
 * parte comum (compartilhada pelos workers) e outro no fim da parte do módulo, se houver. Com o do
 * system e o automático do runner, são no máximo 4 — o limite da API.
 */
export function montarPrefixo(p: {
  trilha: string | null;
  materiais: Anthropic.Beta.BetaContentBlockParam[];
  comum: string | null;
  modulo: string | null;
}): Anthropic.Beta.BetaContentBlockParam[] {
  const marcar = (b: Anthropic.Beta.BetaContentBlockParam) => ({ ...b, cache_control: { type: "ephemeral" } }) as Anthropic.Beta.BetaContentBlockParam;
  const comum: Anthropic.Beta.BetaContentBlockParam[] = [
    ...(p.trilha ? [{ type: "text" as const, text: p.trilha }] : []),
    { type: "text", text: "Materiais enviados pelo professor (o material_id de cada um está no contexto do documento):" },
    ...p.materiais,
    ...(p.comum ? [{ type: "text" as const, text: p.comum }] : []),
  ];
  // Cópia do último bloco: os blocos de materiais são compartilhados com o prompt do revisor.
  comum[comum.length - 1] = marcar(comum[comum.length - 1]);
  return p.modulo ? [...comum, marcar({ type: "text", text: p.modulo })] : comum;
}

function textoDaMensagem(m: Anthropic.Beta.BetaMessage | null): string {
  if (!m) return "";
  return m.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function instrucaoFinal(p: ExecutarAgenteParams, ws: Workspace): string {
  const draftJson = JSON.stringify(ws.draft());
  if (p.modo === "refinamento") {
    const foco = p.foco ? `\nItem em foco: ${p.foco.id} — ${p.foco.descricao}` : "";
    return `Estado atual do rascunho da etapa ${NOMES[p.etapa as EtapaAgente]} (é o que o professor está vendo):\n\`\`\`json\n${draftJson}\n\`\`\`\n\nPedido do professor:${foco}\n«${p.mensagem ?? ""}»`;
  }
  if (p.escopoModulo && p.etapa === "cards") {
    const modulo = ws.modulo(p.escopoModulo)!;
    return (
      `Seu escopo nesta execução é SOMENTE o módulo ${modulo.id} "${modulo.titulo}" — os demais módulos estão sendo feitos em paralelo por outros agentes.\n` +
      `Tópicos deste módulo (todos precisam ser cobertos): ${modulo.topicos.map((t) => `${t.id} "${t.titulo}"`).join("; ")}.\n` +
      `Gere os Cards de Conhecimento deste módulo seguindo o fluxo de trabalho da sua skill (um único lote com criar_skill_cards costuma bastar). Ao final, responda com 1 a 2 frases sobre este módulo.`
    );
  }
  if (p.escopoModulo) {
    const modulo = ws.modulo(p.escopoModulo)!;
    const topicoModulo = new Map(todosTopicos(ws.ementa).map((t) => [t.id, t.modulo_id]));
    const cards = ws.cards.cards.filter((c) => moduloDoCard(topicoModulo, c) === modulo.id).map((c) => `${c.id} "${c.titulo}"`);
    return (
      `Seu escopo nesta execução é SOMENTE o módulo ${modulo.id} "${modulo.titulo}" — os demais módulos estão sendo feitos em paralelo por outros agentes.\n` +
      `Cards deste módulo (todos devem entrar em aulas e ser avaliados por quiz): ${cards.join("; ")}.\n` +
      `Gere as aulas deste módulo seguindo o fluxo de trabalho da sua skill. Ao final, responda com 1 a 2 frases sobre este módulo.`
    );
  }
  const vazio = ws.etapa === "ementa" ? ws.ementa.modulos.length === 0 : ws.etapa === "cards" ? ws.cards.cards.length === 0 : ws.aulas.aulas.length === 0;
  return (
    `Gere a etapa ${NOMES[p.etapa as EtapaAgente]} completa seguindo o fluxo de trabalho da sua skill.` +
    (vazio ? " O rascunho está vazio." : ` O rascunho atual será substituído:\n\`\`\`json\n${draftJson}\n\`\`\``)
  );
}

/** Executa um agente especialista de uma etapa (geração ou refinamento via chat). */
export async function executarAgente(p: ExecutarAgenteParams): Promise<ResultadoAgente> {
  const modelo = p.modelo ?? (p.etapa === "cards" || p.etapa === "aulas" ? modeloAtual() : modeloPlanejamento());
  const revisor = modeloRevisor();
  const uso = usoVazio();
  const usoAgente = usoVazio();
  const usoRevisor = usoVazio();
  // O revisor roda em outro modelo: o custo soma cada parte no preço do seu modelo.
  const custo = () => custoUsd(usoAgente, modelo) + custoUsd(usoRevisor, revisor);
  const materiais = await p.fonte.listar();
  const { blocos, modoBusca } = await blocosDeMateriais(p.fonte, limiteCaracteres(modelo));
  const economico = modoEconomico();
  const comRevisor = revisorLigado();
  if (p.etapa === "visao") throw new Error("A visão geral é gerada por gerarVisao, não pelo agente com tools.");
  const etapa: EtapaAgente = p.etapa;
  const visao = visaoDe(p.inicial);
  // Na ementa, os dados gerais são os da visão aprovada (o agente só monta a estrutura).
  const inicial = etapa === "ementa" ? { ...p.inicial, ementa: { ...p.inicial.ementa, ...visao } } : p.inicial;
  const ws = new Workspace(etapa, inicial, materiais, p.emit);
  // Workers de aulas na geração: contexto, tools e instruções enxutos (só o módulo deles).
  const geracaoModuloAulas = etapa === "aulas" && p.modo === "geracao" && !!p.escopoModulo;
  const partes = partesContextoAprovado(etapa, ws.ementa, ws.cards, visao, geracaoModuloAulas ? p.escopoModulo : null);
  // O revisor recebe o contexto completo (igual para todos os workers, então o cache dele é compartilhado).
  const contexto = contextoAprovado(etapa, ws.ementa, ws.cards, visao);
  const trilha = p.contextoTrilha ? blocoContextoTrilha(p.contextoTrilha) : null;
  // O revisor confere a aderência à orientação do professor: recebe o bloco da trilha junto das etapas aprovadas.
  const contextoRevisor = [trilha, contexto].filter(Boolean).join("\n\n") || null;
  const acoes: AcaoRegistrada[] = [];

  const ctx: ContextoTools = {
    ws,
    fonte: p.fonte,
    emit: p.emit,
    acoes,
    escopoModulo: p.escopoModulo ?? null,
    prefixoIds: p.prefixoIds ?? "",
    rotular: rotularTool,
    revisoes: { feitas: 0, limite: !comRevisor ? 0 : economico ? 1 : (p.limiteRevisoes ?? 2), ultima: null },
    revisar: async (foco) => {
      const u = usoVazio();
      try {
        return await revisarQualidade({
          perfil: p.perfil,
          etapa: p.etapa,
          modelo: revisor,
          materiais: blocos,
          contexto: contextoRevisor,
          draft: ws.draft(),
          foco,
          uso: u,
          signal: p.signal,
        });
      } finally {
        Object.assign(uso, juntarUso(uso, u));
        Object.assign(usoRevisor, juntarUso(usoRevisor, u));
      }
    },
  };

  const tools: Ferramenta[] = [
    ...toolsComuns(ctx),
    ...(p.etapa === "ementa" ? toolsEmenta(ctx) : p.etapa === "cards" ? toolsCards(ctx) : toolsAulas(ctx)),
  ].filter(
    (t) =>
      // Modo econômico: sem o revisor pedagógico (a tool nem é oferecida ao modelo).
      !(!comRevisor && t.name === "revisar_qualidade") &&
      // Workers de aulas: só as tools de gerar e de corrigir bloco a bloco (sem as de nível de aula nem a de reler o rascunho).
      (!geracaoModuloAulas || TOOLS_GERACAO_AULAS.includes(t.name)),
  );

  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    {
      type: "text",
      text: [
        skillBase(p.perfil),
        SKILLS[etapa],
        AJUSTES_CRIADOR[etapa],
        geracaoModuloAulas ? SKILL_AULAS_GERACAO_MODULO : "",
        p.modo === "refinamento" ? SKILL_REFINAMENTO : "",
        modoBusca ? MODO_BUSCA : "",
        economico && !comRevisor ? MODO_ECONOMICO : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      cache_control: { type: "ephemeral" },
    },
  ];

  // Prefixo estável (cacheado): trilha + materiais + etapas aprovadas. Depois: histórico do chat e o pedido.
  const prefixo = montarPrefixo({ trilha, materiais: blocos, comum: partes.comum, modulo: partes.modulo });

  let messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prefixo }];
  for (const h of p.historico ?? []) {
    if (h.texto.trim()) messages.push({ role: h.role, content: h.texto });
  }
  messages.push({ role: "user", content: instrucaoFinal(p, ws) });

  const maxCorrecoes = economico ? 1 : (p.maxCorrecoes ?? (p.modo === "refinamento" ? 1 : 2));
  let ultima: Anthropic.Beta.BetaMessage | null = null;
  let pendencias: Pendencia[] = [];
  let respostaIniciada = false;

  for (let rodada = 0; ; rodada++) {
    const runner = anthropic().beta.messages.toolRunner(
      {
        model: modelo,
        max_tokens: 32000,
        system,
        messages,
        tools,
        stream: true,
        max_iterations: 60,
        ...paramsRaciocinio(modelo, p.effort ?? EFFORT[etapa]),
        cache_control: { type: "ephemeral" },
      },
      { signal: p.signal },
    );

    for await (const stream of runner) {
      if (!p.silenciarTexto) {
        stream.on("text", (delta) => p.emit({ tipo: "texto", delta }));
        stream.on("thinking", (delta) => p.emit({ tipo: "pensando", delta }));
      }
      stream.on("streamEvent", (ev) => {
        if (ev.type === "message_start" && !respostaIniciada) {
          respostaIniciada = true;
          p.aoIniciarResposta?.();
        }
        if (ev.type === "content_block_start" && ev.content_block.type === "tool_use") {
          p.emit({ tipo: "escrevendo", nome: ev.content_block.name, rotulo: rotularEscrevendo(ev.content_block.name) });
        }
      });
      const msg = await stream.finalMessage();
      somarUso(uso, msg.usage);
      somarUso(usoAgente, msg.usage);
      p.emit({ tipo: "uso", uso: { ...uso }, custo_usd: custo() });
      ultima = msg;
      if (msg.stop_reason === "refusal") throw new Error("O modelo recusou a solicitação.");
      if (!p.silenciarTexto && msg.stop_reason === "tool_use") p.emit({ tipo: "texto", delta: "\n\n" });
    }

    pendencias = validarWorkspace(ws, ctx.escopoModulo);
    const erros = pendencias.filter((x) => x.nivel === "erro");
    if (erros.length === 0 || rodada >= maxCorrecoes) break;

    p.emit({ tipo: "status", texto: `Corrigindo ${erros.length} pendência(s) apontadas pela validação…` });
    messages = [
      ...runner.params.messages,
      {
        role: "user",
        content:
          `[Verificação automática do sistema] A validação ainda aponta ${erros.length} erro(s):\n` +
          erros
            .slice(0, 40)
            .map((e) => `- ${e.alvo}: ${e.mensagem}`)
            .join("\n") +
          `\nCorrija todos com as tools e depois encerre com um resumo curto para o professor.`,
      },
    ];
  }

  ws.emitirAgora();
  p.emit({ tipo: "validacao", pendencias });
  const resumo = textoDaMensagem(ultima) || "Pronto.";
  if (!p.escopoModulo) p.emit({ tipo: "fim", resumo });

  return {
    etapa: p.etapa,
    visao,
    ementa: ws.ementa,
    cards: ws.cards,
    aulas: ws.aulas,
    mudancas: { ...ws.mudancas },
    resumo,
    acoes,
    pendencias,
    qualidade: ctx.revisoes.ultima,
    uso,
    usoRevisor,
    custo_usd: custo(),
    modelo,
  };
}

/** Renumera ids de aulas/blocos (A1…, B1…) depois de juntar os resultados dos workers. */
export function renumerarAulas(aulas: Aula[]): Aula[] {
  let b = 0;
  return aulas.map((a, i) => ({
    ...a,
    id: `A${i + 1}`,
    blocos: a.blocos.map((bloco) => ({ ...bloco, id: `B${++b}` })),
  }));
}

/** Renumera ids de cards (C1…) depois de juntar os resultados dos workers. */
function renumerarCards(cards: SkillCard[]): SkillCard[] {
  return cards.map((c, i) => ({ ...c, id: `C${i + 1}` }));
}

/**
 * Geração em paralelo (cards ou aulas): um worker por módulo, cada um com seu próprio loop de
 * tools, validação e revisão. O rascunho combinado é transmitido à UI conforme os workers avançam.
 */
export async function gerarEmParalelo(etapa: "cards" | "aulas", p: Omit<ExecutarAgenteParams, "etapa" | "modo">): Promise<ResultadoAgente> {
  const topicoModulo = new Map(todosTopicos(p.inicial.ementa).map((t) => [t.id, t.modulo_id]));
  const modulos =
    etapa === "cards"
      ? p.inicial.ementa.modulos.filter((m) => m.topicos.length > 0)
      : p.inicial.ementa.modulos.filter((m) => p.inicial.cards.cards.some((c) => moduloDoCard(topicoModulo, c) === m.id));
  const parciais = new Map<string, (SkillCard | Aula)[]>();
  const usoPorWorker = new Map<string, { uso: Uso; custo: number }>();
  const modelo = p.modelo ?? modeloAtual();

  const itensDe = (draft: unknown, modulo: string): (SkillCard | Aula)[] =>
    etapa === "cards"
      ? (draft as CardsDraft).cards.filter((c) => moduloDoCard(topicoModulo, c) === modulo)
      : (draft as AulasDraft).aulas.filter((a) => a.modulo_id === modulo);
  const montar = (itens: (SkillCard | Aula)[]) => (etapa === "cards" ? { cards: itens as SkillCard[] } : { aulas: itens as Aula[] });
  const marcarTudo = (itens: (SkillCard | Aula)[]): Record<string, TipoMudanca> =>
    Object.fromEntries(itens.flatMap((x) => [[x.id, "adicionado" as const], ...("blocos" in x ? x.blocos.map((b) => [b.id, "adicionado" as const]) : [])]));

  p.emit({
    tipo: "status",
    texto: `${etapa === "cards" ? "Criando os Cards de Conhecimento" : "Escrevendo as aulas"} de ${modulos.length} módulos em paralelo…`,
  });

  // Se um worker falhar (ou o professor cancelar), interrompe todos.
  const ctrl = new AbortController();
  p.signal?.addEventListener("abort", () => ctrl.abort(), { once: true });

  const rodarWorker = (m: (typeof modulos)[number], aoIniciarResposta?: () => void) => {
    const emitWorker: Emissor = (e: EventoAgente) => {
      switch (e.tipo) {
        case "draft": {
          parciais.set(m.id, itensDe(e.draft, m.id));
          const itens = modulos.flatMap((x) => parciais.get(x.id) ?? []);
          p.emit({ tipo: "draft", etapa, draft: montar(itens), mudancas: marcarTudo(itens) });
          break;
        }
        case "tool_inicio":
        case "escrevendo":
          p.emit({ ...e, rotulo: `${m.id} · ${e.rotulo}` });
          break;
        case "uso": {
          usoPorWorker.set(m.id, { uso: e.uso, custo: e.custo_usd });
          const workers = [...usoPorWorker.values()];
          p.emit({ tipo: "uso", uso: workers.map((x) => x.uso).reduce(juntarUso, usoVazio()), custo_usd: workers.reduce((a, x) => a + x.custo, 0) });
          break;
        }
        case "texto":
        case "fim":
        case "validacao":
          break;
        default:
          p.emit(e);
      }
    };
    return executarAgente({
      ...p,
      etapa,
      modo: "geracao",
      inicial: etapa === "cards" ? { ...p.inicial, cards: { cards: [] }, aulas: { aulas: [] } } : { ...p.inicial, aulas: { aulas: [] } },
      emit: emitWorker,
      escopoModulo: m.id,
      prefixoIds: `${m.id}-`,
      silenciarTexto: true,
      limiteRevisoes: 1,
      effort: p.effort ?? "medium",
      signal: ctrl.signal,
      aoIniciarResposta,
    }).catch((e) => {
      ctrl.abort();
      throw e;
    });
  };

  // Todos os workers compartilham o mesmo prefixo (tools + system + materiais + etapas aprovadas), mas o
  // cache só fica legível quando a primeira resposta começa a chegar: disparados juntos, cada um pagaria a
  // gravação do prefixo inteiro. O primeiro worker sai na frente e os demais esperam a resposta dele começar.
  const resultados: ResultadoAgente[] = [];
  if (modulos.length > 0) {
    const [primeiro, ...resto] = modulos;
    let liberar!: () => void;
    const prefixoNoCache = new Promise<void>((r) => (liberar = r));
    const p0 = rodarWorker(primeiro, liberar);
    // Se o primeiro terminar ou falhar antes de responder, não segura os demais.
    await Promise.race([
      prefixoNoCache,
      p0.then(
        () => {},
        () => {},
      ),
    ]);
    if (ctrl.signal.aborted) await p0;
    resultados.push(...(await Promise.all([p0, ...resto.map((m) => rodarWorker(m))])));
  }

  const juntos = resultados.flatMap((r, i) => itensDe(etapa === "cards" ? r.cards : r.aulas, modulos[i].id));
  const itens = etapa === "cards" ? renumerarCards(juntos as SkillCard[]) : renumerarAulas(juntos as Aula[]);
  const draft = montar(itens);
  const mudancas = marcarTudo(itens);
  p.emit({ tipo: "draft", etapa, draft, mudancas });

  const final = etapa === "cards" ? { ...p.inicial, cards: draft as CardsDraft } : { ...p.inicial, aulas: draft as AulasDraft };
  const ws = new Workspace(etapa, final, await p.fonte.listar(), () => {});
  const pendencias = validarWorkspace(ws);
  p.emit({ tipo: "validacao", pendencias });

  const uso = resultados.map((r) => r.uso).reduce(juntarUso, usoVazio());
  const notas = resultados.map((r) => r.qualidade?.nota_geral).filter((n): n is number => typeof n === "number");
  const qualidade = mesclarQualidades(resultados.map((r) => r.qualidade));
  const notaTxt = notas.length ? `; nota média do revisor: ${(notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1)}/5.` : ".";
  let cabecalho: string;
  if (etapa === "cards") {
    const cob = verificarCoberturaCards(final.ementa, final.cards);
    cabecalho = `Criei ${itens.length} Cards de Conhecimento para os ${modulos.length} módulos, cobrindo ${cob.percentual}% dos tópicos da ementa${notaTxt}`;
  } else {
    const aulas = itens as Aula[];
    const cob = verificarCoberturaAulas(final.ementa, final.cards, final.aulas);
    cabecalho = `Criei ${aulas.length} aulas com ${resumoDesafios(aulas)} para os ${modulos.length} módulos — ${cob.percentualCards}% dos cards estão em aulas e ${cob.percentualAvaliados}% são avaliados por desafios${notaTxt}`;
  }
  const resumo = [cabecalho, ...resultados.map((r, i) => `**${modulos[i].titulo}** — ${r.resumo}`)].join("\n\n");
  if (qualidade) p.emit({ tipo: "qualidade", avaliacao: qualidade });
  p.emit({ tipo: "fim", resumo });

  return {
    etapa,
    visao: visaoDe(p.inicial),
    ementa: final.ementa,
    cards: final.cards,
    aulas: final.aulas,
    mudancas,
    resumo,
    acoes: resultados.flatMap((r) => r.acoes),
    pendencias,
    qualidade,
    uso,
    usoRevisor: resultados.map((r) => r.usoRevisor).reduce(juntarUso, usoVazio()),
    custo_usd: resultados.reduce((a, r) => a + r.custo_usd, 0),
    modelo,
  };
}

function mesclarQualidades(lista: (AvaliacaoQualidade | null)[]): AvaliacaoQualidade | null {
  const validas = lista.filter((q): q is AvaliacaoQualidade => q !== null);
  if (validas.length === 0) return null;
  const media = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
  const criterios = new Map<string, number[]>();
  for (const q of validas) for (const c of q.criterios) criterios.set(c.criterio, [...(criterios.get(c.criterio) ?? []), c.nota]);
  return {
    nota_geral: media(validas.map((q) => q.nota_geral)),
    criterios: [...criterios.entries()].map(([criterio, notas]) => ({ criterio, nota: media(notas), comentario: "" })),
    problemas: validas.flatMap((q) => q.problemas).slice(0, 12),
    pontos_fortes: validas.flatMap((q) => q.pontos_fortes).slice(0, 3),
  };
}

/**
 * Ponto de entrada único: a visão geral é uma chamada só (sem tools); a ementa roda num agente só;
 * cards e aulas, em paralelo por módulo.
 */
export async function rodarEtapa(p: ExecutarAgenteParams): Promise<ResultadoAgente> {
  if (p.etapa === "visao") return gerarVisao(p);
  // Detalhe técnico: vai para o log do servidor, não para a tela do professor.
  if (modoEconomico())
    console.info(
      `[agente] ${p.etapa}: modo econômico (${p.modelo ?? (p.etapa === "ementa" ? modeloPlanejamento() : modeloAtual())}), ${revisorLigado() ? "com" : "sem"} revisor pedagógico, esforço baixo, 1 correção.`,
    );
  if (p.modo === "geracao" && (p.etapa === "cards" || p.etapa === "aulas")) return gerarEmParalelo(p.etapa, p);
  return executarAgente(p);
}
