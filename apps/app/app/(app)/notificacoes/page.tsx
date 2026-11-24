import { listarNotificacoes, marcarNotificacoesLidas } from "@edu/db";
import { Cartao, cn } from "@edu/ui";
import { Bell, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { exigirAluno } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function NotificacoesPage() {
  const aluno = await exigirAluno();
  const { lista } = await listarNotificacoes(aluno.id, 30);
  await marcarNotificacoesLidas(aluno.id);
  return (
    <main className="px-5 pt-7">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-suave">
        <ChevronLeft className="size-4" /> Início
      </Link>
      <h1 className="mt-3 text-[22px] font-extrabold tracking-tight">Notificações</h1>
      {lista.length === 0 ? (
        <Cartao className="mt-6 p-8 text-center">
          <Bell className="mx-auto size-10 text-marca-300" />
          <div className="mt-3 font-bold">Nada por aqui ainda</div>
          <p className="mt-1 text-sm text-suave">Avisamos quando uma trilha nova for liberada ou você ganhar uma conquista.</p>
        </Cartao>
      ) : (
        <Cartao className="mt-5 divide-y divide-linha overflow-hidden">
          {lista.map((n) => {
            const conteudo = (
              <div key={n.id} className={cn("flex gap-3 px-4 py-3.5", !n.lida_em && "bg-marca-50/60")}>
                {!n.lida_em && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-marca-500" />}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{n.titulo}</div>
                  {n.corpo && <div className="text-xs text-suave">{n.corpo}</div>}
                  <div className="mt-1 text-[10px] text-suave">
                    {new Date(n.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}
                  </div>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block">
                {conteudo}
              </Link>
            ) : (
              <div key={n.id}>{conteudo}</div>
            );
          })}
        </Cartao>
      )}
    </main>
  );
}
