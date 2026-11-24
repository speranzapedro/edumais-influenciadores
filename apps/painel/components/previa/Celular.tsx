import { cn } from "@edu/ui";

/**
 * Moldura de celular para as prévias do app do aluno. O `transform` faz da moldura o bloco de
 * contenção dos elementos `fixed` do app (rodapé do player, bolinha do Edu): eles ficam presos à
 * tela do celular, e não à janela do painel.
 */
export function Celular({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto h-[min(820px,calc(100dvh-150px))] min-h-[560px] w-[390px] shrink-0 overflow-hidden rounded-[46px] border-[10px] border-[#1d1b2e] bg-fundo shadow-flutuante",
        className,
      )}
      style={{ transform: "translateZ(0)" }}
    >
      <div className="rolagem-fina h-full overflow-y-auto overscroll-contain">{children}</div>
    </div>
  );
}
