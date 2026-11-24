"use client";

import { useRolarPara } from "../motion/ScrollSuave";

type Variante = "primario" | "creme" | "escuro" | "whatsapp";
type Tamanho = "sm" | "md" | "lg";

const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-10 px-4 text-[12px] rounded-[12px] [--degrau:4px]",
  md: "h-12 px-6 text-[13px]",
  lg: "h-[58px] px-8 text-[14px] sm:min-w-[300px]",
};

const VARIANTES: Record<Variante, string> = { primario: "", creme: "chunky-creme", escuro: "chunky-escuro", whatsapp: "chunky-whatsapp" };

/** Botão 3D da referência: mono maiúsculo, degrau inferior que afunda ao clicar. */
export function BotaoChunky({
  children,
  href,
  variante = "primario",
  tamanho = "md",
  className = "",
  type = "button",
  onClick,
  disabled,
  externo = false,
}: {
  children: React.ReactNode;
  /** Âncora da página (rolagem suave) ou endereço de outra página. */
  href?: string;
  variante?: Variante;
  tamanho?: Tamanho;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  /** Abre o link em outra aba (WhatsApp, sites de fora). */
  externo?: boolean;
}) {
  const rolar = useRolarPara();
  const classes = `chunky ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className}`;

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        onClick={(e) => {
          if (!href.startsWith("#")) return;
          e.preventDefault();
          rolar(href);
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
