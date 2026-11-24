import { Notificacoes } from "./Notificacoes";

export function Topo({ titulo, subtitulo, acoes }: { titulo: React.ReactNode; subtitulo?: React.ReactNode; acoes?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-8 pb-2 pt-7 print:hidden">
      <div className="min-w-0">
        <h1 className="text-[26px] font-extrabold tracking-tight">{titulo}</h1>
        {subtitulo && <p className="text-sm text-suave">{subtitulo}</p>}
      </div>
      <div className="flex items-center gap-3">
        {acoes}
        <Notificacoes />
      </div>
    </header>
  );
}
