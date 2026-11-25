"use client";

import { Aviso, Botao, confirmar } from "@edu/ui";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { apagarProduto } from "../../actions";

export function ExcluirProduto({ produtoId, nome, bloqueado }: { produtoId: string; nome: string; bloqueado: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const clicar = async () => {
    if (!(await confirmar(`Excluir “${nome}”? Isso não pode ser desfeito.`, { titulo: "Excluir produto", botao: "Excluir", perigo: true }))) return;
    iniciar(async () => {
      const r = await apagarProduto(produtoId);
      if (r && "erro" in r) setErro(r.erro);
    });
  };
  return (
    <div className="space-y-3">
      <Botao variante="perigo" disabled={bloqueado || pendente} onClick={clicar}>
        <Trash2 className="size-4" /> {pendente ? "Excluindo…" : "Excluir produto"}
      </Botao>
      {erro && <Aviso>{erro}</Aviso>}
    </div>
  );
}
