"use client";

import { contarDesafios, todosTopicos } from "@edu/core";
import type { PropsPublicar } from "@edu/estudio";
import { Botao, Cartao, confirmar, TileIcone } from "@edu/ui";
import { Archive, BookOpen, Check, Copy, ExternalLink, EyeOff, HelpCircle, Layers, ListTree, Rocket, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { arquivar, despublicar, duplicar, publicar } from "@/app/(painel)/trilhas/[id]/actions";

/** Passo "Publicar" no Edu+ Criador: a trilha entra no produto e aparece para todos os assinantes. */
export function PainelPublicarCriador({
  trilhaId,
  ementa,
  cards,
  aulas,
  publicada,
  tudoAprovado,
  produto,
  linkPagina,
}: PropsPublicar & {
  produto: { id?: string; nome: string; publicado: boolean; assinantes: number };
  linkPagina: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [estaPublicada, setEstaPublicada] = useState(publicada);
  const desafios = contarDesafios(aulas.aulas).corrigiveis;
  const acao = async (fn: () => Promise<unknown>, pergunta?: string) => {
    if (pergunta && !(await confirmar(pergunta, { titulo: "Confirmar", botao: "Confirmar" }))) return;
    setErro(null);
    iniciar(async () => {
      try {
        await fn();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível concluir a ação.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5" data-tour="publicar-painel">
      <div className="text-center">
        <div className="gradiente-marca mx-auto grid size-14 place-items-center rounded-2xl text-white shadow-flutuante">
          <Rocket className="size-7" />
        </div>
        <h2 className="mt-4 text-xl font-extrabold">Publicar em {produto.nome}</h2>
        <p className="mt-1 text-sm text-suave">
          A trilha aparece para todos os seus assinantes, com XP, ofensiva e conquistas. Você acompanha as entradas e a conclusão em Vendas.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { i: <ListTree />, r: "Módulos", v: ementa.modulos.length, t: "lilas" as const },
          { i: <BookOpen />, r: "Tópicos", v: todosTopicos(ementa).length, t: "azul" as const },
          { i: <Layers />, r: "Cards de Conhecimento", v: cards.cards.length, t: "laranja" as const },
          { i: <HelpCircle />, r: `Aulas · ${desafios} desafios`, v: aulas.aulas.length, t: "verde" as const },
        ].map((x) => (
          <Cartao key={x.r} className="p-4">
            <TileIcone tom={x.t} tamanho="sm">
              {x.i}
            </TileIcone>
            <div className="mt-2 text-2xl font-extrabold">{x.v}</div>
            <div className="text-[11px] text-suave">{x.r}</div>
          </Cartao>
        ))}
      </div>

      <Cartao className="p-6">
        <div className="flex items-center gap-3">
          <TileIcone tom="lilas">
            <ShoppingBag />
          </TileIcone>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-suave">Produto</div>
            <div className="font-bold">
              {produto.nome}
              <span className="font-medium text-suave">
                {" "}
                · {produto.assinantes} assinante(s) · {produto.publicado ? "visível para os fãs" : "ainda não visível para os fãs"}
              </span>
            </div>
          </div>
        </div>
      </Cartao>

      {ok || estaPublicada ? (
        <Cartao className="flex items-center gap-4 border-verde/30 bg-verde-bg/60 p-5">
          <TileIcone tom="verde">
            <Check />
          </TileIcone>
          <div className="flex-1">
            <div className="font-bold text-[#11733f]">Trilha publicada!</div>
            <div className="text-sm text-[#11733f]/80">
              {produto.publicado ? (
                "Seus assinantes já podem começar."
              ) : (
                <>
                  Para os fãs verem, publique o produto{" "}
                  <Link href={produto.id ? `/produtos/${produto.id}` : "/produtos"} className="font-semibold underline">
                    {produto.nome}
                  </Link>{" "}
                  e abra sua página em{" "}
                  <Link href="/perfil#pagina" className="font-semibold underline">
                    Perfil
                  </Link>
                  .
                </>
              )}{" "}
              Mudanças aprovadas no estúdio só chegam aos alunos quando você publicar de novo; o progresso é preservado.
            </div>
          </div>
          <a href={linkPagina} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-semibold text-[#11733f]">
            Sua página <ExternalLink className="size-3.5" />
          </a>
        </Cartao>
      ) : null}

      <Botao
        tamanho="xl"
        className="w-full"
        disabled={!tudoAprovado || pendente}
        onClick={() =>
          acao(async () => {
            await publicar(trilhaId);
            setOk(true);
            setEstaPublicada(true);
          })
        }
      >
        <Rocket className="size-5" /> {pendente ? "Aguarde…" : estaPublicada ? "Publicar novamente" : "Publicar para os assinantes"}
      </Botao>
      {erro && <p className="text-center text-sm font-semibold text-vermelho">{erro}</p>}

      <div className="flex flex-wrap justify-center gap-2 border-t border-linha pt-4">
        {estaPublicada && (
          <Botao
            variante="contorno"
            tamanho="sm"
            disabled={pendente}
            onClick={() =>
              acao(async () => {
                await despublicar(trilhaId);
                setEstaPublicada(false);
                setOk(false);
              }, "Tirar a trilha do app dos assinantes? O progresso fica guardado e volta ao publicar de novo.")
            }
          >
            <EyeOff className="size-3.5" /> Despublicar
          </Botao>
        )}
        <Botao variante="contorno" tamanho="sm" disabled={pendente} onClick={() => acao(() => duplicar(trilhaId))}>
          <Copy className="size-3.5" /> Duplicar trilha
        </Botao>
        <Botao
          variante="perigo"
          tamanho="sm"
          disabled={pendente}
          onClick={() => acao(() => arquivar(trilhaId), "Arquivar a trilha? Ela sai do app dos assinantes e da sua lista.")}
        >
          <Archive className="size-3.5" /> Arquivar
        </Botao>
      </div>
      {!tudoAprovado && (
        <p className="text-center text-xs text-vermelho">Aprove a visão geral, a ementa, os Cards de Conhecimento e as aulas antes de publicar.</p>
      )}
    </div>
  );
}
