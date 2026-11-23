"use client";

import { useEffect, useState } from "react";
import { Botao } from "./base";
import { Modal } from "./modal";

/**
 * Confirmação da plataforma no lugar do `window.confirm` (que alguns navegadores embutidos bloqueiam e
 * que destoa do visual). Uso: `if (!(await confirmar("Arquivar a turma?"))) return;`.
 * O componente <Confirmacoes /> fica montado uma vez no layout do painel.
 */
interface Pedido {
  mensagem: string;
  titulo: string;
  botao: string;
  perigo: boolean;
  responder: (ok: boolean) => void;
}

let ouvinte: ((p: Pedido) => void) | null = null;

export function confirmar(mensagem: string, opts: { titulo?: string; botao?: string; perigo?: boolean } = {}): Promise<boolean> {
  return new Promise((responder) => {
    if (!ouvinte) return responder(window.confirm(mensagem));
    ouvinte({ mensagem, titulo: opts.titulo ?? "Confirmar", botao: opts.botao ?? "Confirmar", perigo: opts.perigo ?? false, responder });
  });
}

export function Confirmacoes() {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  useEffect(() => {
    ouvinte = setPedido;
    return () => {
      ouvinte = null;
    };
  }, []);
  const fechar = (ok: boolean) => {
    pedido?.responder(ok);
    setPedido(null);
  };
  return (
    <Modal aberto={!!pedido} aoFechar={() => fechar(false)} titulo={pedido?.titulo ?? ""}>
      <p className="text-sm leading-relaxed text-tinta-2">{pedido?.mensagem}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Botao variante="fantasma" onClick={() => fechar(false)}>
          Cancelar
        </Botao>
        <Botao variante={pedido?.perigo ? "perigo" : "primario"} onClick={() => fechar(true)} autoFocus>
          {pedido?.botao}
        </Botao>
      </div>
    </Modal>
  );
}
