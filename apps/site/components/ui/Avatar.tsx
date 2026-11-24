import type { Personagem } from "@/lib/avatares";

const FUNDOS = {
  lilas: "#c7bdff",
  azul: "#b6e3f4",
  rosa: "#ffd5dc",
  pessego: "#ffdfbf",
  verde: "#d1f4d9",
  lavanda: "#e0d7ff",
} as const;

export type FundoAvatar = keyof typeof FUNDOS;

/** Avatar notionists num círculo pastel com anel branco, como na referência. */
export function Avatar({ quem, fundo = "lilas", className = "", anel = true }: { quem: Personagem; fundo?: FundoAvatar; className?: string; anel?: boolean }) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-full ${anel ? "ring-[5px] ring-white shadow-[0_14px_30px_-12px_rgb(29_26_58/0.35)]" : ""} ${className}`}
      style={{ background: FUNDOS[fundo] }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/avatares/${quem}`} alt="" draggable={false} className="absolute inset-0 size-full translate-y-[6%] scale-[1.08] object-cover" />
    </span>
  );
}
