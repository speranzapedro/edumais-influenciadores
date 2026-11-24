"use client";

import { cn, Pill } from "@edu/ui";
import { AlertTriangle, Bot, Loader2, Power, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useEstudio } from "./contexto";

export interface EstadoTutor {
  status: "pendente" | "indexando" | "pronto" | "erro";
  trechos: number;
  indexado_em: string | null;
  erro: string | null;
}

function ha(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} d`;
}

/**
 * Estado do Edu (tutor de IA) desta trilha, só para a coordenação e com a flag TUTOR_HABILITADO:
 * o índice (atualizado sozinho ao publicar e ao enviar/excluir material; o botão força uma
 * atualização) e o liga/desliga do Edu para os fãs.
 */
export function SeloTutor({ trilhaId, publicada, ativo, tutor }: { trilhaId: string; publicada: boolean; ativo: boolean; tutor: EstadoTutor | null }) {
  const { alternarEdu, reindexarTutor } = useEstudio().acoes;
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const [ligado, setLigado] = useState(ativo);
  const [alternando, iniciarAlternar] = useTransition();
  const atualizando = pendente || tutor?.status === "indexando";

  useEffect(() => setLigado(ativo), [ativo]);

  // Enquanto indexa em segundo plano (após publicar/enviar material), atualiza a tela até terminar.
  useEffect(() => {
    if (tutor?.status !== "indexando") return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [tutor?.status, router]);

  if (!publicada && !tutor) return null;

  const reindexar = () =>
    iniciar(async () => {
      setAviso(null);
      try {
        const r = await reindexarTutor(trilhaId);
        if (r === "ignorada") setAviso("Publique a trilha para o Edu usar este conteúdo.");
        if (r === "na_fila") setAviso("Já está atualizando; o pedido entrou na fila.");
      } catch {
        setAviso("Não foi possível atualizar agora.");
      }
      router.refresh();
    });

  const alternar = () =>
    iniciarAlternar(async () => {
      const novo = !ligado;
      setLigado(novo);
      setAviso(null);
      try {
        await alternarEdu(trilhaId, novo);
      } catch {
        setLigado(!novo);
        setAviso("Não foi possível mudar agora.");
      }
      router.refresh();
    });

  const [tom, texto] = atualizando
    ? (["lilas", "Edu: atualizando…"] as const)
    : tutor?.status === "erro"
      ? (["vermelho", "Edu: falhou ao atualizar"] as const)
      : tutor?.status === "pronto" && tutor.indexado_em
        ? (["azul", `Edu: ${tutor.trechos} trechos · ${ha(tutor.indexado_em)}`] as const)
        : (["neutro", publicada ? "Edu: ainda não indexado" : "Edu: indexa ao publicar"] as const);

  return (
    <span className="inline-flex shrink-0 items-center gap-1" title={aviso ?? (tutor?.status === "erro" ? (tutor.erro ?? texto) : texto)}>
      <Pill tom={tom}>
        {atualizando ? (
          <Loader2 className="size-3 animate-spin" />
        ) : tutor?.status === "erro" ? (
          <AlertTriangle className="size-3" />
        ) : (
          <Bot className="size-3" />
        )}
        {/* Em tela estreita fica só o ícone (o texto vai no title) para não espremer o título da trilha. */}
        <span className="hidden lg:inline">{texto}</span>
      </Pill>
      {publicada && !atualizando && (
        <button
          type="button"
          onClick={reindexar}
          aria-label="Atualizar a base do Edu"
          title="Atualizar a base do Edu"
          className="grid size-6 place-items-center rounded-full text-suave hover:bg-fundo hover:text-marca-700"
        >
          <RotateCcw className="size-3.5" />
        </button>
      )}
      {publicada && (
        <button
          type="button"
          onClick={alternar}
          disabled={alternando}
          aria-pressed={ligado}
          aria-label={ligado ? "Edu ligado para os fãs (clique para desligar)" : "Edu desligado para os fãs (clique para ligar)"}
          title={ligado ? "Edu ligado para os fãs — clique para desligar" : "Edu desligado para os fãs — clique para ligar"}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-bold transition disabled:opacity-60",
            ligado ? "bg-verde-bg text-[#0f7a43]" : "bg-[#efeff4] text-suave",
          )}
        >
          <Power className="size-3" />
          <span className="hidden lg:inline">{ligado ? "Ligado" : "Desligado"}</span>
        </button>
      )}
      {aviso && <span className="hidden text-[11px] text-suave lg:inline">{aviso}</span>}
    </span>
  );
}
