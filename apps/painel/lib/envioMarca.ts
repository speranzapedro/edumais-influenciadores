"use client";

import { erroArquivoMarca } from "@edu/core";
import { useState } from "react";
import { confirmarEnvio, prepararEnvio } from "@/app/(painel)/marca-actions";

/**
 * Envio de imagem de marca em três passos: o servidor prepara a URL assinada, o navegador envia direto
 * ao Storage e o servidor confere o arquivo. Devolve o caminho e a URL pública, ou a mensagem de erro.
 */
export function useEnvioMarca() {
  const [enviando, setEnviando] = useState(false);
  async function enviar(arquivo: File): Promise<{ caminho: string; url: string } | { erro: string }> {
    const erro = erroArquivoMarca({ mime: arquivo.type, tamanho: arquivo.size });
    if (erro) return { erro };
    setEnviando(true);
    try {
      const p = await prepararEnvio(arquivo.type, arquivo.size);
      if ("erro" in p) return { erro: p.erro };
      const r = await fetch(p.dados.url, { method: "PUT", body: arquivo, headers: { "Content-Type": arquivo.type } });
      if (!r.ok) return { erro: "Não deu para enviar a imagem. Tente de novo." };
      const c = await confirmarEnvio(p.dados.caminho);
      return "erro" in c ? { erro: c.erro } : c.dados;
    } finally {
      setEnviando(false);
    }
  }
  return { enviando, enviar };
}
