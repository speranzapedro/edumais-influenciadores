"use client";

import { Aviso, Botao, Campo, useFormulario } from "@edu/ui";
import Link from "next/link";
import { pedirLink } from "./actions";

export function FormEsqueci({ erroLink }: { erroLink: boolean }) {
  const { estado, pendente, form } = useFormulario(pedirLink, null);
  return (
    <form {...form} className="space-y-4">
      {erroLink && !estado && <Aviso>O link expirou ou já foi usado. Peça um novo abaixo.</Aviso>}
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="username" required autoFocus />
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tom="verde">{estado.ok}</Aviso>}
      <Botao tamanho="lg" className="w-full" disabled={pendente}>
        {pendente ? "Enviando…" : "Enviar link"}
      </Botao>
      <p className="text-center text-sm text-suave">
        Lembrou?{" "}
        <Link href="/login" className="font-semibold text-marca-600">
          Entrar
        </Link>
      </p>
    </form>
  );
}
