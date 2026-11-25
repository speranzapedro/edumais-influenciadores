import { criadoresDoFa } from "@edu/db";
import { Cartao, Marca } from "@edu/ui";
import { LogOut, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { CartaoCriador } from "@/components/CartaoCriador";
import { primeiroNome } from "@/lib/formato";
import { exigirAluno } from "@/lib/sessao";
import { sair } from "../login/actions";

export const dynamic = "force-dynamic";

/**
 * Entrada do app: cada criador tem o próprio app (/@criador). Com um criador só, vai direto para ele;
 * com vários, a pessoa escolhe.
 */
export default async function Escolher({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const [aluno, sp] = await Promise.all([exigirAluno(), searchParams]);
  const criadores = await criadoresDoFa(aluno.id);
  if (criadores.length === 1) redirect(`/@${criadores[0].handle}${sp.bemvindo ? "?bemvindo=1" : ""}`);
  return (
    <main className="px-5 pt-8">
      <Marca />
      <h1 className="mt-6 text-[22px] font-extrabold tracking-tight">Olá, {primeiroNome(aluno.nome)}!</h1>
      {criadores.length === 0 ? (
        <Cartao className="mt-6 p-8 text-center">
          <Sparkles className="mx-auto size-10 text-marca-300" />
          <div className="mt-3 font-bold">Você ainda não segue nenhum criador</div>
          <p className="mt-1 text-sm text-suave">Abra o link que o seu criador favorito divulgou nas redes.</p>
        </Cartao>
      ) : (
        <>
          <p className="text-sm text-suave">Com quem você quer estudar agora?</p>
          <div className="mt-5 space-y-3">
            {criadores.map((c) => (
              <CartaoCriador key={c.id} criador={c} />
            ))}
          </div>
        </>
      )}
      <form action={sair} className="mt-8 text-center">
        <button type="submit" className="inline-flex items-center gap-1.5 text-sm font-semibold text-suave hover:text-vermelho">
          <LogOut className="size-4" /> Sair
        </button>
      </form>
    </main>
  );
}
