import { formatarCentavos, nomeDaOrigem, PARTE_CRIADOR } from "@edu/core";
import { painelVendas } from "@edu/db";
import { Aviso, BarraProgresso, Cartao, GraficoArea, TileIcone } from "@edu/ui";
import { BadgeDollarSign, Gift, Rocket, UserCheck, UserX, Wallet } from "lucide-react";
import Link from "next/link";
import { Topo } from "@/components/Topo";
import { pct } from "@/lib/formato";
import { exigirCriador } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const PERIODOS = [7, 30, 90];

export default async function VendasPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const e = await exigirCriador();
  const sp = await searchParams;
  const dias = PERIODOS.includes(Number(sp.dias)) ? Number(sp.dias) : 30;
  const v = await painelVendas(e, dias);
  const comAcesso = v.ativas + v.cortesias;
  const totalOrigens = v.origens.reduce((s, o) => s + o.total, 0);

  return (
    <>
      <Topo
        titulo="Vendas"
        subtitulo={`Assinaturas da sua página · você fica com ${Math.round(PARTE_CRIADOR * 100)}% de cada venda`}
        acoes={
          <div className="flex rounded-xl border border-linha bg-superficie p-1 text-sm font-semibold">
            {PERIODOS.map((d) => (
              <Link
                key={d}
                href={`/vendas?dias=${d}`}
                className={`rounded-lg px-3 py-1.5 ${d === dias ? "bg-marca-50 text-marca-700" : "text-suave hover:text-tinta"}`}
              >
                {d} dias
              </Link>
            ))}
          </div>
        }
      />
      <div className="space-y-6 px-8 pb-10 pt-4">
        <Aviso tom="lilas">
          <b>Pagamentos em breve.</b> Durante o lançamento, quem entra pelo seu link ganha acesso de cortesia. Quando a cobrança começar, as assinaturas pagas e
          a sua parte aparecem aqui automaticamente.
        </Aviso>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            { rotulo: "Assinaturas pagas ativas", valor: String(v.ativas), icone: <UserCheck />, tom: "verde" as const },
            { rotulo: "Receita mensal (bruta)", valor: formatarCentavos(v.receitaMensal), icone: <Wallet />, tom: "azul" as const },
            {
              rotulo: `Sua parte (${Math.round(PARTE_CRIADOR * 100)}%)`,
              valor: formatarCentavos(v.parteCriador),
              icone: <BadgeDollarSign />,
              tom: "verde" as const,
            },
            { rotulo: `Novos assinantes (${dias} dias)`, valor: String(v.novasNoPeriodo), icone: <Rocket />, tom: "lilas" as const },
            { rotulo: "Acessos de cortesia", valor: String(v.cortesias), icone: <Gift />, tom: "ambar" as const },
            { rotulo: "Cancelados", valor: String(v.canceladas), icone: <UserX />, tom: "rosa" as const },
          ].map((k) => (
            <Cartao key={k.rotulo} className="flex items-center gap-4 p-5">
              <TileIcone tom={k.tom}>{k.icone}</TileIcone>
              <div className="min-w-0">
                <div className="truncate text-2xl font-extrabold">{k.valor}</div>
                <div className="text-xs text-suave">{k.rotulo}</div>
              </div>
            </Cartao>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <Cartao className="p-6">
            <h2 className="font-extrabold">Novos assinantes por dia</h2>
            <p className="text-sm text-suave">Entradas pelo seu link nos últimos {dias} dias.</p>
            <GraficoArea
              className="mt-4"
              rotulosX={dias > 30 ? 6 : 5}
              dados={v.serie.map((d) => ({ rotulo: `${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}`, valor: d.novas }))}
            />
          </Cartao>
          <Cartao className="p-6">
            <h2 className="font-extrabold">De onde vêm</h2>
            <p className="text-sm text-suave">
              Origem de quem assinou. Use os links de{" "}
              <Link href="/divulgar" className="font-semibold text-marca-700 hover:underline">
                Divulgar
              </Link>{" "}
              em cada rede.
            </p>
            {v.origens.length === 0 ? (
              <p className="mt-4 text-sm text-suave">Ainda sem assinantes.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {v.origens.map((o) => (
                  <li key={o.origem ?? "direto"}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold">{nomeDaOrigem(o.origem)}</span>
                      <span className="text-suave">
                        {o.total} · {pct(o.total, totalOrigens)}%
                      </span>
                    </div>
                    <BarraProgresso valor={pct(o.total, totalOrigens)} />
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
          <Cartao className="p-6">
            <h2 className="font-extrabold">Engajamento</h2>
            <p className="text-sm text-suave">Quem estuda volta e continua assinando.</p>
            <div className="mt-4 text-4xl font-extrabold">
              {v.alunosAtivos7d}
              <span className="text-base font-semibold text-suave"> / {comAcesso}</span>
            </div>
            <p className="text-sm text-suave">assinantes concluíram ao menos uma aula nos últimos 7 dias.</p>
          </Cartao>
          <Cartao className="p-6">
            <h2 className="font-extrabold">Conclusão por trilha</h2>
            <p className="text-sm text-suave">Quantos assinantes começaram e terminaram cada trilha publicada.</p>
            {v.conclusaoPorTrilha.length === 0 ? (
              <p className="mt-4 text-sm text-suave">Nenhuma trilha publicada ainda.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {v.conclusaoPorTrilha.map((t) => (
                  <li key={t.id}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="truncate font-semibold">{t.titulo}</span>
                      <span className="shrink-0 text-suave">
                        {t.comecaram} começaram · {t.concluiram} concluíram
                      </span>
                    </div>
                    <BarraProgresso valor={pct(t.concluiram, comAcesso)} />
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>
      </div>
    </>
  );
}
