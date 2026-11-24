"use client";

import { type BlocoAluno, type CorrecaoDesafio, LIMITES, type RespostaDesafio } from "@edu/core";
import { BarraProgresso, Botao, cn, lerEventosSSE } from "@edu/ui";
import { CheckCircle2, History, Sparkles, X, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CartaoAberta, type EstadoAberta, estadoAbertaInicial } from "./blocos/CartaoAberta";
import { CartaoCompletar } from "./blocos/CartaoCompletar";
import { CartaoOrdenar } from "./blocos/CartaoOrdenar";
import { CartaoQuiz } from "./blocos/CartaoQuiz";
import { CartaoTexto } from "./blocos/CartaoTexto";
import { Celebracao, type ResultadoAula } from "./Celebracao";
import { useAula } from "./contexto";
import { AvatarEdu } from "./edu/AvatarEdu";
import { PainelEdu } from "./edu/PainelEdu";
import type { EventoAberta } from "./servidor/aberta";

export function Player({
  aula,
  trilha,
  blocos,
  abertasAnteriores,
  posicao,
  totalAulas,
  modo,
  tentativa,
  edu,
}: {
  aula: { id: string; titulo: string; objetivo: string | null };
  trilha: { id: string; titulo: string; cor: string; icone: string };
  blocos: BlocoAluno[];
  abertasAnteriores: Record<string, { resposta: string; feedback: string }>;
  posicao: number;
  totalAulas: number;
  modo: "aula" | "revisao";
  tentativa: string;
  /** O Edu está disponível nesta trilha para o aluno. */
  edu: boolean;
}) {
  const { acoes, rotas } = useAula();
  const { responder, concluirAula } = acoes;
  const [visiveis, setVisiveis] = useState(1);
  // Correções devolvidas pelo servidor (quiz, completar, ordenar).
  const [correcoes, setCorrecoes] = useState<Record<string, CorrecaoDesafio>>({});
  const [verificando, setVerificando] = useState<Record<string, boolean>>({});
  // Rascunhos de resposta enquanto o aluno monta (antes de verificar).
  const [escolhasQuiz, setEscolhasQuiz] = useState<Record<string, number>>({});
  const [lacunas, setLacunas] = useState<Record<string, (number | null)[]>>({});
  const [ordens, setOrdens] = useState<Record<string, number[]>>({});
  const [abertas, setAbertas] = useState<Record<string, EstadoAberta>>({});
  const [puladas, setPuladas] = useState<Record<string, boolean>>({});
  const [resultado, setResultado] = useState<ResultadoAula | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  // Bloco atual e topo fixo: a rolagem automática mantém o bloco entre o topo e a barra inferior.
  const atualRef = useRef<HTMLDivElement>(null);
  const topoRef = useRef<HTMLElement>(null);
  // Edu: a bolinha fica logo acima do rodapé (que muda de altura) e some enquanto há um desafio na tela.
  const rodapeRef = useRef<HTMLDivElement>(null);
  const [alturaRodape, setAlturaRodape] = useState(110);
  const [eduAberto, setEduAberto] = useState(false);
  const fecharEdu = useCallback(() => setEduAberto(false), []);
  useEffect(() => {
    const el = rodapeRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAlturaRodape(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const atual = blocos[visiveis - 1];
  const ultimo = visiveis >= blocos.length;

  const lacunasDe = (id: string, n: number) => lacunas[id] ?? Array<number | null>(n).fill(null);
  const ordemDe = (id: string, n: number) => ordens[id] ?? Array.from({ length: n }, (_, i) => i);
  const abertaDe = (id: string) => abertas[id] ?? estadoAbertaInicial();
  const mudarAberta = (id: string, f: (e: EstadoAberta) => EstadoAberta) => setAbertas((x) => ({ ...x, [id]: f(x[id] ?? estadoAbertaInicial()) }));

  /** Resposta pronta para verificar no bloco atual (completar/ordenar), ou null se incompleta. */
  const rascunhoAtual = (): RespostaDesafio | null => {
    if (atual?.tipo === "completar") {
      const l = lacunasDe(atual.id, atual.nLacunas);
      return l.every((x) => x !== null) ? { tipo: "completar", escolhas: l as number[] } : null;
    }
    if (atual?.tipo === "ordenar") return { tipo: "ordenar", ordem: ordemDe(atual.id, atual.passos.length) };
    return null;
  };

  const blocoConcluido = (b: BlocoAluno | undefined) => {
    if (!b || b.tipo === "texto") return true;
    if (b.tipo === "aberta") return abertaDe(b.id).status === "pronto" || !!puladas[b.id];
    return !!correcoes[b.id];
  };
  const aguardando = !blocoConcluido(atual);
  const correcaoAtual = atual && atual.tipo !== "texto" && atual.tipo !== "aberta" ? (correcoes[atual.id] ?? null) : null;
  const abertaAtual = atual?.tipo === "aberta" ? abertaDe(atual.id) : null;

  const verificar = async (blocoId: string, resposta: RespostaDesafio) => {
    if (correcoes[blocoId] || verificando[blocoId]) return;
    setErro(null);
    setVerificando((v) => ({ ...v, [blocoId]: true }));
    try {
      const r = await responder(aula.id, blocoId, resposta, tentativa);
      if ("erro" in r) throw new Error(r.erro);
      setCorrecoes((x) => ({ ...x, [blocoId]: r.correcao }));
    } catch (e) {
      if (resposta.tipo === "quiz") {
        setEscolhasQuiz((x) => {
          const resto = { ...x };
          delete resto[blocoId];
          return resto;
        });
      }
      setErro(e instanceof Error && e.message ? e.message : "Sem conexão. Tente responder de novo.");
    } finally {
      setVerificando((v) => ({ ...v, [blocoId]: false }));
    }
  };

  const escolherQuiz = (blocoId: string, i: number) => {
    if (escolhasQuiz[blocoId] !== undefined) return;
    setEscolhasQuiz((x) => ({ ...x, [blocoId]: i }));
    void verificar(blocoId, { tipo: "quiz", opcao: i });
  };

  const enviarAberta = async (blocoId: string) => {
    const texto = abertaDe(blocoId).texto.trim();
    if (texto.length < LIMITES.respostaAluno.min) return;
    setErro(null);
    mudarAberta(blocoId, (e) => ({ ...e, status: "enviando", enviada: texto, feedback: "", erro: null }));
    try {
      const resp = await fetch(rotas.aberta(aula.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocoId, tentativa, resposta: texto }),
      });
      if (!resp.ok) {
        const msg = (await resp.text()) || "Não consegui enviar sua resposta.";
        // Indisponível ou limite diário: libera o "Pular" na hora.
        mudarAberta(blocoId, (e) => ({ ...e, status: "erro", erro: msg, falhas: resp.status === 409 ? 2 : e.falhas + 1 }));
        return;
      }
      let terminou = false;
      await lerEventosSSE<EventoAberta>(resp, (ev) => {
        if (ev.tipo === "texto") mudarAberta(blocoId, (e) => ({ ...e, feedback: e.feedback + ev.delta }));
        else if (ev.tipo === "fim") {
          terminou = true;
          mudarAberta(blocoId, (e) => ({ ...e, status: "pronto", feedback: ev.feedback }));
        } else throw new Error(ev.mensagem);
      });
      if (!terminou) throw new Error("A conexão caiu antes do fim do feedback. Tente enviar de novo.");
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : "Sem conexão. Tente enviar de novo.";
      mudarAberta(blocoId, (x) => ({ ...x, status: "erro", erro: msg, falhas: x.falhas + 1, feedback: "" }));
    }
  };

  /**
   * Traz o bloco atual para a área visível, que fica entre o topo fixo e a barra inferior (a barra
   * cobre o fim da tela e cresce com o "Mandou bem!"). Só rola para baixo: se o bloco já está à
   * vista, a tela fica onde está. Bloco maior que a tela: o começo fica logo abaixo do topo, para a
   * pergunta não ser cortada (a não ser que o aluno já tenha rolado para além dela). Depois da
   * resposta, o alvo passa a ser a explicação (ou o feedback do Edu, na pergunta aberta): ela aparece
   * inteira e, se for maior que a tela, a partir do começo.
   */
  const ajustarRolagem = useCallback((suave: boolean) => {
    const bloco = atualRef.current;
    const rodape = rodapeRef.current;
    if (!bloco || !rodape) return;
    const alvo = bloco.querySelector<HTMLElement>("[data-rolagem-alvo]") ?? bloco;
    const r = alvo.getBoundingClientRect();
    const limiteAlto = (topoRef.current?.getBoundingClientRect().bottom ?? 0) + 12;
    const limiteBaixo = rodape.getBoundingClientRect().top - 12;
    let delta = r.bottom - limiteBaixo;
    if (alvo !== bloco || r.top >= limiteAlto) delta = Math.min(delta, r.top - limiteAlto);
    if (delta > 1) rolarPor(bloco, delta, suave);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: o passo visível e as correções são o gatilho para reposicionar a tela
  useEffect(() => {
    // Primeiro ajuste suave. Depois, o cartão ainda cresce (a explicação abre animada) e a barra
    // inferior muda de altura: a tela acompanha o crescimento quadro a quadro, por até 1,5 s.
    // Se o aluno rolar a tela nesse meio-tempo, para de acompanhar.
    let parado = false;
    let quadro = 0;
    const alturas = new WeakMap<Element, number>();
    const ro = new ResizeObserver((entradas) => {
      let mudou = false;
      for (const e of entradas) {
        const h = e.contentRect.height;
        const antes = alturas.get(e.target);
        alturas.set(e.target, h);
        if (antes !== undefined && Math.abs(h - antes) > 0.5) mudou = true;
      }
      if (!mudou || parado) return;
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => !parado && ajustarRolagem(false));
    });
    const parar = () => {
      parado = true;
      cancelAnimationFrame(quadro);
      ro.disconnect();
    };
    const inicio = setTimeout(() => !parado && ajustarRolagem(true), 60);
    if (atualRef.current) ro.observe(atualRef.current);
    if (rodapeRef.current) ro.observe(rodapeRef.current);
    const limite = setTimeout(parar, 1500);
    window.addEventListener("wheel", parar, { passive: true });
    window.addEventListener("touchmove", parar, { passive: true });
    return () => {
      parar();
      clearTimeout(inicio);
      clearTimeout(limite);
      window.removeEventListener("wheel", parar);
      window.removeEventListener("touchmove", parar);
    };
  }, [visiveis, correcoes, abertaAtual?.status, ajustarRolagem]);

  const continuar = () => {
    if (aguardando) return;
    if (!ultimo) {
      setVisiveis((v) => v + 1);
      return;
    }
    iniciar(async () => {
      try {
        const r = await concluirAula(aula.id, trilha.id, tentativa);
        if ("erro" in r) {
          setErro(r.erro ?? "Não foi possível salvar seu progresso.");
          return;
        }
        setResultado({ recompensa: r.recompensa, proxima: r.proxima, acertos: r.recompensa.acertos, total: r.recompensa.total });
      } catch {
        setErro("Não foi possível salvar seu progresso. Tente de novo.");
      }
    });
  };

  // Ação principal da barra inferior, conforme o bloco atual.
  let rotulo = ultimo ? "Concluir aula" : "Continuar";
  let acao: () => void = continuar;
  let desabilitado = enviando;
  const podePular = atual?.tipo === "aberta" && !puladas[atual.id] && abertaAtual?.status === "erro" && abertaAtual.falhas >= 2;
  if (enviando) rotulo = "Salvando…";
  else if (atual && aguardando) {
    if (atual.tipo === "quiz") {
      rotulo = escolhasQuiz[atual.id] !== undefined ? "Verificando…" : "Escolha uma resposta";
      desabilitado = true;
    } else if (atual.tipo === "completar" || atual.tipo === "ordenar") {
      const r = rascunhoAtual();
      rotulo = verificando[atual.id] ? "Verificando…" : "Verificar";
      desabilitado = !r || !!verificando[atual.id];
      acao = () => r && void verificar(atual.id, r);
    } else if (atual.tipo === "aberta" && abertaAtual) {
      rotulo = abertaAtual.status === "enviando" ? "O Edu está lendo…" : abertaAtual.status === "erro" ? "Enviar de novo" : "Enviar resposta";
      desabilitado = abertaAtual.status === "enviando" || abertaAtual.texto.trim().length < LIMITES.respostaAluno.min;
      acao = () => void enviarAberta(atual.id);
    }
  }

  if (resultado) return <Celebracao resultado={resultado} trilhaId={trilha.id} />;

  return (
    <div className="relative mx-auto min-h-dvh max-w-[440px] bg-fundo">
      {/* Topo */}
      <header ref={topoRef} className="sticky top-0 z-30 border-b border-linha/60 bg-fundo/90 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href={rotas.trilha(trilha.id)} className="grid size-9 place-items-center rounded-full text-suave hover:bg-marca-50" aria-label="Sair da aula">
            <X className="size-5" />
          </Link>
          <BarraProgresso valor={(visiveis / blocos.length) * 100} className="h-3 flex-1" />
          <span className="w-10 text-right text-xs font-bold text-suave">
            {visiveis}/{blocos.length}
          </span>
        </div>
      </header>

      {/* O fim do conteúdo sempre pode subir acima da barra inferior, que muda de altura. */}
      <main className="px-5 pt-5" style={{ paddingBottom: alturaRodape + 24 }}>
        <div className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-marca-600">
            Aula {posicao} de {totalAulas} · {trilha.titulo}
          </div>
          <h1 className="mt-1 text-xl font-extrabold leading-tight tracking-tight">{aula.titulo}</h1>
          {modo === "revisao" && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-marca-50 px-2.5 py-1 text-[11px] font-semibold text-marca-700">
              <History className="size-3.5" /> Revisão · você já concluiu esta aula
            </div>
          )}
        </div>

        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {blocos.slice(0, visiveis).map((b, i) => {
              const bloqueado = i !== visiveis - 1;
              return (
                <motion.div
                  key={b.id}
                  ref={i === visiveis - 1 ? atualRef : undefined}
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: i === visiveis - 1 ? 1 : 0.92, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                >
                  {b.tipo === "texto" && <CartaoTexto bloco={b} />}
                  {b.tipo === "quiz" && (
                    <CartaoQuiz
                      bloco={b}
                      escolha={escolhasQuiz[b.id]}
                      correcao={correcoes[b.id]?.tipo === "quiz" ? (correcoes[b.id] as Extract<CorrecaoDesafio, { tipo: "quiz" }>) : null}
                      onEscolher={(op) => escolherQuiz(b.id, op)}
                    />
                  )}
                  {b.tipo === "completar" && (
                    <CartaoCompletar
                      bloco={b}
                      lacunas={lacunasDe(b.id, b.nLacunas)}
                      correcao={correcoes[b.id]?.tipo === "completar" ? (correcoes[b.id] as Extract<CorrecaoDesafio, { tipo: "completar" }>) : null}
                      bloqueado={bloqueado || !!verificando[b.id]}
                      onMudar={(l) => setLacunas((x) => ({ ...x, [b.id]: l }))}
                    />
                  )}
                  {b.tipo === "ordenar" && (
                    <CartaoOrdenar
                      bloco={b}
                      ordem={ordemDe(b.id, b.passos.length)}
                      correcao={correcoes[b.id]?.tipo === "ordenar" ? (correcoes[b.id] as Extract<CorrecaoDesafio, { tipo: "ordenar" }>) : null}
                      bloqueado={bloqueado || !!verificando[b.id]}
                      onMudar={(o) => setOrdens((x) => ({ ...x, [b.id]: o }))}
                    />
                  )}
                  {b.tipo === "aberta" && (
                    <CartaoAberta
                      bloco={b}
                      estado={abertaDe(b.id)}
                      anterior={abertasAnteriores[b.id]}
                      onTexto={(t) => mudarAberta(b.id, (e) => ({ ...e, texto: t }))}
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      {edu && !aguardando && (
        <div className="pointer-events-none fixed inset-x-0 z-30 mx-auto flex max-w-[440px] justify-end px-4" style={{ bottom: alturaRodape + 12 }}>
          <button
            type="button"
            onClick={() => setEduAberto(true)}
            aria-label="Conversar com o Edu"
            title="Conversar com o Edu"
            className="pointer-events-auto rounded-full border-[3px] border-white shadow-flutuante transition active:scale-95"
          >
            <AvatarEdu tamanho={56} ponto />
          </button>
        </div>
      )}
      <AnimatePresence>
        {eduAberto && (
          <PainelEdu trilha={{ id: trilha.id, titulo: trilha.titulo }} aula={{ id: aula.id, titulo: aula.titulo, ordem: posicao }} onFechar={fecharEdu} />
        )}
      </AnimatePresence>

      {/* Barra inferior estilo Duolingo */}
      <div
        ref={rodapeRef}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[440px] border-t px-5 pb-[max(env(safe-area-inset-bottom),18px)] pt-4 transition-colors duration-300",
          correcaoAtual
            ? correcaoAtual.correta
              ? "border-verde/30 bg-verde-bg"
              : "border-vermelho/30 bg-vermelho-bg"
            : abertaAtual?.status === "pronto"
              ? "border-marca-200 bg-marca-50"
              : "border-linha bg-superficie",
        )}
      >
        {correcaoAtual && (
          <div className={cn("mb-3 flex items-center gap-2 font-extrabold", correcaoAtual.correta ? "text-[#159a55]" : "text-vermelho")}>
            {correcaoAtual.correta ? <CheckCircle2 className="size-6" /> : <XCircle className="size-6" />}
            {correcaoAtual.correta ? "Mandou bem!" : "Quase! Vale revisar"}
          </div>
        )}
        {abertaAtual?.status === "pronto" && (
          <div className="mb-3 flex items-center gap-2 font-extrabold text-marca-700">
            <Sparkles className="size-5" /> Leia o feedback e siga em frente
          </div>
        )}
        {erro && <div className="mb-2 text-sm font-semibold text-vermelho">{erro}</div>}
        <div className="flex gap-2.5">
          {podePular && atual && (
            <Botao tamanho="xl" variante="secundario" className="flex-1" onClick={() => setPuladas((x) => ({ ...x, [atual.id]: true }))}>
              Pular
            </Botao>
          )}
          <Botao
            tamanho="xl"
            className="flex-1"
            variante={correcaoAtual ? (correcaoAtual.correta ? "sucesso" : "erro") : "primario"}
            disabled={desabilitado}
            onClick={acao}
          >
            {rotulo}
          </Botao>
        </div>
      </div>
    </div>
  );
}

/** Rola o contêiner do player (a janela no app; a tela do celular nas prévias) por `delta` px. */
function rolarPor(el: HTMLElement, delta: number, suave: boolean) {
  const behavior: ScrollBehavior = suave && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto";
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) {
      p.scrollBy({ top: delta, behavior });
      return;
    }
  }
  window.scrollBy({ top: delta, behavior });
}
