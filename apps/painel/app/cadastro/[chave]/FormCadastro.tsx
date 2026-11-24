"use client";

import { Aviso, Botao, Campo, CampoSenha, LinkTermos, TermosCriador, useFormulario } from "@edu/ui";
import Link from "next/link";
import { cadastrar } from "./actions";

export function FormCadastro({ chave }: { chave: string }) {
  const { estado, pendente, form } = useFormulario(cadastrar, null);
  return (
    <form {...form} className="space-y-4">
      <input type="hidden" name="chave" value={chave} />
      <Campo rotulo="Seu nome" name="nome" autoComplete="name" required autoFocus />
      <Campo rotulo="Seu @ nas redes" name="handle" placeholder="@seuperfil" ajuda="Vira o seu link na Edu+. Dá para trocar depois." />
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required />
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
            <TermosCriador />
          </LinkTermos>{" "}
          do Edu+ Criador.
        </span>
      </label>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      <Botao tamanho="lg" className="w-full" disabled={pendente}>
        {pendente ? "Criando sua conta…" : "Criar minha conta"}
      </Botao>
      <p className="text-center text-sm text-suave">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-marca-600">
          Entrar
        </Link>
      </p>
    </form>
  );
}
