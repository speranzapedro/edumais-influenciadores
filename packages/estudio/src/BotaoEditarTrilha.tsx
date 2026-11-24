"use client";

import { LIMITES_ORIENTACAO } from "@edu/core";
import { Aviso, Botao, Campo, CORES, ICONES_TRILHA, Icone, Modal, TileIcone } from "@edu/ui";
import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { useEstudio } from "./contexto";

export interface DadosTrilha {
  id: string;
  titulo: string;
  objetivo: string | null;
  descricao: string | null;
  cor: string;
  icone: string;
  publicada: boolean;
}

/** Botão do cabeçalho do estúdio + modal para editar o que foi definido na criação da trilha. */
export function BotaoEditarTrilha({ trilha, desabilitado }: { trilha: DadosTrilha; desabilitado?: boolean }) {
  const { editarDados } = useEstudio().acoes;
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const abrir = () => {
    setErro(null);
    setAberto(true);
  };

  const salvar = (form: FormData) => {
    setErro(null);
    iniciar(async () => {
      const r = await editarDados(trilha.id, {
        titulo: String(form.get("titulo") ?? ""),
        objetivo: String(form.get("objetivo") ?? ""),
        descricao: String(form.get("descricao") ?? ""),
        cor: String(form.get("cor") ?? trilha.cor),
        icone: String(form.get("icone") ?? trilha.icone),
      });
      if ("erro" in r) setErro(r.erro);
      else setAberto(false);
    });
  };

  return (
    <>
      <Botao variante="contorno" tamanho="sm" onClick={abrir} disabled={desabilitado} title="Editar título, objetivo, descrição, cor e ícone">
        <Pencil className="size-3.5" /> Editar trilha
      </Botao>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Editar trilha">
        <form action={salvar} className="space-y-4">
          <Campo rotulo="Título" name="titulo" defaultValue={trilha.titulo} required maxLength={120} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-tinta-2">
              Objetivo da trilha <span className="text-vermelho">*</span>
            </span>
            <textarea
              name="objetivo"
              rows={3}
              required
              minLength={LIMITES_ORIENTACAO.objetivoMin}
              maxLength={LIMITES_ORIENTACAO.objetivoMax}
              defaultValue={trilha.objetivo ?? ""}
              placeholder="O que seu fã deve saber ou conseguir fazer ao fim da trilha"
              className="w-full rounded-2xl border border-linha bg-superficie px-4 py-3 text-sm outline-none focus:border-marca-400 focus:ring-4 focus:ring-marca-100"
            />
            <span className="mt-1 block text-xs text-suave">Orienta o Edu. Mudou o objetivo? Gere a visão geral de novo para aplicar.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-tinta-2">Descrição curta</span>
            <textarea
              name="descricao"
              rows={2}
              maxLength={500}
              defaultValue={trilha.descricao ?? ""}
              placeholder="Para quem é e o que o fã vai aprender (aparece na sua página)"
              className="w-full rounded-2xl border border-linha bg-superficie px-4 py-3 text-sm outline-none focus:border-marca-400 focus:ring-4 focus:ring-marca-100"
            />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold">Cor</legend>
            <div className="mt-2 flex gap-2">
              {CORES.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="cor" value={c} defaultChecked={c === trilha.cor} className="peer sr-only" />
                  <TileIcone tom={c} tamanho="sm" className="ring-offset-2 peer-checked:ring-2 peer-checked:ring-marca-500">
                    <span className="size-3 rounded-full bg-current" />
                  </TileIcone>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold">Ícone</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ICONES_TRILHA.map((ic) => (
                <label key={ic} className="cursor-pointer">
                  <input type="radio" name="icone" value={ic} defaultChecked={ic === trilha.icone} className="peer sr-only" />
                  <TileIcone tom="neutro" className="text-tinta-2 peer-checked:bg-marca-600 peer-checked:text-white">
                    <Icone nome={ic} />
                  </TileIcone>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-suave">O recorte do material e os conteúdos para complementar ficam no passo Materiais.</p>
          {erro && <Aviso>{erro}</Aviso>}
          <div className="flex justify-end gap-2">
            <Botao type="button" variante="fantasma" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</Botao>
          </div>
        </form>
      </Modal>
    </>
  );
}
