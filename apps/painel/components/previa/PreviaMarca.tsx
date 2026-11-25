import { AnelProgresso } from "@edu/ui";
import { Flame, Play, Trophy } from "lucide-react";

/**
 * Início do app do fã em miniatura, com as cores do produto. Tudo aqui usa os tokens da marca
 * (bg-marca-600, gradiente-marca, bg-destaque…), então o `style` com as variáveis do tema, aplicado
 * por quem usa, recolore a prévia inteira, como o app do fã fará.
 */
export function PreviaMarca({ nome, criador, logo }: { nome: string; criador: string; logo: string | null }) {
  return (
    <div className="min-h-full bg-fundo pb-8">
      <div className="gradiente-marca rounded-b-[28px] px-5 pb-6 pt-8 text-white">
        <div className="flex items-center gap-3">
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-lg font-extrabold text-marca-700">
            {logo ? <img src={logo} alt="" className="size-full object-contain p-1" /> : (nome.charAt(0) || "?").toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold leading-tight">{nome || "Nome do produto"}</div>
            <div className="truncate text-xs text-white/80">com {criador}</div>
          </div>
        </div>
        <div className="mt-5 flex gap-2 text-xs font-bold">
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
            <Flame className="size-3.5" /> 4 dias
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
            <Trophy className="size-3.5" /> 320 XP
          </span>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-5">
        <div className="rounded-3xl border border-linha bg-superficie p-4 shadow-flutuante">
          <div className="text-[11px] font-bold uppercase tracking-wider text-marca-600">Continue de onde parou</div>
          <div className="mt-3 flex items-center gap-4">
            <AnelProgresso valor={62} tamanho={64} espessura={8}>
              <span className="text-xs font-extrabold text-marca-700">62%</span>
            </AnelProgresso>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">Trilha 1 · Primeiros passos</div>
              <div className="text-xs text-suave">Aula 5 de 8</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-marca-600 text-sm font-semibold text-white">
              <Play className="size-4" /> Continuar
            </span>
            <span className="rounded-full bg-destaque px-3 py-1.5 text-xs font-extrabold text-destaque-contraste">+20 XP</span>
          </div>
        </div>

        {["Trilha 2 · Indo além", "Trilha 3 · Na prática"].map((t, i) => (
          <div key={t} className="flex items-center gap-3 rounded-2xl border border-linha bg-superficie p-3.5">
            <div className="grid size-10 place-items-center rounded-xl bg-marca-100 text-sm font-extrabold text-marca-700">{i + 2}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{t}</div>
              <div className="text-xs text-suave">{i === 0 ? "Liberada" : "Em breve"}</div>
            </div>
            {i === 0 && <span className="rounded-full bg-destaque-claro px-2 py-0.5 text-[11px] font-bold text-destaque-escuro">Nova</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
