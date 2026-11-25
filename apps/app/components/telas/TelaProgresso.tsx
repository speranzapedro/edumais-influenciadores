import { CONQUISTAS, progressoConquista, somarDias } from "@edu/core";
import { hojeLocal, painelDoAluno, trilhasDoAluno, type Usuario } from "@edu/db";
import { AnelProgresso, BarraProgresso, Cartao, cn, GraficoArea, HEX_TOM, Icone, Pill, TileIcone, tomDe } from "@edu/ui";
import { BookCheck, Flag, Flame, Medal } from "lucide-react";
import { numero } from "@/lib/formato";

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Progresso do fã num criador: XP, nível, ofensiva e conquistas contam só ali. */
export async function TelaProgresso({ aluno, criadorId }: { aluno: Usuario; criadorId: string }) {
  const [painel, trilhas] = await Promise.all([painelDoAluno(aluno.id, criadorId), trilhasDoAluno(aluno, { criadorId })]);
  const totalAulas = trilhas.reduce((s, t) => s + t.totalAulas, 0);
  const feitas = trilhas.reduce((s, t) => s + t.concluidas, 0);
  const geral = totalAulas ? Math.round((feitas / totalAulas) * 100) : 0;
  const desbloqueadas = new Set(painel.conquistas.map((c) => c.key));

  // Série de XP acumulado nos últimos 30 dias.
  let acumulado = painel.xpTotal - painel.xpPorDia.reduce((s, d) => s + d.xp, 0);
  const serie = painel.xpPorDia.map((d) => {
    acumulado += d.xp;
    const [, m, dd] = d.dia.split("-");
    return { rotulo: `${dd}/${m}`, valor: acumulado };
  });

  // Calendário do mês corrente.
  const hoje = hojeLocal();
  const [ano, mes] = hoje.split("-").map(Number);
  const primeiro = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const deslocamento = new Date(`${primeiro}T12:00:00Z`).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const ativos = new Set(painel.dias);
  const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${primeiro}T12:00:00Z`));

  return (
    <main className="px-5 pt-7">
      <h1 className="text-[22px] font-extrabold tracking-tight">Progresso</h1>
      <p className="text-sm text-suave">
        Nível {painel.nivel.nivel} · {numero(painel.xpTotal)} XP
      </p>

      {/* Progresso geral + gráfico */}
      <Cartao className="mt-5 p-5">
        <div className="flex items-center gap-5">
          <AnelProgresso valor={geral} tamanho={124} espessura={14}>
            <div>
              <div className="text-2xl font-extrabold">{geral}%</div>
              <div className="text-[10px] text-suave">das aulas</div>
            </div>
          </AnelProgresso>
          <div className="flex-1 space-y-3">
            <Linha icone={<BookCheck className="size-4" />} tom="lilas" rotulo="Aulas concluídas" valor={`${painel.stats.aulasConcluidas}`} />
            <Linha icone={<Flag className="size-4" />} tom="verde" rotulo="Trilhas concluídas" valor={`${painel.stats.trilhasConcluidas}`} />
            <Linha icone={<Medal className="size-4" />} tom="ambar" rotulo="Aulas gabaritadas" valor={`${painel.stats.aulasPerfeitas}`} />
          </div>
        </div>
        <div className="mt-5 border-t border-linha pt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-bold">Evolução de XP</span>
            <Pill tom="lilas">+{painel.xpSemana} XP na semana</Pill>
          </div>
          <GraficoArea dados={serie} altura={170} rotulosX={4} />
        </div>
        <div className="mt-2 rounded-xl bg-marca-50 px-3 py-2 text-xs text-marca-700">
          Nível {painel.nivel.nivel + 1} em {painel.nivel.xpParaProximo - painel.nivel.xpNoNivel} XP
          <BarraProgresso valor={(painel.nivel.xpNoNivel / painel.nivel.xpParaProximo) * 100} className="mt-1.5 h-1.5" />
        </div>
      </Cartao>

      {/* Streak + calendário */}
      <Cartao className="mt-4 p-5">
        <div className="flex items-center gap-4">
          <AnelProgresso valor={Math.min(100, (painel.streak.atual / 7) * 100)} tamanho={96} espessura={11} cor="#f59324" trilho="#fff0dd">
            <Flame className={cn("size-8 text-laranja", painel.streak.ativoHoje && "fill-laranja")} />
          </AnelProgresso>
          <div>
            <div className="text-3xl font-extrabold leading-none">
              {painel.streak.atual} <span className="text-base font-bold text-suave">{painel.streak.atual === 1 ? "dia" : "dias"}</span>
            </div>
            <div className="mt-1 text-sm text-suave">Recorde: {painel.streak.recorde} dias</div>
            <div className="mt-1 text-xs font-semibold text-laranja">
              {painel.streak.atual < 7
                ? `Faltam ${7 - painel.streak.atual} para o bônus de 7 dias (+50 XP)`
                : painel.streak.atual < 30
                  ? `Faltam ${30 - painel.streak.atual} para o bônus de 30 dias (+100 XP)`
                  : `Faltam ${Math.max(0, 180 - painel.streak.atual)} para o bônus de 180 dias (+250 XP)`}
            </div>
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 text-sm font-bold">{nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}</div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className="text-[10px] font-bold text-suave">
                {d}
              </div>
            ))}
            {Array.from({ length: deslocamento }, (_, i) => (
              <div key={`v${i}`} />
            ))}
            {Array.from({ length: diasNoMes }, (_, i) => {
              const dia = somarDias(primeiro, i);
              const ativo = ativos.has(dia);
              const eHoje = dia === hoje;
              return (
                <div
                  key={dia}
                  className={cn(
                    "mx-auto grid size-8 place-items-center rounded-full text-xs font-semibold",
                    ativo ? "gradiente-marca text-white" : "text-tinta-2",
                    eHoje && !ativo && "ring-2 ring-marca-300",
                    dia > hoje && "text-suave/50",
                  )}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </div>
      </Cartao>

      {/* Conquistas */}
      <Cartao className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Conquistas</h2>
          <span className="text-sm font-bold text-marca-600">
            {desbloqueadas.size}/{CONQUISTAS.length}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-x-2 gap-y-4">
          {CONQUISTAS.map((c) => {
            const on = desbloqueadas.has(c.key);
            const hex = HEX_TOM[tomDe(c.cor)];
            const p = progressoConquista(c, painel.stats);
            return (
              <div key={c.key} className="flex flex-col items-center text-center">
                <div
                  className={cn("grid size-14 place-items-center rounded-full border-4", on ? "text-white shadow-md" : "border-linha bg-fundo text-[#c3c2d4]")}
                  style={on ? { background: hex.forte, borderColor: hex.fundo } : undefined}
                >
                  <Icone nome={c.icone} className="size-6" />
                </div>
                <div className={cn("mt-1.5 text-[11px] font-bold leading-tight", !on && "text-suave")}>{c.titulo}</div>
                {!on && (
                  <div className="text-[10px] text-suave">
                    {p.atual}/{p.meta}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Cartao>

      {/* Trilhas */}
      <h2 className="mb-3 mt-6 font-bold">Por trilha</h2>
      <div className="space-y-3">
        {trilhas.map((t) => (
          <Cartao key={t.id} className="flex items-center gap-3 p-3.5">
            <TileIcone tom={tomDe(t.cor)} tamanho="sm">
              <Icone nome={t.icone} />
            </TileIcone>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{t.titulo}</div>
              <BarraProgresso valor={t.percentual} className="mt-1.5 h-1.5" />
            </div>
            <span className="text-sm font-bold text-marca-600">{t.percentual}%</span>
          </Cartao>
        ))}
      </div>
    </main>
  );
}

function Linha({ icone, rotulo, valor, tom }: { icone: React.ReactNode; rotulo: string; valor: string; tom: "lilas" | "verde" | "ambar" }) {
  return (
    <div className="flex items-center gap-2.5">
      <TileIcone tom={tom} tamanho="sm">
        {icone}
      </TileIcone>
      <div className="flex-1 text-xs text-suave">{rotulo}</div>
      <div className="text-sm font-extrabold">{valor}</div>
    </div>
  );
}
