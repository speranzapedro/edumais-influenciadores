import { limparOrigem } from "@edu/core";
import { faTemAcesso, vitrinePorHandle } from "@edu/db";
import { usuarioDaSessao } from "@edu/db/next";
import { Avatar, Cartao, Icone, Marca, TileIcone, tomDe } from "@edu/ui";
import { Clock, Flame, Smartphone, Sparkles, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { trocarConta } from "./actions";
import { BotaoComecar, FormContaDoCriador } from "./Formularios";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const v = await vitrinePorHandle(handle);
  if (!v) return { title: "Edu+" };
  const unico = v.produtos.length === 1 ? v.produtos[0] : null;
  return {
    title: unico ? `${unico.nome} · ${v.criador.nome} · Edu+` : `${v.criador.nome} · Edu+`,
    description: unico?.descricao ?? `Aprenda com ${v.criador.nome} em microaulas gamificadas no Edu+.`,
  };
}

/** Página pública do criador: o link que ele divulga nas redes. O fã cria a conta e começa. */
export default async function PaginaDoCriador({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ origem?: string }> }) {
  const [{ handle }, sp] = await Promise.all([params, searchParams]);
  const v = await vitrinePorHandle(handle);
  if (!v) notFound();
  const origem = limparOrigem(sp.origem);
  const proximo = `/c/${v.criador.handle}${origem ? `?origem=${origem}` : ""}`;
  const aluno = await usuarioDaSessao("app");
  const jaAssina = aluno ? await faTemAcesso(aluno.id, v.criador.id) : false;
  // Até a vitrine nova (fase 5): com um produto, a página mostra o produto; com vários, o criador.
  const unico = v.produtos.length === 1 ? v.produtos[0] : null;
  const trilhas = v.produtos.flatMap((p) => p.trilhas);
  const totalAulas = trilhas.reduce((s, t) => s + t.totalAulas, 0);

  return (
    <main className="mx-auto min-h-dvh max-w-[440px] bg-fundo pb-10">
      <div className="gradiente-marca relative overflow-hidden rounded-b-[32px] px-5 pb-8 pt-8 text-white">
        <div className="pointer-events-none absolute -right-12 -top-10 size-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 left-10 size-36 rounded-full bg-white/10" />
        <div className="flex flex-col items-center text-center">
          <Avatar nome={v.criador.nome} semente={v.criador.id} tamanho={84} className="ring-4 ring-white/40" />
          <div className="mt-3 text-sm font-semibold text-white/80">@{v.criador.handle}</div>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">{unico?.nome ?? v.criador.nome}</h1>
          {unico && <p className="mt-1 text-sm text-white/85">com {v.criador.nome}</p>}
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
            {(unico?.descricao || v.criador.bio) && (
              <Cartao className="mt-6 space-y-2 p-5 text-sm leading-relaxed text-tinta-2">
                {unico?.descricao && <p className="font-semibold text-tinta">{unico.descricao}</p>}
                {v.criador.bio && <p>{v.criador.bio}</p>}
              </Cartao>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
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

            {trilhas.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-3 text-base font-bold">
                  {trilhas.length} {trilhas.length === 1 ? "trilha" : "trilhas"} · {totalAulas} aulas
                </h2>
                <div className="space-y-2.5">
                  {trilhas.map((t) => (
                    <Cartao key={t.id} className="flex items-center gap-3 p-3.5">
                      <TileIcone tom={tomDe(t.cor)}>
                        <Icone nome={t.icone} />
                      </TileIcone>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{t.titulo}</div>
                        <div className="truncate text-xs text-suave">{t.descricao ?? `${t.totalAulas} aulas`}</div>
                      </div>
                    </Cartao>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-6">
              {jaAssina ? (
                <Cartao className="p-5 text-center">
                  <p className="text-sm text-tinta-2">Você já tem acesso a este conteúdo.</p>
                  <Link href="/" className="mt-3 inline-block font-semibold text-marca-600">
                    Ir para o início
                  </Link>
                </Cartao>
              ) : aluno ? (
                <Cartao className="p-5">
                  <p className="mb-4 text-sm text-tinta-2">
                    Você está entrando como <b>{aluno.nome}</b>
                    <span className="text-suave"> ({aluno.email})</span>.
                  </p>
                  <BotaoComecar handle={v.criador.handle} origem={origem} />
                  <form action={trocarConta.bind(null, v.criador.handle, origem)} className="mt-4 text-center text-sm text-suave">
                    Não é você?{" "}
                    <button type="submit" className="font-semibold text-marca-600 hover:underline">
                      Sair e criar minha conta
                    </button>
                  </form>
                </Cartao>
              ) : (
                <Cartao className="p-5">
                  <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-tinta-2">
                    <Smartphone className="size-4 text-marca-500" /> Crie sua conta e comece agora. É grátis durante o lançamento.
                  </p>
                  <FormContaDoCriador handle={v.criador.handle} origem={origem} proximo={proximo} />
                </Cartao>
              )}
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
