"use client";

import { Aviso, Botao } from "@edu/ui";
import { useState, useTransition } from "react";
import { alternarProduto } from "../actions";

/** Publica o produto (exige trilha publicada nele) ou tira do ar. */
export function BotaoPublicarProduto({ produtoId, publicado, paginaPublicada }: { produtoId: string; publicado: boolean; paginaPublicada: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tom: "verde" | "vermelho"; texto: string } | null>(null);
  const clicar = () =>
    iniciar(async () => {
      const r = await alternarProduto(produtoId, !publicado);
      if ("erro" in r) return setMsg({ tom: "vermelho", texto: r.erro });
      setMsg(
        publicado
          ? { tom: "verde", texto: "Produto fora do ar." }
          : {
              tom: "verde",
              texto: paginaPublicada
                ? "Produto publicado! Seus assinantes já veem as trilhas dele."
                : "Produto publicado! Abra sua página em Perfil para os fãs entrarem.",
            },
      );
    });
  return (
    <div className="flex flex-col items-end gap-2">
      <Botao variante={publicado ? "contorno" : "primario"} disabled={pendente} onClick={clicar}>
        {pendente ? "Salvando…" : publicado ? "Tirar do ar" : "Publicar produto"}
      </Botao>
      {msg && (
        <Aviso tom={msg.tom} className="max-w-sm">
          {msg.texto}
        </Aviso>
      )}
    </div>
  );
}
