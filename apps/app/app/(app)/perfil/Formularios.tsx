"use client";

import { Aviso, Botao, CampoSenha, cn } from "@edu/ui";
import { ChevronDown } from "lucide-react";
import { useActionState, useState } from "react";
import { alterarSenha } from "./actions";

function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  const [aberta, setAberta] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setAberta((v) => !v)} aria-expanded={aberta} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{titulo}</div>
          <div className="truncate text-[11px] text-suave">{descricao}</div>
        </div>
        <ChevronDown className={cn("size-4 text-suave transition", aberta && "rotate-180")} />
      </button>
      {aberta && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export function FormSenha() {
  const [estado, acao, pendente] = useActionState(alterarSenha, null);
  return (
    <Secao titulo="Trocar senha" descricao="Use letras e números, mínimo de 8 caracteres">
      <form action={acao} className="space-y-3">
        <CampoSenha rotulo="Senha atual" name="atual" autoComplete="current-password" required />
        <CampoSenha rotulo="Nova senha" name="nova" autoComplete="new-password" minLength={8} required />
        <CampoSenha rotulo="Repita a nova senha" name="confirmacao" autoComplete="new-password" minLength={8} required />
        {estado?.erro && <Aviso>{estado.erro}</Aviso>}
        {estado?.ok && <Aviso tom="verde">{estado.ok}</Aviso>}
        <Botao className="w-full" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar senha"}
        </Botao>
      </form>
    </Secao>
  );
}
