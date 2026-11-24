import { criadoresDoFa, listarNotificacoes, painelDoAluno, trilhasDoAluno } from "@edu/db";
import { Avatar, BarraProgresso, Cartao, Icone, Pill, TileIcone, tomDe } from "@edu/ui";
import { Bell, ChevronRight, Flame, Play, Sparkles, Star, Zap } from "lucide-react";
import Link from "next/link";
import { CartaoCriador } from "@/components/CartaoCriador";
import { numero, primeiroNome, saudacao } from "@/lib/formato";
import { exigirAluno } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const { bemvindo } = await searchParams;
  const aluno = await exigirAluno();
  const [trilhas, painel, criadores, notificacoes] = await Promise.all([
    trilhasDoAluno(aluno),
    painelDoAluno(aluno.id),
    criadoresDoFa(aluno.id),
    listarNotificacoes(aluno.id, 1),
  ]);
  const atual = trilhas.find((t) => t.proximaAula) ?? null;
  const streak = painel.streak;

  return (
    <main className="px-5 pt-7">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">
            {saudacao()}, {primeiroNome(aluno.nome)} 👋
          </h1>
          <p className="text-sm text-suave">Bora continuar aprendendo?</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/notificacoes"
            className="relative grid size-11 place-items-center rounded-full bg-superficie text-tinta-2 shadow-card"
            aria-label="Notificações"
          >
            <Bell className="size-5" />
            {notificacoes.naoLidas > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-vermelho px-1 text-[10px] font-bold text-white ring-2 ring-fundo">
                {notificacoes.naoLidas}
              </span>
            )}
          </Link>
          <Link href="/perfil">
            <Avatar nome={aluno.nome} semente={aluno.id} tamanho={44} />
          </Link>
        </div>
      </header>

      {bemvindo && (
        <div className="mt-4 rounded-2xl bg-verde-bg px-4 py-3 text-sm font-semibold text-[#11733f]">
          🎉 Tudo pronto!
          {criadores.length ? ` Bora começar com ${criadores[criadores.length - 1]!.nome}?` : ""}
        </div>
      )}

      {/* Indicadores rápidos */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <Cartao className="flex items-center gap-2 px-3 py-2.5">
          <Flame className={streak.ativoHoje ? "size-5 fill-laranja text-laranja" : "size-5 text-laranja"} />
          <div>
            <div className="text-base font-extrabold leading-none">{streak.atual}</div>
            <div className="text-[10px] font-medium text-suave">{streak.atual === 1 ? "dia" : "dias"}</div>
          </div>
        </Cartao>
        <Cartao className="flex items-center gap-2 px-3 py-2.5">
          <Zap className="size-5 fill-marca-500 text-marca-500" />
          <div>
            <div className="text-base font-extrabold leading-none">{numero(painel.xpTotal)}</div>
            <div className="text-[10px] font-medium text-suave">XP total</div>
          </div>
        </Cartao>
        <Cartao className="flex items-center gap-2 px-3 py-2.5">
          <Star className="size-5 fill-ambar text-ambar" />
          <div>
            <div className="text-base font-extrabold leading-none">{painel.nivel.nivel}</div>
            <div className="text-[10px] font-medium text-suave">nível</div>
          </div>
        </Cartao>
      </div>

      {!streak.ativoHoje && streak.atual > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-laranja-bg px-4 py-2.5 text-[13px] font-semibold text-laranja">
          <Flame className="size-4" /> Faça uma aula hoje para manter sua ofensiva de {streak.atual} dias!
        </div>
      )}

      {/* Continuar aprendendo */}
      {atual?.proximaAula ? (
        <Link
          href={`/aula/${atual.proximaAula.id}`}
          className="gradiente-marca relative mt-5 block overflow-hidden rounded-[24px] p-5 text-white shadow-flutuante transition active:scale-[0.99]"
        >
          <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-16 size-32 rounded-full bg-white/10" />
          <div className="text-xs font-medium text-white/75">Continuar aprendendo{atual.criador ? ` · com ${primeiroNome(atual.criador.nome)}` : ""}</div>
          <div className="mt-3 text-lg font-bold leading-snug">{atual.titulo}</div>
          <div className="mt-0.5 line-clamp-1 text-sm text-white/85">
            Aula {atual.proximaAula.ordem} · {atual.proximaAula.titulo}
          </div>
          <div className="mt-5 flex items-end justify-between gap-6">
            <div className="flex-1">
              <BarraProgresso valor={atual.percentual} cor="bg-white" trilho="bg-white/25" />
              <div className="mt-2 text-xs text-white/80">{atual.percentual}% concluído</div>
            </div>
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-marca-700 shadow-lg">
              <Play className="ml-0.5 size-5 fill-current" />
            </span>
          </div>
        </Link>
      ) : (
        <Cartao className="mt-5 p-5 text-center">
          <Sparkles className="mx-auto size-8 text-marca-500" />
          <div className="mt-2 font-bold">
            {trilhas.length
              ? "Você concluiu todas as trilhas! 🎉"
              : criadores.length
                ? "Sua primeira trilha está a caminho"
                : "Você ainda não segue nenhum criador"}
          </div>
          <p className="mt-1 text-sm text-suave">
            {trilhas.length || criadores.length
              ? "Novas trilhas aparecem aqui assim que o criador publicar, e você recebe um aviso."
              : "Abra o link que o seu criador favorito divulgou nas redes."}
          </p>
        </Cartao>
      )}

      {/* Criadores que o fã assina */}
      {criadores.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 text-base font-bold">{criadores.length === 1 ? "Você aprende com" : "Seus criadores"}</h2>
          <div className="space-y-3">
            {criadores.map((c) => (
              <CartaoCriador key={c.id} criador={c} />
            ))}
          </div>
        </section>
      )}

      {/* Minhas trilhas */}
      {trilhas.length > 0 && (
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Minhas trilhas</h2>
            <Link href="/trilhas" className="text-xs font-semibold text-marca-600">
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {trilhas.map((t) => (
              <Link key={t.id} href={`/trilhas/${t.id}`}>
                <Cartao className="flex items-center gap-3 p-3.5 transition hover:border-marca-200">
                  <TileIcone tom={tomDe(t.cor)}>
                    <Icone nome={t.icone} />
                  </TileIcone>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{t.titulo}</div>
                    <div className="mt-0.5 truncate text-xs text-suave">
                      {t.criador ? `${primeiroNome(t.criador.nome)} · ` : ""}
                      {t.concluidas}/{t.totalAulas} aulas
                    </div>
                    <BarraProgresso valor={t.percentual} className="mt-2 h-1.5" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-bold text-marca-600">{t.percentual}%</span>
                    {t.percentual === 100 && <Pill tom="verde">Concluída</Pill>}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-suave" />
                </Cartao>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
