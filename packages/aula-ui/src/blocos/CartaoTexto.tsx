import type { BlocoTexto } from "@edu/core";
import { Lightbulb } from "lucide-react";

export function CartaoTexto({ bloco }: { bloco: BlocoTexto }) {
  return (
    <div className="rounded-card border border-linha bg-superficie p-5 shadow-card">
      {bloco.titulo && <div className="mb-2 inline-flex rounded-full bg-marca-50 px-2.5 py-0.5 text-[11px] font-bold text-marca-700">{bloco.titulo}</div>}
      <p className="text-[16px] leading-relaxed text-tinta">{bloco.texto}</p>
      {bloco.dica && (
        <div className="mt-4 flex gap-2.5 rounded-2xl bg-ambar-bg px-3.5 py-3 text-sm leading-snug text-[#8a6100]">
          <Lightbulb className="mt-0.5 size-4 shrink-0" />
          <span>{bloco.dica}</span>
        </div>
      )}
    </div>
  );
}
