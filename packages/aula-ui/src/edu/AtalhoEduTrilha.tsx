"use client";

import { AnimatePresence } from "motion/react";
import { useCallback, useState } from "react";
import { AvatarEdu } from "./AvatarEdu";
import { PainelEdu } from "./PainelEdu";

/** Atalho do Edu na página da trilha: pílula "Tirar dúvida" com o avatar, acima da barra de navegação. */
export function AtalhoEduTrilha({ trilha }: { trilha: { id: string; titulo: string } }) {
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => setAberto(false), []);
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom),10px)+88px)] z-30 mx-auto flex max-w-[440px] justify-end px-4">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Tirar dúvida com o Edu"
          className="gradiente-marca pointer-events-auto inline-flex h-[60px] items-center gap-2.5 rounded-full pl-1 pr-[22px] text-[15px] font-extrabold text-white shadow-flutuante transition active:scale-[0.97]"
        >
          <AvatarEdu tamanho={52} ponto className="rounded-full border-[2.5px] border-white" />
          Tirar dúvida
        </button>
      </div>
      <AnimatePresence>{aberto && <PainelEdu trilha={trilha} aula={null} onFechar={fechar} />}</AnimatePresence>
    </>
  );
}
