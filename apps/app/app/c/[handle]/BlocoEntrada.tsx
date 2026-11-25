import type { Usuario } from "@edu/db";
import { Avatar, Cartao, classesBotao } from "@edu/ui";
import { Smartphone } from "lucide-react";
import Link from "next/link";
import { type Entrada, trocarConta } from "./actions";
import { BotaoComecar, FormContaDoCriador } from "./Formularios";

/** Assinar a página: já assina (ir ao início), logado (um clique) ou fã novo (criar a conta). */
export function BlocoEntrada({ aluno, jaAssina, entrada, proximo }: { aluno: Usuario | null; jaAssina: boolean; entrada: Entrada; proximo: string }) {
  if (jaAssina)
    return (
      <Cartao className="p-5 text-center">
        <p className="text-sm text-tinta-2">Você já tem acesso a este conteúdo.</p>
        <Link href="/" className={`${classesBotao("primario", "lg")} mt-3 w-full`}>
          Ir para o início
        </Link>
      </Cartao>
    );
  if (aluno)
    return (
      <Cartao className="p-5">
        <p className="mb-4 text-sm text-tinta-2">
          Você está entrando como <b>{aluno.nome}</b>
          <span className="text-suave"> ({aluno.email})</span>.
        </p>
        <BotaoComecar entrada={entrada} />
        <form action={trocarConta.bind(null, entrada)} className="mt-4 text-center text-sm text-suave">
          Não é você?{" "}
          <button type="submit" className="font-semibold text-marca-600 hover:underline">
            Sair e criar minha conta
          </button>
        </form>
      </Cartao>
    );
  return (
    <Cartao className="p-5">
      <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-tinta-2">
        <Smartphone className="size-4 text-marca-500" /> Crie sua conta e comece agora. É grátis durante o lançamento.
      </p>
      <FormContaDoCriador entrada={entrada} proximo={proximo} />
    </Cartao>
  );
}

/** Foto do criador (a enviada no painel) ou o avatar gerado. */
export function FotoCriador({ criador, tamanho }: { criador: { id: string; nome: string; foto_url: string | null }; tamanho: number }) {
  if (criador.foto_url)
    return (
      <img
        src={criador.foto_url}
        alt={criador.nome}
        width={tamanho}
        height={tamanho}
        className="rounded-full object-cover ring-4 ring-white/40"
        style={{ width: tamanho, height: tamanho }}
      />
    );
  return <Avatar nome={criador.nome} semente={criador.id} tamanho={tamanho} className="ring-4 ring-white/40" />;
}
