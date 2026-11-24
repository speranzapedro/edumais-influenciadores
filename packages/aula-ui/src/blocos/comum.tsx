import { cn } from "@edu/ui";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

/** Moldura dos desafios: borda de destaque e tremida quando a resposta está errada. */
export function MolduraDesafio({ rotulo, errou, children }: { rotulo: string; errou?: boolean; children: ReactNode }) {
  return (
    <motion.div
      animate={errou ? { x: [0, -8, 8, -6, 6, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="rounded-card border-2 border-marca-100 bg-superficie p-5 shadow-card"
    >
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-marca-600">{rotulo}</div>
      {children}
    </motion.div>
  );
}

/** Explicação/feedback que aparece depois da correção. */
export function Explicacao({ visivel, correta, children }: { visivel: boolean; correta: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          // Alvo da rolagem automática do player: depois da correção, é a explicação que precisa aparecer.
          data-rolagem-alvo
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className={cn(
            "mt-4 overflow-hidden rounded-2xl px-4 py-3 text-sm leading-relaxed",
            correta ? "bg-verde-bg text-[#11733f]" : "bg-vermelho-bg text-[#a32020]",
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
