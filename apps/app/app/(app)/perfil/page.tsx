import { criadoresDoFa, painelDoAluno } from "@edu/db";
import { Avatar, Cartao, Pill, TileIcone } from "@edu/ui";
import { ChevronRight, LogOut, Mail, UsersRound, Zap } from "lucide-react";
import { numero } from "@/lib/formato";
import { exigirAluno } from "@/lib/sessao";
import { sair } from "../../login/actions";
import { FormSenha } from "./Formularios";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const aluno = await exigirAluno();
  const [painel, criadores] = await Promise.all([painelDoAluno(aluno.id), criadoresDoFa(aluno.id)]);

  return (
    <main className="px-5 pt-7">
      <h1 className="text-center text-base font-bold">Perfil</h1>
      <div className="mt-6 flex flex-col items-center text-center">
        <Avatar nome={aluno.nome} semente={aluno.id} tamanho={104} className="ring-4" />
        <h2 className="mt-4 text-xl font-extrabold">{aluno.nome}</h2>
        <div className="mt-3 flex gap-2">
          <Pill tom="lilas">Nível {painel.nivel.nivel}</Pill>
          <Pill tom="ambar">
            <Zap className="size-3" /> {numero(painel.xpTotal)} XP
          </Pill>
        </div>
      </div>

      <Cartao className="mt-7 divide-y divide-linha">
        <Item icone={<Mail />} tom="azul" rotulo="E-mail de acesso" valor={aluno.email} />
        <Item icone={<UsersRound />} tom="lilas" rotulo="Criadores" valor={criadores.length ? criadores.map((c) => c.nome).join(", ") : "—"} />
      </Cartao>

      <h2 className="mb-2 mt-6 text-sm font-bold">Conta</h2>
      <Cartao className="divide-y divide-linha">
        <FormSenha />
      </Cartao>

      <form action={sair} className="mt-4">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-card border border-linha bg-superficie px-4 py-3.5 text-left shadow-card transition hover:bg-vermelho-bg"
        >
          <TileIcone tom="vermelho" tamanho="sm">
            <LogOut />
          </TileIcone>
          <span className="flex-1 text-sm font-semibold text-vermelho">Sair</span>
          <ChevronRight className="size-4 text-suave" />
        </button>
      </form>
    </main>
  );
}

function Item({ icone, rotulo, valor, tom }: { icone: React.ReactNode; rotulo: string; valor: string; tom: "azul" | "lilas" | "verde" | "laranja" | "rosa" }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <TileIcone tom={tom} tamanho="sm">
        {icone}
      </TileIcone>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium text-suave">{rotulo}</div>
        <div className="truncate text-sm font-semibold">{valor}</div>
      </div>
    </div>
  );
}
