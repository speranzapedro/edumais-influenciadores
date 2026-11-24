import { BotaoVoltar, Cartao, Marca, TermosAluno } from "@edu/ui";

export default function TermosPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[440px] bg-fundo px-5 pb-10 pt-10">
      <Marca />
      <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Termos de uso e privacidade</h1>
      <Cartao className="mt-5 p-5">
        <TermosAluno />
      </Cartao>
      <p className="mt-6 text-center text-sm">
        <BotaoVoltar padrao="/" className="font-semibold text-marca-600">
          Voltar
        </BotaoVoltar>
      </p>
    </main>
  );
}
