import { appDoCriador } from "@edu/db";
import { destinoSeguro, usuarioDaSessao } from "@edu/db/next";
import { Marca } from "@edu/ui";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FormLogin } from "@/app/login/FormLogin";
import { EstiloMarca } from "@/components/EstiloMarca";
import { FotoCriador } from "../BlocoEntrada";

export const dynamic = "force-dynamic";

/** Entrar no app de um criador, com a marca dele (o login é o mesmo do Edu+). */
export default async function EntrarNoCriador({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ next?: string }> }) {
  const [{ handle }, { next }] = await Promise.all([params, searchParams]);
  const app = await appDoCriador(handle);
  if (!app) notFound();
  const base = `/@${app.criador.handle}`;
  const destino = destinoSeguro(next, base);
  if (await usuarioDaSessao("app")) redirect(destino);
  const marca = app.produtos[0];
  return (
    <main className="mx-auto min-h-dvh max-w-[440px] bg-fundo pb-10">
      {marca && <EstiloMarca primaria={marca.cor_primaria} destaque={marca.cor_destaque} />}
      <div className="gradiente-marca rounded-b-[32px] px-5 pb-8 pt-10 text-center text-white">
        <div className="flex justify-center">
          <FotoCriador criador={{ id: app.criador.id, nome: app.criador.nome, foto_url: app.criador.foto_url }} tamanho={72} />
        </div>
        <h1 className="mt-3 text-2xl font-extrabold">Entrar</h1>
        <p className="mt-1 text-sm text-white/85">nos cursos de {app.criador.nome}</p>
      </div>
      <div className="px-5 pt-6">
        <FormLogin next={destino} />
        <p className="mt-6 text-center text-sm text-suave">
          Ainda não tem conta?{" "}
          <Link href={base} className="font-semibold text-marca-600">
            Comece pela página de {app.criador.nome}
          </Link>
        </p>
        <div className="mt-10 flex justify-center opacity-60">
          <Marca />
        </div>
      </div>
    </main>
  );
}
