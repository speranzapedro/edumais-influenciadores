"use client";

import { cn } from "@edu/ui";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Notificacao = { id: string; titulo: string; corpo: string | null; link: string | null; lida_em: string | null; created_at: string };

const tempo = (iso: string) => {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} d`;
};

export function Notificacoes() {
  const [dados, setDados] = useState<{ lista: Notificacao[]; naoLidas: number }>({ lista: [], naoLidas: 0 });
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carregar = async () => {
      const r = await fetch("/api/notificacoes", { cache: "no-store" });
      if (r.ok) setDados(await r.json());
    };
    carregar();
    const t = setInterval(carregar, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const abrir = async () => {
    setAberto((v) => !v);
    if (!aberto && dados.naoLidas) {
      await fetch("/api/notificacoes", { method: "POST" });
      setDados((d) => ({ ...d, naoLidas: 0 }));
    }
  };

  return (
    <div className="relative" ref={caixa}>
      <button
        type="button"
        onClick={abrir}
        className="relative grid size-10 place-items-center rounded-xl border border-linha bg-superficie text-tinta-2"
        aria-label="Notificações"
      >
        <Bell className="size-[18px]" />
        {dados.naoLidas > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-vermelho ring-2 ring-superficie" />}
      </button>
      {aberto && (
        <div className="absolute right-0 top-12 z-40 w-80 overflow-hidden rounded-card border border-linha bg-superficie shadow-flutuante">
          <div className="border-b border-linha px-4 py-3 text-sm font-bold">Notificações</div>
          <div className="max-h-96 overflow-y-auto">
            {dados.lista.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-suave">Nada por aqui ainda.</p>
            ) : (
              dados.lista.map((n) => {
                const conteudo = (
                  <>
                    <div className="flex items-start gap-2">
                      {!n.lida_em && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-marca-500" />}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{n.titulo}</div>
                        {n.corpo && <div className="line-clamp-2 text-xs text-suave">{n.corpo}</div>}
                      </div>
                      <span className="shrink-0 text-[10px] text-suave">{tempo(n.created_at)}</span>
                    </div>
                  </>
                );
                const cls = cn("block border-b border-linha px-4 py-3 last:border-0", n.link && "hover:bg-fundo");
                return n.link ? (
                  <Link key={n.id} href={n.link} className={cls} onClick={() => setAberto(false)}>
                    {conteudo}
                  </Link>
                ) : (
                  <div key={n.id} className={cls}>
                    {conteudo}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
