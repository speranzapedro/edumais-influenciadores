import { criadoresDoFa } from "@edu/db";
import { Cartao } from "@edu/ui";
import { UsersRound } from "lucide-react";
import { CartaoCriador } from "@/components/CartaoCriador";
import { exigirAluno } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function CriadoresPage() {
  const aluno = await exigirAluno();
  const criadores = await criadoresDoFa(aluno.id);
  return (
    <main className="px-5 pt-7">
      <h1 className="text-[22px] font-extrabold tracking-tight">Criadores</h1>
      <p className="text-sm text-suave">Com quem você está aprendendo.</p>
      {criadores.length === 0 ? (
        <Cartao className="mt-6 p-8 text-center">
          <UsersRound className="mx-auto size-10 text-marca-300" />
          <div className="mt-3 font-bold">Nenhum criador ainda</div>
          <p className="mt-1 text-sm text-suave">Abra o link que o seu criador favorito divulgou. Com o mesmo login você aprende com vários criadores.</p>
        </Cartao>
      ) : (
        <div className="mt-5 space-y-3">
          {criadores.map((c) => (
            <CartaoCriador key={c.id} criador={c} />
          ))}
        </div>
      )}
    </main>
  );
}
