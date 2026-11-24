import { destinoSeguro, usuarioDaSessao } from "@edu/db/next";
import { Marca } from "@edu/ui";
import { redirect } from "next/navigation";
import { FormLogin } from "./FormLogin";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await usuarioDaSessao("app")) redirect(destinoSeguro(next));
  return (
    <main className="mx-auto min-h-dvh max-w-[440px] bg-fundo px-5 pb-10 pt-10">
      <Marca />
      <h1 className="mt-8 text-[28px] font-extrabold leading-tight tracking-tight">
        Aprenda com quem
        <br />
        <span className="text-marca-600">você já acompanha.</span>
      </h1>
      <p className="mb-6 mt-2 text-sm text-suave">Entre com o e-mail e a senha que você criou na página do seu criador.</p>
      <FormLogin next={next} />
    </main>
  );
}
