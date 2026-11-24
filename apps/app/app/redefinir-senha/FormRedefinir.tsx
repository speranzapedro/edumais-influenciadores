"use client";

import { Aviso, Botao, CampoSenha, useFormulario } from "@edu/ui";
import { redefinir } from "./actions";

export function FormRedefinir() {
  const { estado, pendente, form } = useFormulario(redefinir, null);
  return (
    <form {...form} className="space-y-4">
      <CampoSenha
        rotulo="Nova senha"
        name="senha"
        autoComplete="new-password"
        minLength={8}
        ajuda="Mínimo de 8 caracteres, com letras e números."
        required
        autoFocus
      />
      <CampoSenha rotulo="Repita a senha" name="confirmacao" autoComplete="new-password" minLength={8} required />
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      <Botao tamanho="xl" className="w-full" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar nova senha"}
      </Botao>
    </form>
  );
}
