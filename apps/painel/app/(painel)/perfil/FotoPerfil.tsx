"use client";

import { EnvioImagem } from "@edu/ui";
import { useState, useTransition } from "react";
import { salvarFoto } from "@/app/(painel)/marca-actions";
import { useEnvioMarca } from "@/lib/envioMarca";

/** Foto do perfil: enviada e salva na hora (aparece na sua página e para os fãs). */
export function FotoPerfil({ url }: { url: string | null }) {
  const [atual, setAtual] = useState(url);
  const { enviando, enviar } = useEnvioMarca();
  const [salvando, iniciar] = useTransition();
  return (
    <EnvioImagem
      rotulo="Sua foto"
      ajuda="PNG, JPG ou WEBP, até 2 MB. Aparece na sua página."
      formato="redondo"
      url={atual}
      enviando={enviando || salvando}
      aoEscolher={async (arquivo) => {
        const r = await enviar(arquivo);
        if ("erro" in r) return r.erro;
        const s = await salvarFoto(r.caminho);
        if ("erro" in s) return s.erro;
        setAtual(r.url);
        return null;
      }}
      aoRemover={() =>
        iniciar(async () => {
          const s = await salvarFoto(null);
          if (!("erro" in s)) setAtual(null);
        })
      }
    />
  );
}
