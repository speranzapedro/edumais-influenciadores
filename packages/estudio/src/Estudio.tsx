"use client";

import type { AvaliacaoQualidade, Foco } from "@edu/ai";
import {
  type AulasDraft,
  type CardsDraft,
  contarPendencias,
  type Ementa,
  type Etapa,
  lerRevisoes,
  modulosPendentes,
  modulosPendentesCards,
  normalizarOrientacao,
  objetivoDefinido,
  type Pendencia,
  type VisaoGeral,
  validarAulas,
  validarCards,
  validarEmenta,
  validarVisao,
} from "@edu/core";
import type { EstadoEstudio } from "@edu/db";
import { Botao, classesBotao, cn, Icone, Pill, TileIcone, tomDe } from "@edu/ui";
import { AlertTriangle, ArrowRight, Check, ChevronLeft, Compass, Loader2, Rocket, RotateCcw, Sparkles, Star, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { BotaoEditarTrilha } from "./BotaoEditarTrilha";
import { ChatAgente, TrilhoEdu } from "./ChatAgente";
import { type ConfigEstudio, ProvedorEstudio } from "./contexto";
import { PainelAulas } from "./PainelAulas";
import { PainelCards } from "./PainelCards";
import { PainelEmenta } from "./PainelEmenta";
import { BarraMateriais, PainelMateriais } from "./PainelMateriais";
import { PainelVisao } from "./PainelVisao";
import { type EstadoTutor, SeloTutor } from "./SeloTutor";
import { TourEstudio } from "./TourEstudio";
import { useAgente } from "./useAgente";

/** Preferência do criador: chat do Edu aberto ("1") ou recolhido ("0"). */
const CHAVE_CHAT = "aprende:chat-edu";

type Passo = "materiais" | Etapa | "publicar";
const PASSOS: { id: Passo; nome: string }[] = [
  { id: "materiais", nome: "Materiais" },
  { id: "visao", nome: "Visão geral" },
  { id: "ementa", nome: "Ementa" },
  { id: "cards", nome: "Cards de Conhecimento" },
  { id: "aulas", nome: "Aulas" },
  { id: "publicar", nome: "Publicar" },
];
const ETAPAS: Etapa[] = ["visao", "ementa", "cards", "aulas"];
const NOME_ETAPA: Record<Etapa, string> = { visao: "Visão geral", ementa: "Ementa", cards: "Cards de Conhecimento", aulas: "Aulas" };
const PROXIMA: Record<Etapa, Passo> = { visao: "ementa", ementa: "cards", cards: "aulas", aulas: "publicar" };
const APROVAR: Record<Etapa, string> = {
  visao: "Aprovar visão e gerar ementa",
  ementa: "Aprovar e gerar cards",
  cards: "Aprovar e gerar aulas",
  aulas: "Aprovar aulas",
};
const DESCRICAO_GERAR: Record<Etapa, string> = {
  visao: "O Edu lê a sua orientação e os materiais e propõe o objetivo geral, o público-alvo e as competências da trilha, para você revisar e aprovar.",
  ementa: "O Edu monta os módulos e tópicos a partir da visão geral aprovada, ligando cada tópico às competências e citando as páginas de origem.",
  cards: "O Edu decompõe cada tópico da ementa em Cards de Conhecimento atômicos até cobrir 100% da ementa.",
  aulas:
    "O Edu trabalha em paralelo, um módulo de cada vez, montando microaulas com textos curtos e desafios (quiz, completar, ordenar e pergunta aberta com feedback do Edu).",
};

type Rascunhos = { visao: VisaoGeral; ementa: Ementa; cards: CardsDraft; aulas: AulasDraft };

function vazio(etapa: Etapa, r: Rascunhos) {
  if (etapa === "visao") return !r.visao.objetivo_geral && r.visao.competencias.length === 0;
  return etapa === "ementa" ? r.ementa.modulos.length === 0 : etapa === "cards" ? r.cards.cards.length === 0 : r.aulas.aulas.length === 0;
}

/** O que o passo "Publicar" recebe do estúdio (o painel em si é de cada produto). */
export interface PropsPublicar {
  trilhaId: string;
  ementa: Ementa;
  cards: CardsDraft;
  aulas: AulasDraft;
  publicada: boolean;
  tudoAprovado: boolean;
}

export function Estudio({
  estado,
  config,
  contexto,
  painelPublicar,
  usuario,
  tutor,
  demo,
}: {
  estado: EstadoEstudio;
  /** Server actions e rotas do painel. */
  config: ConfigEstudio;
  /** Complemento da linha abaixo do título (ex.: o produto da trilha). */
  contexto: ReactNode;
  /** Painel do passo "Publicar" (fica no app). */
  painelPublicar: (p: PropsPublicar) => ReactNode;
  usuario: { id: string; nome: string };
  /** Estado do índice do tutor; undefined = não mostrar. */
  tutor?: EstadoTutor | null;
  /**
   * Tour com a trilha de exemplo: tudo somente leitura (nenhuma ação vai ao servidor) e o tour percorre as
   * etapas. `depois` é para onde ir ao terminar ou pular.
   */
  demo?: { depois: string };
}) {
  const { aprovar, desfazerEtapa, salvarEdicao, concluirTour } = config.acoes;
  const { rotas } = config;
  const router = useRouter();
  const trilhaId = estado.trilha.id;
  const [rascunhos, setRascunhos] = useState<Rascunhos>(estado.rascunhos as Rascunhos);
  const [sujo, setSujo] = useState<Partial<Record<Etapa, string[]>>>({});
  const [foco, setFoco] = useState<Foco | null>(null);
  // Tour de exemplo: ao terminar ou pular, registra que já viu e segue para o destino.
  const [saindoDoTour, iniciarSaida] = useTransition();
  const terminarTour = () =>
    iniciarSaida(async () => {
      await concluirTour?.();
      router.push(demo?.depois ?? rotas.depoisDoTour ?? rotas.trilhas);
    });
  // Chat do Edu: recolhido por padrão (mais espaço para o rascunho); a escolha do criador fica salva no navegador.
  const [chatAberto, setChatAberto] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: lê a preferência salva só ao montar
  useEffect(() => {
    if (demo) return;
    try {
      setChatAberto(localStorage.getItem(CHAVE_CHAT) === "1");
    } catch {
      // sem localStorage: fica recolhido
    }
  }, []);
  const escolherChat = (aberto: boolean) => {
    setChatAberto(aberto);
    if (demo) return;
    try {
      localStorage.setItem(CHAVE_CHAT, aberto ? "1" : "0");
    } catch {
      // sem localStorage: vale só nesta visita
    }
  };
  // Comentar um item abre o chat (sem mudar a preferência salva).
  const focar = (f: Foco) => {
    setFoco(f);
    setChatAberto(true);
  };
  const [acao, iniciar] = useTransition();
  const [verPendencias, setVerPendencias] = useState(false);
  // Recorte e complementos: atualizados pelo cartão do passo Materiais sem esperar o refresh.
  // O objetivo vem da trilha (editado em "Editar trilha").
  const [recorte, setRecorte] = useState(() =>
    normalizarOrientacao({ conteudos: estado.trilha.orientacao_conteudos, complementos: estado.trilha.orientacao_complementos }),
  );
  const orientacao = { ...recorte, objetivo: normalizarOrientacao({ objetivo: estado.trilha.orientacao_objetivo }).objetivo };

  const status = (e: Etapa) => estado.etapas[e]?.status ?? "pendente";
  const passoInicial = (): Passo => {
    if (!estado.materiais.some((m) => m.status === "pronto")) return "materiais";
    for (const e of ETAPAS) if (status(e) !== "aprovada") return e;
    return "publicar";
  };
  const [passo, setPasso] = useState<Passo>(passoInicial);

  const versoes = ETAPAS.map((e) => estado.etapas[e]?.versao_atual).join("-");
  // biome-ignore lint/correctness/useExhaustiveDependencies: recarrega os rascunhos só quando alguma versão salva muda
  useEffect(() => {
    setRascunhos(estado.rascunhos as Rascunhos);
    setSujo({});
  }, [versoes]);

  const { execucao, rodar, cancelar, limpar } = useAgente(trilhaId, {
    onDraft: (etapa, draft) => setRascunhos((r) => ({ ...r, [etapa]: draft })),
    onFim: () => router.refresh(),
  });
  useEffect(() => {
    if (execucao?.mensagemId && estado.mensagens.some((m) => m.id === execucao.mensagemId)) limpar();
  }, [estado.mensagens, execucao?.mensagemId, limpar]);
  // Se a execução falhar, descarta o rascunho parcial transmitido e volta à última versão salva.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reage só ao erro da execução
  useEffect(() => {
    if (execucao?.erro) {
      setRascunhos(estado.rascunhos as Rascunhos);
      router.refresh();
    }
  }, [execucao?.erro]);

  const rodando = !!execucao && !execucao.mensagemId && !execucao.erro;
  // Somente leitura no tour de exemplo.
  const editavel = !rodando && !demo;
  const etapaAtual: Etapa | null = passo === "materiais" || passo === "publicar" ? null : passo;
  const materiaisIds = estado.materiais.map((m) => m.id);

  // biome-ignore lint/correctness/useExhaustiveDependencies: materiaisIds é recriado a cada render; a validação roda quando a etapa ou os rascunhos mudam
  const pendencias: Pendencia[] = useMemo(() => {
    if (!etapaAtual || vazio(etapaAtual, rascunhos)) return [];
    if (etapaAtual === "visao") return validarVisao(rascunhos.visao);
    if (etapaAtual === "ementa") return validarEmenta(rascunhos.ementa, materiaisIds);
    if (etapaAtual === "cards") return validarCards(rascunhos.ementa, rascunhos.cards, materiaisIds);
    return validarAulas(rascunhos.ementa, rascunhos.cards, rascunhos.aulas);
  }, [etapaAtual, rascunhos]);
  const cont = contarPendencias(pendencias);
  // Ementa: cada módulo precisa do check "Revisado" do criador antes de gerar os cards.
  const revisoesEmenta = lerRevisoes(estado.etapas.ementa?.revisoes);
  // Cards: o mesmo check, por módulo, antes de gerar as aulas.
  const revisoesCards = lerRevisoes(estado.etapas.cards?.revisoes);
  const pendentesRevisao =
    etapaAtual === "ementa"
      ? modulosPendentes(rascunhos.ementa, revisoesEmenta).length
      : etapaAtual === "cards"
        ? modulosPendentesCards(rascunhos.ementa, rascunhos.cards, revisoesCards).length
        : 0;

  // Respostas do Edu que chegaram com o chat recolhido (selo na faixa lateral).
  const respostas = etapaAtual ? estado.mensagens.filter((m) => m.etapa === etapaAtual && m.role === "assistant").length : 0;
  const [vistas, setVistas] = useState<Partial<Record<Etapa, number>>>({});
  useEffect(() => {
    if (!etapaAtual) return;
    if (chatAberto || vistas[etapaAtual] === undefined) setVistas((v) => (v[etapaAtual] === respostas ? v : { ...v, [etapaAtual]: respostas }));
  }, [etapaAtual, chatAberto, respostas, vistas]);
  const respostasNovas = etapaAtual ? Math.max(0, respostas - (vistas[etapaAtual] ?? respostas)) : 0;

  const gerar = (etapa: Etapa) => {
    if (demo) return;
    setPasso(etapa);
    setFoco(null);
    // Gerar abre o chat para o criador acompanhar o Edu trabalhando.
    setChatAberto(true);
    rodar({ etapa, modo: "geracao" });
  };
  const conversar = (texto: string) => {
    if (!etapaAtual || demo) return;
    rodar({ etapa: etapaAtual, modo: "refinamento", mensagem: texto, foco });
    setFoco(null);
  };
  const editarLocal = (etapa: Etapa, snapshot: VisaoGeral | Ementa | CardsDraft | AulasDraft, resumo: string) => {
    setRascunhos((r) => ({ ...r, [etapa]: snapshot }));
    setSujo((s) => ({ ...s, [etapa]: [...(s[etapa] ?? []), resumo] }));
  };
  const salvarAgora = async (etapa: Etapa) => {
    const resumos = sujo[etapa] ?? [];
    await salvarEdicao(trilhaId, etapa, rascunhos[etapa], resumos.length > 2 ? `${resumos.length} edições manuais` : resumos.join("; "));
    setSujo((s) => ({ ...s, [etapa]: undefined }));
  };
  const salvar = (etapa: Etapa) => iniciar(() => salvarAgora(etapa));
  const aprovarEtapa = (etapa: Etapa) =>
    iniciar(async () => {
      await aprovar(trilhaId, etapa);
      const prox = PROXIMA[etapa];
      setPasso(prox);
      if (prox !== "publicar" && vazio(prox as Etapa, rascunhos)) gerar(prox as Etapa);
    });

  const podeAbrir = (p: Passo) => {
    if (p === "materiais") return true;
    if (p === "visao") return estado.materiais.some((m) => m.status === "pronto");
    if (p === "ementa") return status("visao") === "aprovada" || !vazio("ementa", rascunhos);
    if (p === "cards") return status("ementa") === "aprovada" || !vazio("cards", rascunhos);
    if (p === "aulas") return status("cards") === "aprovada" || !vazio("aulas", rascunhos);
    return status("aulas") === "aprovada";
  };
  const qualidade = etapaAtual ? ((estado.etapas[etapaAtual]?.qualidade as AvaliacaoQualidade | null) ?? null) : null;
  const anterior: Record<Etapa, Etapa | null> = { visao: null, ementa: "visao", cards: "ementa", aulas: "cards" };
  const preRequisitoOk = etapaAtual ? !anterior[etapaAtual] || status(anterior[etapaAtual]!) === "aprovada" : false;
  // A visão geral só é gerada com o objetivo da trilha definido (a rota do agente também exige).
  const podeGerarEtapa = preRequisitoOk && (etapaAtual !== "visao" || objetivoDefinido(orientacao.objetivo));
  // A ementa ficou desatualizada porque a visão aprovada mudou depois que ela foi gerada.
  const ementaComVisaoAntiga = etapaAtual === "ementa" && status("ementa") === "desatualizada" && status("visao") === "aprovada";

  return (
    // Ocupa exatamente a tela: só o conteúdo da etapa e o chat rolam (a página e a barra lateral ficam paradas).
    <ProvedorEstudio config={config}>
      <div className="flex h-dvh flex-col overflow-hidden">
        {/* Cabeçalho + stepper */}
        <header className="border-b border-linha bg-superficie px-6 pb-4 pt-4">
          <div className="flex items-center gap-3">
            <Link
              href={rotas.voltar?.({ id: trilhaId, publicada: estado.trilha.status === "publicada" }) ?? rotas.trilhas}
              className="grid size-9 place-items-center rounded-xl text-suave hover:bg-fundo"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <TileIcone tom={tomDe(estado.trilha.cor)}>
              <Icone nome={estado.trilha.icone} />
            </TileIcone>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-extrabold">{estado.trilha.titulo}</h1>
                {estado.trilha.status === "publicada" ? <Pill tom="verde">Publicada</Pill> : <Pill tom="laranja">Rascunho</Pill>}
                {tutor !== undefined && (
                  <SeloTutor trilhaId={estado.trilha.id} publicada={estado.trilha.status === "publicada"} ativo={estado.trilha.tutor_ativo} tutor={tutor} />
                )}
              </div>
              <div className="truncate text-xs text-suave">Estúdio de criação com o Edu · {contexto}</div>
            </div>
            {demo ? (
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full bg-ambar-bg px-3 py-1 text-xs font-semibold text-[#8a6100] md:inline">
                  Trilha de exemplo · nada aqui é salvo
                </span>
                <Botao variante="fantasma" tamanho="sm" disabled={saindoDoTour} onClick={terminarTour}>
                  Pular tour
                </Botao>
                <Botao tamanho="sm" disabled={saindoDoTour} onClick={terminarTour}>
                  Criar minha trilha <ArrowRight className="size-3.5" />
                </Botao>
              </div>
            ) : (
              <>
                {rotas.tour && (
                  <Link
                    href={rotas.tour(rotas.estudio?.(trilhaId) ?? `${rotas.trilhas}/${trilhaId}`)}
                    className={classesBotao("fantasma", "sm")}
                    title="Ver o tour do estúdio com a trilha de exemplo"
                  >
                    <Compass className="size-3.5" /> Guia
                  </Link>
                )}
                <BotaoEditarTrilha
                  trilha={{
                    id: trilhaId,
                    titulo: estado.trilha.titulo,
                    objetivo: estado.trilha.orientacao_objetivo,
                    descricao: estado.trilha.descricao,
                    cor: estado.trilha.cor,
                    icone: estado.trilha.icone,
                    publicada: estado.trilha.status === "publicada",
                  }}
                  desabilitado={rodando}
                />
              </>
            )}
          </div>
          <ol className="mt-4 flex items-center gap-2" data-tour="estudio-passos">
            {PASSOS.map((p, i) => {
              // Materiais só fica concluído quando o criador manda gerar a visão geral ("Salvar e continuar").
              const materiaisOk = (estado.etapas.visao?.versao_atual ?? 0) > 0 || (rodando && execucao?.etapa === "visao");
              const st =
                p.id === "materiais"
                  ? materiaisOk
                    ? "aprovada"
                    : "pendente"
                  : p.id === "publicar"
                    ? estado.trilha.status === "publicada"
                      ? "aprovada"
                      : "pendente"
                    : status(p.id);
              const ativo = passo === p.id;
              const gerandoEsta = rodando && execucao?.etapa === p.id;
              return (
                <li key={p.id} className="flex flex-1 items-center gap-2">
                  <button
                    type="button"
                    disabled={!podeAbrir(p.id)}
                    onClick={() => setPasso(p.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                      ativo ? "border-marca-300 bg-marca-50" : "border-linha hover:bg-fundo",
                      // No tour, a etapa atual fica acesa acima do escurecimento: dá para ver em que ponto do fluxo se está.
                      demo && ativo && "relative z-[85] bg-superficie ring-4 ring-marca-300",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold",
                        st === "aprovada" ? "bg-verde text-white" : ativo ? "gradiente-marca text-white" : "bg-fundo text-suave",
                        st === "desatualizada" && "bg-ambar text-white",
                      )}
                    >
                      {gerandoEsta ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : st === "aprovada" ? (
                        <Check className="size-4" strokeWidth={3} />
                      ) : st === "desatualizada" ? (
                        "!"
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("line-clamp-2 text-sm leading-tight font-bold", ativo ? "text-marca-800" : "text-tinta")}>{p.nome}</span>
                      <span className="block truncate text-[10px] text-suave">
                        {gerandoEsta
                          ? "gerando…"
                          : st === "aprovada"
                            ? p.id === "publicar"
                              ? "publicada"
                              : "aprovada"
                            : st === "em_revisao"
                              ? "aguardando revisão"
                              : st === "desatualizada"
                                ? "revisar (etapa anterior mudou)"
                                : "pendente"}
                      </span>
                    </span>
                  </button>
                  {i < PASSOS.length - 1 && <ArrowRight className="size-4 shrink-0 text-linha" />}
                </li>
              );
            })}
          </ol>
        </header>

        <div
          className={cn(
            "grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] transition-[grid-template-columns] duration-300",
            !etapaAtual ? "grid-cols-1" : chatAberto ? "grid-cols-[minmax(0,1fr)_400px]" : "grid-cols-[minmax(0,1fr)_84px]",
          )}
        >
          <div className="flex min-h-0 flex-col">
            <div className="rolagem-fina min-h-0 flex-1 overflow-y-auto px-8 py-7">
              {passo === "materiais" && (
                <PainelMateriais
                  trilhaId={trilhaId}
                  materiais={estado.materiais}
                  podeGerar={editavel}
                  orientacao={orientacao}
                  onOrientacao={setRecorte}
                  somenteLeitura={!!demo}
                />
              )}
              {etapaAtual &&
                vazio(etapaAtual, rascunhos) &&
                (rodando && execucao?.etapa === etapaAtual ? (
                  <Gerando etapa={etapaAtual} status={execucao.status} passos={execucao.chips.length} />
                ) : (
                  <div className="mx-auto mt-10 max-w-lg text-center">
                    <div className="gradiente-marca mx-auto grid size-16 place-items-center rounded-3xl text-white shadow-flutuante">
                      <Sparkles className="size-8" />
                    </div>
                    <h2 className="mt-5 text-xl font-extrabold">
                      Gerar {etapaAtual === "cards" ? NOME_ETAPA.cards : NOME_ETAPA[etapaAtual].toLowerCase()} com o Edu
                    </h2>
                    <p className="mt-2 text-sm text-suave">{DESCRICAO_GERAR[etapaAtual]}</p>
                    <Botao tamanho="lg" className="mt-6" disabled={!podeGerarEtapa || rodando} onClick={() => gerar(etapaAtual)}>
                      <Sparkles className="size-4" /> Gerar agora
                    </Botao>
                    {!preRequisitoOk && <p className="mt-3 text-xs text-vermelho">Aprove a etapa anterior primeiro.</p>}
                    {preRequisitoOk && !podeGerarEtapa && (
                      <p className="mt-3 text-xs text-vermelho">Descreva o objetivo da trilha em &quot;Editar trilha&quot;, no topo do estúdio, primeiro.</p>
                    )}
                  </div>
                ))}
              {etapaAtual === "visao" && !vazio("visao", rascunhos) && (
                <PainelVisao
                  aprovada={status("visao") === "aprovada" && !sujo.visao?.length}
                  visao={rascunhos.visao}
                  editavel={editavel}
                  foco={foco}
                  onFoco={focar}
                  onEditar={(v, r) => editarLocal("visao", v, r)}
                />
              )}
              {etapaAtual === "ementa" && !vazio("ementa", rascunhos) && (
                <PainelEmenta
                  trilhaId={trilhaId}
                  visaoMudou={ementaComVisaoAntiga}
                  onGerarDeNovo={() => gerar("ementa")}
                  onEditarVisao={() => setPasso("visao")}
                  ementa={rascunhos.ementa}
                  materiais={estado.materiais}
                  editavel={editavel}
                  foco={foco}
                  onFoco={focar}
                  onEditar={(e, r) => editarLocal("ementa", e, r)}
                  revisoes={revisoesEmenta}
                  temEdicaoNaoSalva={!!sujo.ementa?.length}
                  onSalvarEdicoes={() => salvarAgora("ementa")}
                />
              )}
              {etapaAtual === "cards" && !vazio("cards", rascunhos) && (
                <PainelCards
                  ementa={rascunhos.ementa}
                  cards={rascunhos.cards}
                  materiais={estado.materiais}
                  editavel={editavel}
                  foco={foco}
                  onFoco={focar}
                  onEditar={(c, r) => editarLocal("cards", c, r)}
                  trilhaId={trilhaId}
                  revisoes={revisoesCards}
                  temEdicaoNaoSalva={!!sujo.cards?.length}
                  onSalvarEdicoes={() => salvarAgora("cards")}
                />
              )}
              {etapaAtual === "aulas" && !vazio("aulas", rascunhos) && (
                <PainelAulas
                  trilhaId={trilhaId}
                  ementa={rascunhos.ementa}
                  cards={rascunhos.cards}
                  aulas={rascunhos.aulas}
                  editavel={editavel}
                  foco={foco}
                  onFoco={focar}
                  onEditar={(a, r) => editarLocal("aulas", a, r)}
                />
              )}
              {passo === "publicar" && (
                <fieldset disabled={!!demo} className="contents">
                  {painelPublicar({
                    trilhaId,
                    ementa: rascunhos.ementa,
                    cards: rascunhos.cards,
                    aulas: rascunhos.aulas,
                    publicada: estado.trilha.status === "publicada",
                    tudoAprovado: ETAPAS.every((e) => status(e) === "aprovada"),
                  })}
                </fieldset>
              )}
            </div>

            {passo === "materiais" && (
              <BarraMateriais
                materiais={estado.materiais}
                orientacao={orientacao}
                jaTemVisao={!vazio("visao", rascunhos)}
                podeGerar={editavel}
                onGerar={() => gerar("visao")}
                onContinuar={() => setPasso("visao")}
              />
            )}

            {/* Barra de ações da etapa */}
            {etapaAtual && !vazio(etapaAtual, rascunhos) && (
              <div className="border-t border-linha bg-superficie px-8 py-3" data-tour="estudio-rodape">
                {verPendencias && pendencias.length > 0 && (
                  <div className="rolagem-fina mb-3 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-fundo p-3 text-xs">
                    {pendencias.map((p, i) => (
                      <div key={i} className={p.nivel === "erro" ? "text-vermelho" : "text-[#8a6100]"}>
                        <b>{p.alvo}</b> · {p.mensagem}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-suave">
                    <span>versão {estado.etapas[etapaAtual]?.versao_atual ?? 0}</span>
                    {qualidade && (
                      <Pill tom="ambar" title="Nota do revisor pedagógico">
                        <Star className="size-3 fill-ambar" /> {qualidade.nota_geral.toFixed(1)}/5
                      </Pill>
                    )}
                    <button type="button" onClick={() => setVerPendencias((v) => !v)}>
                      {cont.erros > 0 ? (
                        <Pill tom="vermelho">
                          <AlertTriangle className="size-3" /> {cont.erros} erro(s)
                        </Pill>
                      ) : cont.avisos > 0 ? (
                        <Pill tom="ambar">{cont.avisos} aviso(s)</Pill>
                      ) : (
                        <Pill tom="verde">
                          <Check className="size-3" /> validação ok
                        </Pill>
                      )}
                    </button>
                    {status(etapaAtual) === "desatualizada" && <Pill tom="ambar">A etapa anterior mudou — gere novamente ou revise</Pill>}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {sujo[etapaAtual]?.length ? (
                      <>
                        <span className="text-xs font-semibold text-marca-700">{sujo[etapaAtual]!.length} edição(ões) não salvas</span>
                        <Botao variante="contorno" disabled={acao} onClick={() => router.refresh()}>
                          Descartar
                        </Botao>
                        <Botao disabled={acao} onClick={() => salvar(etapaAtual)}>
                          Salvar alterações
                        </Botao>
                      </>
                    ) : (
                      <>
                        <Botao
                          variante="fantasma"
                          disabled={rodando || acao || (estado.etapas[etapaAtual]?.versao_atual ?? 0) <= 1}
                          onClick={() => iniciar(() => desfazerEtapa(trilhaId, etapaAtual))}
                          title="Voltar para a versão anterior"
                        >
                          <Undo2 className="size-4" /> Desfazer
                        </Botao>
                        <Botao variante="contorno" disabled={!editavel || acao || !podeGerarEtapa} onClick={() => gerar(etapaAtual)}>
                          <RotateCcw className="size-4" /> Gerar de novo
                        </Botao>
                        {status(etapaAtual) === "aprovada" ? (
                          <Botao variante="secundario" onClick={() => setPasso(PROXIMA[etapaAtual])}>
                            Aprovada · ir para {PROXIMA[etapaAtual] === "publicar" ? "Publicar" : NOME_ETAPA[PROXIMA[etapaAtual] as Etapa]}{" "}
                            <ArrowRight className="size-4" />
                          </Botao>
                        ) : (
                          <Botao
                            disabled={!editavel || acao || cont.erros > 0 || !preRequisitoOk || pendentesRevisao > 0}
                            title={pendentesRevisao > 0 ? `Marque os módulos como revisados (faltam ${pendentesRevisao})` : undefined}
                            onClick={() => aprovarEtapa(etapaAtual)}
                          >
                            {etapaAtual === "aulas" ? <Rocket className="size-4" /> : <Check className="size-4" />}
                            {APROVAR[etapaAtual]}
                          </Botao>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {etapaAtual && !chatAberto && (
            <TrilhoEdu trabalhando={rodando && execucao?.etapa === etapaAtual} novas={respostasNovas} onAbrir={() => escolherChat(true)} />
          )}
          {etapaAtual && chatAberto && (
            <ChatAgente
              etapa={etapaAtual}
              etapaNome={NOME_ETAPA[etapaAtual]}
              mensagens={estado.mensagens.filter((m) => m.etapa === etapaAtual)}
              execucao={execucao && execucao.etapa === etapaAtual ? execucao : null}
              foco={foco}
              onLimparFoco={() => setFoco(null)}
              onEnviar={conversar}
              onCancelar={cancelar}
              podeConversar={editavel && !vazio(etapaAtual, rascunhos) && !sujo[etapaAtual]?.length}
              usuario={usuario}
              onRecolher={() => escolherChat(false)}
            />
          )}
        </div>
        {demo && (
          <TourEstudio telaAtual={passo} aoTrocarTela={setPasso} aoAbrirChat={() => setChatAberto(true)} aoTerminar={terminarTour} passos={config.tour} />
        )}
      </div>
    </ProvedorEstudio>
  );
}

/** O que o Edu faz em cada etapa, na ordem: vira a lista de fases do carregamento. */
const FASES_GERACAO: Record<Etapa, string[]> = {
  visao: ["Lendo os materiais que você enviou", "Entendendo o objetivo e o recorte da trilha", "Definindo o público-alvo", "Escrevendo as competências"],
  ementa: [
    "Relendo a visão geral aprovada",
    "Mapeando os temas dos materiais",
    "Organizando os módulos e tópicos",
    "Ligando cada tópico às competências",
    "Conferindo se nada ficou de fora",
  ],
  cards: [
    "Relendo a ementa aprovada",
    "Buscando no material o conteúdo de cada tópico",
    "Escrevendo os Cards de Conhecimento",
    "Conferindo a cobertura da ementa",
  ],
  aulas: ["Relendo os Cards de Conhecimento", "Planejando as aulas de cada módulo", "Escrevendo os textos e os desafios", "Revisando gabaritos e explicações"],
};
const ARTIGO_ETAPA: Record<Etapa, string> = { visao: "a visão geral", ementa: "a ementa", cards: "os Cards de Conhecimento", aulas: "as aulas" };

/**
 * Carregamento de uma etapa sendo gerada: o Edu trabalhando e as fases do que ele faz. A fase avança
 * com o tempo e com as ações reais do agente, e a última só termina quando o rascunho chega.
 */
function Gerando({ etapa, status, passos }: { etapa: Etapa; status: string | null; passos: number }) {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const fases = FASES_GERACAO[etapa];
  const atual = Math.min(fases.length - 1, Math.max(Math.floor(segundos / 12), Math.floor(passos / 2)));
  const tempo = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto mt-8 max-w-xl">
      <div className="rounded-card border border-marca-100 bg-superficie p-8 text-center shadow-card">
        <div className="relative mx-auto size-20">
          <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-marca-100 border-t-marca-500 [animation-duration:1.6s]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/edu.svg" alt="" width={64} height={64} className="absolute inset-2 size-16 rounded-full bg-[#c7bdff]" />
        </div>
        <h2 className="mt-5 text-lg font-extrabold">O Edu está montando {ARTIGO_ETAPA[etapa]}</h2>
        <p className="mt-1 min-h-5 text-sm text-suave" aria-live="polite">
          {status ?? `${fases[atual]}…`}
        </p>

        <ol className="mx-auto mt-6 max-w-sm space-y-2.5 text-left text-sm">
          {fases.map((f, i) => (
            <li key={f} className={cn("flex items-center gap-3 transition", i > atual && "text-suave/70")}>
              {i < atual ? (
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-verde text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : i === atual ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-marca-600" />
              ) : (
                <span className="size-5 shrink-0 rounded-full border-2 border-linha" />
              )}
              <span className={cn(i === atual && "font-semibold text-tinta")}>{f}</span>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-xs text-suave">
          {tempo} · Pode levar alguns minutos. O passo a passo detalhado aparece no chat com o Edu, e o rascunho surge aqui assim que ficar pronto.
        </p>
      </div>
    </div>
  );
}
