import { BotaoVoltar, Cartao, Marca, TermosCriador } from "@edu/ui";

export const metadata = { title: "Termos de uso e privacidade · Edu+ Criador" };

/** Página pública: o cadastro do criador aponta para cá. */
export default function TermosPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl bg-fundo px-5 pb-12 pt-10">
      <Marca />
      <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Termos de uso e privacidade</h1>
      <p className="mt-1 text-sm text-suave">Edu+ Criador</p>
      <Cartao className="mt-5 p-6">
        <TermosCriador />
      </Cartao>
      <p className="mt-6 text-center text-sm">
        <BotaoVoltar padrao="/" className="font-semibold text-marca-600">
          Voltar
        </BotaoVoltar>
      </p>
    </main>
  );
}
