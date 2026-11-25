import { type CriadorVitrine, listarNotificacoes, painelDoAluno, trilhasDoAluno, type Usuario } from "@edu/db";
import { Avatar, BarraProgresso, Cartao, Icone, Pill, TileIcone, tomDe } from "@edu/ui";
import { Bell, ChevronRight, Flame, Play, Sparkles, Star, Zap } from "lucide-react";
import Link from "next/link";
import { hrefTrilha } from "@/components/ListaTrilhas";
import { numero, primeiroNome, saudacao } from "@/lib/formato";

/** Início do fã no app de um criador: só as trilhas, o placar e os avisos daquele criador. */
export async function TelaInicio({ aluno, criador, base, bemvindo }: { aluno: Usuario; criador: CriadorVitrine; base: string; bemvindo?: boolean }) {
  const [trilhas, painel, notificacoes] = await Promise.all([
    trilhasDoAluno(aluno, { criadorId: criador.id }),
    painelDoAluno(aluno.id, criador.id),
    listarNotificacoes(aluno.id, 1, criador.id),
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
          <p className="text-sm text-suave">Bora aprender com {primeiroNome(criador.nome)}?</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`${base}/notificacoes`}
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
          <Link href={`${base}/perfil`}>
            <Avatar nome={aluno.nome} semente={aluno.id} tamanho={44} />
          </Link>
        </div>
      </header>

      {bemvindo && (
        <div className="mt-4 rounded-2xl bg-verde-bg px-4 py-3 text-sm font-semibold text-[#11733f]">🎉 Tudo pronto! Bora começar com {criador.nome}?</div>
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
          href={`${hrefTrilha(atual).replace(/\/trilha\/[^/]+$/, "")}/aula/${atual.proximaAula.id}`}
          className="gradiente-marca relative mt-5 block overflow-hidden rounded-[24px] p-5 text-white shadow-flutuante transition active:scale-[0.99]"
        >
          <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-16 size-32 rounded-full bg-white/10" />
          <div className="text-xs font-medium text-white/75">Continuar aprendendo · {atual.produto.nome}</div>
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
          <div className="mt-2 font-bold">{trilhas.length ? "Você concluiu todas as trilhas! 🎉" : "Sua primeira trilha está a caminho"}</div>
          <p className="mt-1 text-sm text-suave">Novas trilhas aparecem aqui assim que {primeiroNome(criador.nome)} publicar, e você recebe um aviso.</p>
        </Cartao>
      )}

      {/* Minhas trilhas */}
      {trilhas.length > 0 && (
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Minhas trilhas</h2>
            <Link href={`${base}/trilhas`} className="text-xs font-semibold text-marca-600">
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {trilhas.map((t) => (
              <Link key={t.id} href={hrefTrilha(t)}>
                <Cartao className="flex items-center gap-3 p-3.5 transition hover:border-marca-200">
                  <TileIcone tom={tomDe(t.cor)}>
                    <Icone nome={t.icone} />
                  </TileIcone>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{t.titulo}</div>
                    <div className="mt-0.5 truncate text-xs text-suave">
                      {t.produto.nome} · {t.concluidas}/{t.totalAulas} aulas
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
