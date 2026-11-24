"use client";

import { type Orientacao, objetivoDefinido } from "@edu/core";
import type { Row } from "@edu/db";
import { Botao, Cartao, cn, TileIcone } from "@edu/ui";
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, Loader2, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CartaoOrientacao } from "./CartaoOrientacao";
import { useEstudio } from "./contexto";

interface Envio {
  nome: string;
  estado: "enviando" | "processando" | "pronto" | "erro";
  erro?: string;
}

const tamanho = (b: number | null) => (b ? (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`) : "");

export function PainelMateriais({
  trilhaId,
  materiais,
  podeGerar,
  orientacao,
  onOrientacao,
  somenteLeitura = false,
}: {
  trilhaId: string;
  materiais: Row<"materiais">[];
  podeGerar: boolean;
  /** Orientação salva da trilha (o objetivo libera a geração da visão geral). */
  orientacao: Orientacao;
  onOrientacao: (o: Orientacao) => void;
  /** Tour de exemplo: sem enviar nem excluir arquivos. */
  somenteLeitura?: boolean;
}) {
  const { excluirMaterial } = useEstudio().acoes;
  const router = useRouter();
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [, iniciar] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const enviarArquivos = async (arquivos: File[]) => {
    setEnvios((e) => [...e, ...arquivos.map((a) => ({ nome: a.name, estado: "enviando" as const }))]);
    const atualizar = (nome: string, patch: Partial<Envio>) => setEnvios((lista) => lista.map((x) => (x.nome === nome ? { ...x, ...patch } : x)));
    await Promise.all(
      arquivos.map(async (arq) => {
        try {
          const r1 = await fetch(`/api/trilhas/${trilhaId}/materiais`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: arq.name, mime: arq.type, tamanho: arq.size }),
          });
          const j1 = await r1.json();
          if (!r1.ok) throw new Error(j1.erro ?? "Falha ao preparar envio");
          const r2 = await fetch(j1.url, { method: "PUT", body: arq, headers: { "Content-Type": arq.type || "application/octet-stream" } });
          if (!r2.ok) throw new Error("Falha ao enviar o arquivo");
          atualizar(arq.name, { estado: "processando" });
          const r3 = await fetch(`/api/trilhas/${trilhaId}/materiais/processar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ materialId: j1.material.id }),
          });
          const j3 = await r3.json();
          if (!r3.ok) throw new Error(j3.erro ?? "Falha ao ler o arquivo");
          atualizar(arq.name, { estado: "pronto" });
        } catch (e) {
          atualizar(arq.name, { estado: "erro", erro: e instanceof Error ? e.message : String(e) });
        }
      }),
    );
    router.refresh();
    setTimeout(() => setEnvios((lista) => lista.filter((x) => x.estado === "erro")), 1500);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div data-tour="materiais-orientacao">
        <CartaoOrientacao trilhaId={trilhaId} inicial={orientacao} desabilitado={!podeGerar} onSalva={onOrientacao} />
      </div>

      {/* A área toda aceita arrastar e clicar; pelo teclado, o botão "Escolher arquivos" abre o mesmo seletor. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: atalho de mouse; o botão de dentro cobre o teclado */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: área de soltar arquivos */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          if (!somenteLeitura) enviarArquivos(Array.from(e.dataTransfer.files));
        }}
        onClick={() => !somenteLeitura && input.current?.click()}
        data-tour="materiais-upload"
        className={cn(
          "mt-6 rounded-card border-2 border-dashed p-10 text-center transition",
          somenteLeitura ? "cursor-default" : "cursor-pointer",
          arrastando ? "border-marca-500 bg-marca-50" : "border-marca-200 bg-superficie hover:border-marca-400 hover:bg-marca-50/50",
        )}
      >
        <div className="gradiente-marca mx-auto grid size-14 place-items-center rounded-2xl text-white shadow-flutuante">
          <UploadCloud className="size-7" />
        </div>
        <div className="mt-4 font-bold">Arraste os arquivos aqui ou clique para escolher</div>
        <div className="mt-1 text-xs text-suave">PDF, DOCX, TXT ou MD · vários de uma vez · até 40 MB cada</div>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => {
            const arquivos = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (arquivos.length) enviarArquivos(arquivos);
          }}
        />
      </div>

      <div className="mt-6 space-y-2.5">
        {envios.map((e) => (
          <Cartao key={e.nome} className="flex items-center gap-3 px-4 py-3">
            <TileIcone tom={e.estado === "erro" ? "vermelho" : "lilas"} tamanho="sm">
              {e.estado === "erro" ? <AlertTriangle /> : <Loader2 className="animate-spin" />}
            </TileIcone>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{e.nome}</div>
              <div className={cn("text-xs", e.estado === "erro" ? "text-vermelho" : "text-suave")}>
                {e.estado === "enviando"
                  ? "Enviando…"
                  : e.estado === "processando"
                    ? "Lendo e indexando o conteúdo…"
                    : e.estado === "pronto"
                      ? "Pronto"
                      : e.erro}
              </div>
            </div>
          </Cartao>
        ))}
        {materiais.map((m) => (
          <Cartao key={m.id} className="group flex items-center gap-3 px-4 py-3">
            <TileIcone tom={m.status === "erro" ? "vermelho" : m.status === "pronto" ? "azul" : "lilas"} tamanho="sm">
              {m.status === "pronto" ? <FileText /> : m.status === "erro" ? <AlertTriangle /> : <Loader2 className="animate-spin" />}
            </TileIcone>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{m.nome}</div>
              <div className={cn("text-xs", m.status === "erro" ? "text-vermelho" : "text-suave")}>
                {m.status === "pronto" ? `${m.paginas} página(s) · ${tamanho(m.tamanho_bytes)}` : m.status === "erro" ? m.erro : "Processando…"}
              </div>
            </div>
            {m.status === "pronto" && <CheckCircle2 className="size-5 text-verde" />}
            <button
              type="button"
              hidden={somenteLeitura}
              onClick={() => iniciar(() => excluirMaterial(trilhaId, m.id))}
              className="grid size-8 place-items-center rounded-lg text-suave opacity-0 transition hover:bg-vermelho-bg hover:text-vermelho group-hover:opacity-100"
              title="Remover"
            >
              <Trash2 className="size-4" />
            </button>
          </Cartao>
        ))}
      </div>
    </div>
  );
}

