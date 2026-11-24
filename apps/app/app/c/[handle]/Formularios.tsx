"use client";

import { Aviso, Botao, Campo, CampoSenha, LinkTermos, TermosAluno, useFormulario } from "@edu/ui";
import Link from "next/link";
import { useState, useTransition } from "react";
import { comecar, criarConta } from "./actions";

export function BotaoComecar({ handle, origem }: { handle: string; origem: string | null }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <>
      <Botao
        tamanho="xl"
        className="w-full"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await comecar(handle, origem);
            if (r?.erro) setErro(r.erro);
          })
        }
      >
        {pendente ? "Entrando…" : "Começar agora"}
      </Botao>
      {erro && <Aviso className="mt-3">{erro}</Aviso>}
    </>
  );
}

export function FormContaDoCriador({ handle, origem, proximo }: { handle: string; origem: string | null; proximo: string }) {
  const { estado, pendente, form } = useFormulario(criarConta.bind(null, handle, origem), null);
  return (
    <form {...form} className="space-y-4">
      <Campo rotulo="Seu nome completo" name="nome" autoComplete="name" required minLength={3} />
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" ajuda="É com ele que você entra no app." required />
      <CampoSenha
        rotulo="Crie uma senha"
        name="senha"
        autoComplete="new-password"
        minLength={8}
        ajuda="Mínimo de 8 caracteres, com letras e números."
        required
      />
      <CampoSenha rotulo="Repita a senha" name="confirmacao" autoComplete="new-password" minLength={8} required />
      <label className="flex items-start gap-2.5 text-sm text-tinta-2">
        <input type="checkbox" name="termos" required className="mt-0.5 size-4 accent-marca-600" />
        <span>
          Li e aceito os{" "}
          <LinkTermos rotulo="termos de uso e a política de privacidade">
            <TermosAluno />
          </LinkTermos>{" "}
          do Edu+.
        </span>
      </label>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      <Botao tamanho="xl" className="w-full" disabled={pendente}>
        {pendente ? "Criando sua conta…" : "Criar conta e começar"}
      </Botao>
      <p className="text-center text-sm text-suave">
        Já tem conta no Edu+?{" "}
        <Link href={`/login?next=${encodeURIComponent(proximo)}`} className="font-semibold text-marca-600">
          Entre com ela
        </Link>
      </p>
    </form>
  );
}
