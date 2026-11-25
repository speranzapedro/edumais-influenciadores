import { limparOrigem } from "@edu/core";
import { appDoCriador, faTemAcesso, urlDaMarca, vitrinePorHandle } from "@edu/db";
import { usuarioDaSessao } from "@edu/db/next";
import { Cartao, Marca } from "@edu/ui";
import { ChevronRight, Clock, Flame, Sparkles, Trophy } from "lucide-react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { corDoTema, EstiloMarca } from "@/components/EstiloMarca";
import { MarcaDoProduto } from "@/components/MarcaDoProduto";
import { ShellCriador } from "@/components/ShellCriador";
import { TelaInicio } from "@/components/telas/TelaInicio";
import { BlocoEntrada, FotoCriador } from "./BlocoEntrada";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const v = await vitrinePorHandle(handle);
  if (!v) return { title: "Edu+" };
  const unico = v.produtos.length === 1 ? v.produtos[0] : null;
  return {
    title: unico ? `${unico.nome} · ${v.criador.nome} · Edu+` : `${v.criador.nome} · Edu+`,
    description: unico?.descricao ?? v.criador.bio ?? `Aprenda com ${v.criador.nome} em microaulas gamificadas no Edu+.`,
  };
}

export async function generateViewport({ params }: Params): Promise<Viewport> {
  const { handle } = await params;
  const v = await vitrinePorHandle(handle);
  const p = v?.produtos[0];
  return { themeColor: corDoTema(p?.cor_primaria, p?.cor_destaque) };
}

/**
 * /@criador: para quem assina, o início do app do criador; para os outros, a página pública (o link
 * que ele divulga nas redes) com os produtos publicados e a entrada do fã.
 */
export default async function PaginaDoCriador({ params, searchParams }: Params & { searchParams: Promise<{ origem?: string; bemvindo?: string }> }) {
  const [{ handle }, sp] = await Promise.all([params, searchParams]);
  const v = await vitrinePorHandle(handle);
  if (!v) notFound();
  const origem = limparOrigem(sp.origem);
  const proximo = `/@${v.criador.handle}${origem ? `?origem=${origem}` : ""}`;
  const aluno = await usuarioDaSessao("app");
  const jaAssina = aluno ? await faTemAcesso(aluno.id, v.criador.id) : false;
  if (aluno && jaAssina) {
    // Assinante: os produtos publicados valem mesmo com a página fechada para novos fãs.
    const app = (await appDoCriador(handle))!;
    const base = `/@${app.criador.handle}`;
    return (
      <ShellCriador base={base} marca={app.produtos[0]}>
        <TelaInicio aluno={aluno} criador={app.criador} base={base} bemvindo={!!sp.bemvindo} />
      </ShellCriador>
    );
  }
  // A página usa a marca do primeiro produto (cada produto tem a sua na própria página).
  const marca = v.produtos[0];

  return (
    <main className="mx-auto min-h-dvh max-w-[440px] bg-fundo pb-10">
      {marca && <EstiloMarca primaria={marca.cor_primaria} destaque={marca.cor_destaque} />}
      <div className="gradiente-marca relative overflow-hidden rounded-b-[32px] px-5 pb-8 pt-8 text-white">
        <div className="pointer-events-none absolute -right-12 -top-10 size-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 left-10 size-36 rounded-full bg-white/10" />
        <div className="flex flex-col items-center text-center">
          <FotoCriador criador={{ id: v.criador.id, nome: v.criador.nome, foto_url: v.criador.foto_url }} tamanho={84} />
          <div className="mt-3 text-sm font-semibold text-white/80">@{v.criador.handle}</div>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">{v.criador.nome}</h1>
          {v.criador.bio && <p className="mt-2 text-sm text-white/85">{v.criador.bio}</p>}
        </div>
      </div>

      <div className="px-5">
        {!v.publicada ? (
          <Cartao className="mt-6 p-8 text-center">
            <Sparkles className="mx-auto size-10 text-marca-300" />
            <h2 className="mt-3 text-lg font-extrabold">Em breve</h2>
            <p className="mt-1 text-sm text-suave">{v.criador.nome} está preparando as trilhas. Volte em breve por este mesmo link.</p>
          </Cartao>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-3 gap-2.5 text-center">
              {[
                { i: <Clock className="size-5 text-marca-500" />, t: "Aulas de 5 min" },
                { i: <Flame className="size-5 text-laranja" />, t: "Ofensiva diária" },
                { i: <Trophy className="size-5 text-ambar" />, t: "XP e conquistas" },
              ].map((x) => (
                <Cartao key={x.t} className="flex flex-col items-center gap-1.5 px-2 py-3">
                  {x.i}
                  <span className="text-[11px] font-semibold text-tinta-2">{x.t}</span>
                </Cartao>
              ))}
            </div>

            <section className="mt-6">
              <h2 className="mb-3 text-base font-bold">{v.produtos.length === 1 ? "O curso" : `${v.produtos.length} cursos`}</h2>
              <div className="space-y-2.5">
                {v.produtos.map((p) => {
                  const aulas = p.trilhas.reduce((s, t) => s + t.totalAulas, 0);
                  return (
                    <Link key={p.id} href={`/@${v.criador.handle}/${p.slug}${origem ? `?origem=${origem}` : ""}`} className="block">
                      <Cartao className="flex items-center gap-3 p-3.5 transition hover:border-marca-200">
                        <MarcaDoProduto produto={p} logo={p.logo_path ? urlDaMarca(p.logo_path) : null} className="size-12 text-lg" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold">{p.nome}</div>
                          <div className="truncate text-xs text-suave">
                            {p.descricao ?? `${p.trilhas.length} ${p.trilhas.length === 1 ? "trilha" : "trilhas"} · ${aulas} aulas`}
                          </div>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-suave" />
                      </Cartao>
                    </Link>
                  );
                })}
              </div>
              {v.produtos.length > 1 && <p className="mt-2 text-center text-xs text-suave">Uma assinatura libera todos os cursos de {v.criador.nome}.</p>}
            </section>

            <div className="mt-6">
              <BlocoEntrada aluno={aluno} jaAssina={jaAssina} entrada={{ handle: v.criador.handle, origem }} proximo={proximo} />
            </div>
          </>
        )}
        <div className="mt-8 flex justify-center opacity-70">
          <Marca />
        </div>
      </div>
    </main>
  );
}
