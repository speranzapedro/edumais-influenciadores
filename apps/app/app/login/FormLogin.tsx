"use client";

import { Aviso, Botao, Campo, CampoSenha, useFormulario } from "@edu/ui";
import Link from "next/link";
import { entrar } from "./actions";

export function FormLogin({ next }: { next?: string }) {
  const { estado, pendente, form } = useFormulario(entrar, null);
  return (
    <form {...form} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="username" required autoFocus />
      <CampoSenha rotulo="Senha" name="senha" autoComplete="current-password" required />
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      <Botao tamanho="xl" className="w-full" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </Botao>
      <div className="text-right text-sm">
        <Link href="/esqueci-senha" className="text-suave">
          Esqueci minha senha
        </Link>
      </div>
    </form>
  );
}
