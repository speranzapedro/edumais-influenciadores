import { cn } from "@edu/ui";

/** Avatar do Edu (DiceBear notionists, o mesmo estilo dos avatares do app), com o ponto verde de "online". */
export function AvatarEdu({ tamanho = 40, ponto = false, className }: { tamanho?: number; ponto?: boolean; className?: string }) {
  const p = Math.max(10, Math.round(tamanho * 0.24));
  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: tamanho, height: tamanho }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/edu.svg" alt="" width={tamanho} height={tamanho} className="block size-full rounded-full bg-[#c7bdff]" />
      {ponto && <span className="absolute -bottom-px -right-px rounded-full border-2 border-white bg-verde" style={{ width: p, height: p }} />}
    </span>
  );
}