/**
 * Rodapé do passo Materiais, no mesmo lugar da barra de ações das etapas: fixo fora da rolagem, com o
 * resumo dos materiais (ou o motivo do bloqueio) à esquerda e o botão de gerar a visão geral à direita.
 */
export function BarraMateriais({
  materiais,
  orientacao,
  jaTemVisao,
  podeGerar,
  onGerar,
  onContinuar,
}: {
  materiais: Row<"materiais">[];
  orientacao: Orientacao;
  jaTemVisao: boolean;
  podeGerar: boolean;
  /** Gera a visão geral (e conclui o passo Materiais). */
  onGerar: () => void;
  /** Visão geral já gerada: segue para ela sem gerar de novo. */
  onContinuar: () => void;
}) {
  const prontos = materiais.filter((m) => m.status === "pronto");
  const paginas = prontos.reduce((t, m) => t + (m.paginas ?? 0), 0);
  const motivo =
    prontos.length === 0
      ? "Envie ao menos um material para gerar a visão geral."
      : !objetivoDefinido(orientacao.objetivo)
        ? 'Defina o objetivo da trilha em "Editar trilha" para gerar a visão geral.'
        : null;
  return (
    <div className="flex items-center gap-3 border-t border-linha bg-superficie px-8 py-3" data-tour="estudio-rodape">
      <div className="min-w-0 flex-1 text-sm">
        {motivo ? (
          <span className="text-suave">{motivo}</span>
        ) : (
          <>
            <span className="font-semibold text-verde">
              {prontos.length} material(is) pronto(s) · {paginas} páginas
            </span>
            <span className="text-suave">
              {jaTemVisao
                ? " · mudou os materiais ou a orientação? Gere a visão geral de novo para aplicar."
                : " · o Edu propõe o objetivo geral, o público e as competências para você aprovar."}
            </span>
          </>
        )}
      </div>
      {jaTemVisao && (
        <Botao variante="contorno" onClick={onGerar} disabled={!podeGerar || !!motivo} title="Substitui a visão geral atual">
          <RotateCcw className="size-4" /> Gerar visão geral de novo
        </Botao>
      )}
      <Botao onClick={jaTemVisao ? onContinuar : onGerar} disabled={!podeGerar || !!motivo}>
        Salvar e continuar <ArrowRight className="size-4" />
      </Botao>
    </div>
  );
}
