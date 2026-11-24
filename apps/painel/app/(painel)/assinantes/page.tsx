import { nomeDaOrigem } from "@edu/core";
import { assinantesDoCriador, type LinhaAssinante } from "@edu/db";
import { Avatar, Cartao, classesBotao, Pill } from "@edu/ui";
import { Megaphone } from "lucide-react";
import Link from "next/link";
import { Topo } from "@/components/Topo";
import { dataCurta, haQuanto } from "@/lib/formato";
import { exigirCriador } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const STATUS: Record<LinhaAssinante["status"], { rotulo: string; tom: "verde" | "ambar" | "rosa" | "neutro" }> = {
  ativa: { rotulo: "Paga", tom: "verde" },
  pendente: { rotulo: "Aguardando pagamento", tom: "neutro" },
  inadimplente: { rotulo: "Pagamento atrasado", tom: "rosa" },
  cortesia: { rotulo: "Cortesia", tom: "ambar" },
  cancelada: { rotulo: "Cancelada", tom: "rosa" },
  expirada: { rotulo: "Expirada", tom: "neutro" },
};

export default async function AssinantesPage() {
  const e = await exigirCriador();
  const lista = await assinantesDoCriador(e);
  return (
    <>
      <Topo titulo="Assinantes" subtitulo={`${lista.length} pessoa(s) assinaram ${e.produto.nome}.`} />
      <div className="px-8 pb-10 pt-4">
        <Cartao className="overflow-x-auto">
          {lista.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="max-w-md text-sm text-suave">Ninguém assinou ainda. Publique sua página e compartilhe o link nas suas redes.</p>
              <Link href="/divulgar" className={classesBotao("primario", "sm")}>
                <Megaphone className="size-3.5" /> Divulgar meu link
              </Link>
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-linha bg-fundo/60 text-left text-xs uppercase tracking-wide text-suave">
                <tr>
                  <th className="px-5 py-3 font-semibold">Assinante</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Origem</th>
                  <th className="px-5 py-3 font-semibold">Desde</th>
                  <th className="px-5 py-3 text-right font-semibold">Aulas concluídas</th>
                  <th className="px-5 py-3 text-right font-semibold">Último estudo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {lista.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar nome={a.nome} semente={a.id} tamanho={32} />
                        <span className="font-semibold">{a.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Pill tom={STATUS[a.status].tom}>{STATUS[a.status].rotulo}</Pill>
                    </td>
                    <td className="px-5 py-3 text-tinta-2">{nomeDaOrigem(a.origem)}</td>
                    <td className="px-5 py-3 text-tinta-2">{dataCurta(a.desde)}</td>
                    <td className="px-5 py-3 text-right font-semibold">{a.aulasConcluidas}</td>
                    <td className="px-5 py-3 text-right text-suave">{haQuanto(a.ultimaAula)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Cartao>
      </div>
    </>
  );
}
