"use client";

import { erroOrientacao, LIMITES_ORIENTACAO, normalizarOrientacao, type Orientacao } from "@edu/core";
import { Cartao, cn, TileIcone } from "@edu/ui";
import { Check, Compass, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useEstudio } from "./contexto";

const CAMPO =
  "mt-1.5 block w-full resize-y rounded-xl border bg-fundo px-3.5 py-2.5 text-sm leading-relaxed outline-none transition focus:border-marca-400 focus:bg-superficie disabled:opacity-60";

/**
 * Orientação do criador para o agente sobre o material: o recorte (em que focar, o que deixar de fora)
 * e o que acrescentar além dele. O objetivo da trilha é definido na criação e em "Editar trilha".
 * Salva sozinha ao sair de cada campo.
 */
export function CartaoOrientacao({
  trilhaId,
  inicial,
  desabilitado,
  onSalva,
}: {
  trilhaId: string;
  inicial: Orientacao;
  desabilitado?: boolean;
  onSalva: (o: Orientacao) => void;
}) {
  const { salvarOrientacao } = useEstudio().acoes;
  const [texto, setTexto] = useState(inicial);
  const [salva, setSalva] = useState(inicial);
  const [estado, setEstado] = useState<"ocioso" | "salvo" | "erro">("ocioso");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const salvar = () => {
    const o = normalizarOrientacao({ conteudos: texto.conteudos, complementos: texto.complementos });
    if (o.conteudos === salva.conteudos && o.complementos === salva.complementos) return;
    const invalida = erroOrientacao(o);
    if (invalida) {
      setErro(invalida);
      setEstado("erro");
      return;
    }
    iniciar(async () => {
      const r = await salvarOrientacao(trilhaId, { conteudos: o.conteudos, complementos: o.complementos });
      if ("erro" in r) {
        setErro(r.erro);
        setEstado("erro");
        return;
      }
      setErro(null);
      setSalva(o);
      setEstado("salvo");
      onSalva(o);
    });
  };

  return (
    <Cartao className="p-5 text-left">
      <div className="flex items-center gap-3">
        <TileIcone tom="lilas" tamanho="sm">
          <Compass />
        </TileIcone>
        <div className="min-w-0 flex-1">
          <div className="font-bold">Materiais da Trilha - Base de Conhecimento</div>
          <div className="text-xs text-suave">O Edu segue esta orientação para definir os Módulos, Cards de Conhecimento e as aulas.</div>
        </div>
        <div className="text-xs text-suave" aria-live="polite">
          {salvando ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3.5 animate-spin" /> Salvando…
            </span>
          ) : estado === "salvo" ? (
            <span className="inline-flex items-center gap-1 text-verde">
              <Check className="size-3.5" /> Salvo
            </span>
          ) : null}
        </div>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">
          Conteúdos a considerar <span className="font-normal text-suave">(opcional)</span>
        </span>
        <span className="mt-0.5 block text-xs text-suave">
          Pode enviar o material completo: aqui você diz em que parte o Edu deve focar e o que deixar de fora.
        </span>
        <textarea
          rows={3}
          value={texto.conteudos}
          maxLength={LIMITES_ORIENTACAO.conteudosMax}
          disabled={desabilitado}
          onChange={(e) => setTexto((t) => ({ ...t, conteudos: e.target.value }))}
          onBlur={salvar}
          placeholder="Ex.: Foque nos capítulos 3 a 5 da apostila (Lei de Ohm, potência e circuitos). Deixe de fora a parte de motores e o anexo de exercícios."
          className={cn(CAMPO, "border-linha")}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">
          Conteúdos para complementar <span className="font-normal text-suave">(opcional)</span>
        </span>
        <span className="mt-0.5 block text-xs text-suave">
          Se você sentir falta de algum material, informe aqui o conteúdo que o Edu também deve considerar.
        </span>
        <textarea
          rows={3}
          value={texto.complementos}
          maxLength={LIMITES_ORIENTACAO.complementosMax}
          disabled={desabilitado}
          onChange={(e) => setTexto((t) => ({ ...t, complementos: e.target.value }))}
          onBlur={salvar}
          placeholder="Ex.: Não tenho material de machine learning, mas é importante incluir uma introdução aos conceitos básicos (treino, teste e overfitting)."
          className={cn(CAMPO, "border-linha")}
        />
      </label>

      {estado === "erro" && erro && <div className="mt-3 text-xs font-semibold text-vermelho">{erro}</div>}
    </Cartao>
  );
}
