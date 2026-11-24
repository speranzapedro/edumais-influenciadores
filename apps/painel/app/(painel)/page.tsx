import { formatarCentavos } from "@edu/core";
import { painelVendas, trilhasDoCriador } from "@edu/db";
import { Cartao, classesBotao, GraficoArea, Pill, TileIcone } from "@edu/ui";
import { BadgeDollarSign, Check, Map as IconeMapa, Megaphone, Rocket, Sparkles, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { Topo } from "@/components/Topo";
import { exigirCriador } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const e = await exigirCriador();
  const [trilhas, vendas] = await Promise.all([trilhasDoCriador(e), painelVendas(e, 30)]);
  const publicadas = trilhas.filter((t) => t.status === "publicada").length;
  const passos = [
    { feito: !!e.perfil.bio, titulo: "Monte seu perfil público", href: "/perfil", icone: <UserRound /> },
    { feito: trilhas.length > 0, titulo: "Crie a primeira trilha com o Edu", href: "/trilhas/nova", icone: <Sparkles /> },
    { feito: publicadas > 0, titulo: "Publique a trilha", href: "/trilhas", icone: <IconeMapa /> },
    { feito: e.produto.status === "publicado", titulo: "Abra sua página para os alunos", href: "/perfil#produto", icone: <Rocket /> },
    { feito: vendas.cortesias + vendas.ativas > 0, titulo: "Divulgue seu link", href: "/divulgar", icone: <Megaphone /> },
  ];
  const pendentes = passos.filter((p) => !p.feito).length;
  const primeiroNome = e.perfil.nome_publico.split(" ")[0];

  return (
    <>
      <Topo titulo={`Olá, ${primeiroNome}!`} subtitulo={`${e.produto.nome} · @${e.perfil.handle}`} />
      <div className="space-y-6 px-8 pb-10 pt-4">
        {pendentes > 0 && (
          <Cartao className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">Primeiros passos</h2>
              <Pill tom="lilas">
                {passos.length - pendentes}/{passos.length}
              </Pill>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {passos.map((p) => (
                <Link
                  key={p.titulo}
                  href={p.href}
                  className={`flex items-center gap-3 rounded-2xl border p-4 transition ${p.feito ? "border-verde/30 bg-verde-bg/50" : "border-linha hover:border-marca-200 hover:bg-marca-50/50"}`}
                >
                  <TileIcone tom={p.feito ? "verde" : "lilas"} tamanho="sm">
                    {p.feito ? <Check /> : p.icone}
                  </TileIcone>
                  <span className={`text-sm font-semibold ${p.feito ? "text-[#11733f] line-through decoration-1" : ""}`}>{p.titulo}</span>
                </Link>
              ))}
            </div>
          </Cartao>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              rotulo: "Assinantes",
              valor: String(vendas.ativas + vendas.cortesias),
              icone: <Users />,
              tom: "lilas" as const,
              extra: `${vendas.cortesias} cortesia(s) no lançamento`,
            },
            { rotulo: "Novos em 30 dias", valor: String(vendas.novasNoPeriodo), icone: <Rocket />, tom: "azul" as const, extra: "entradas pelo seu link" },
            {
              rotulo: "Sua parte por mês",
              valor: formatarCentavos(vendas.parteCriador),
              icone: <BadgeDollarSign />,
              tom: "verde" as const,
              extra: "70% das assinaturas pagas",
            },
            {
              rotulo: "Ativos na semana",
              valor: String(vendas.alunosAtivos7d),
              icone: <Check />,
              tom: "laranja" as const,
              extra: "concluíram ao menos uma aula",
            },
          ].map((k) => (
            <Cartao key={k.rotulo} className="flex items-center gap-4 p-5">
              <TileIcone tom={k.tom}>{k.icone}</TileIcone>
              <div className="min-w-0">
                <div className="truncate text-2xl font-extrabold">{k.valor}</div>
                <div className="text-xs text-suave">
                  {k.rotulo} · {k.extra}
                </div>
              </div>
            </Cartao>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Cartao className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">Novos assinantes nos últimos 30 dias</h2>
              <Link href="/vendas" className={classesBotao("contorno", "sm")}>
                Ver vendas
              </Link>
            </div>
            <GraficoArea className="mt-4" dados={vendas.serie.map((d) => ({ rotulo: `${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}`, valor: d.novas }))} />
          </Cartao>
          <Cartao className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">Suas trilhas</h2>
              <Link href="/trilhas/nova" className={classesBotao("contorno", "sm")}>
                <Sparkles className="size-3.5" /> Nova trilha
              </Link>
            </div>
            {trilhas.length === 0 ? (
              <p className="mt-2 text-sm text-suave">Nenhuma trilha ainda. Envie seus roteiros, posts ou e-books e o Edu monta a primeira com você.</p>
            ) : (
              <ul className="mt-3 divide-y divide-linha">
                {trilhas.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <Link href={`/trilhas/${t.id}`} className="flex items-center gap-3 py-2.5">
                      <TileIcone tom="lilas" tamanho="sm">
                        <IconeMapa />
                      </TileIcone>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{t.titulo}</div>
                        <div className="text-xs text-suave">
                          {t.status === "publicada" ? "Publicada" : "Rascunho"} · {t.totalAulas} aula(s)
                        </div>
                      </div>
                    </Link>
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
