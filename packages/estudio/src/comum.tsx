"use client";

import { cn } from "@edu/ui";
import { MessageSquarePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Texto que vira campo de edição ao clicar (edição manual do criador). */
export function Editavel({
  valor,
  onSalvar,
  className,
  multilinha = false,
  desabilitado = false,
  placeholder,
}: {
  valor: string;
  onSalvar: (novo: string) => void;
  className?: string;
  multilinha?: boolean;
  desabilitado?: boolean;
  placeholder?: string;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(valor);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setTexto(valor), [valor]);
  useEffect(() => {
    if (editando && ref.current) {
      ref.current.focus();
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [editando]);

  if (!editando) {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: vira botão (role e foco) só quando é editável
      <span
        data-editavel
        role={desabilitado ? undefined : "button"}
        tabIndex={desabilitado ? undefined : 0}
        onClick={() => !desabilitado && setEditando(true)}
        onKeyDown={(e) => {
          if (desabilitado || (e.key !== "Enter" && e.key !== " ")) return;
          e.preventDefault();
          setEditando(true);
        }}
        className={cn(
          className,
          !desabilitado && "cursor-text rounded-md decoration-marca-300 decoration-dashed underline-offset-4 hover:bg-marca-50/70 hover:underline",
        )}
        title={desabilitado ? undefined : "Clique para editar"}
      >
        {valor || <span className="text-suave">{placeholder}</span>}
      </span>
    );
  }
  const salvar = () => {
    setEditando(false);
    if (texto.trim() !== valor) onSalvar(texto.trim());
  };
  return (
    <textarea
      data-editavel
      ref={ref}
      value={texto}
      rows={multilinha ? 3 : 1}
      onChange={(e) => {
        setTexto(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
      }}
      onBlur={salvar}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setTexto(valor);
          setEditando(false);
        }
        if (e.key === "Enter" && !multilinha) {
          e.preventDefault();
          salvar();
        }
      }}
      className={cn(className, "block w-full resize-none rounded-lg border border-marca-300 bg-superficie px-2 py-1 outline-none ring-4 ring-marca-100")}
    />
  );
}

export function BotaoComentar({ onClick, ativo }: { onClick: () => void; ativo?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Comentar com o Edu"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-lg transition",
        ativo ? "bg-marca-600 text-white" : "text-suave opacity-0 hover:bg-marca-50 hover:text-marca-600 group-hover:opacity-100",
      )}
    >
      <MessageSquarePlus className="size-4" />
    </button>
  );
}

const LARGURA_DICA = 288;

/**
 * Dica que aparece ao passar o mouse (ou ao focar com Tab) sobre o conteúdo. É desenhada no <body>,
 * com posição fixa calculada na tela, para nunca ficar cortada por cartões com overflow escondido;
 * abre para cima quando falta espaço embaixo. `alinhar="inicio"` alinha pela esquerda do gatilho.
 */
export function Dica({
  texto,
  alinhar = "centro",
  focavel = true,
  children,
}: {
  texto: React.ReactNode;
  alinhar?: "centro" | "inicio";
  /** false quando o conteúdo já é focável (ex.: um botão), para não criar duas paradas no Tab. */
  focavel?: boolean;
  children: React.ReactNode;
}) {
  const gatilho = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

  const mostrar = () => {
    const r = gatilho.current?.getBoundingClientRect();
    if (!r) return;
    const desejado = alinhar === "centro" ? r.left + r.width / 2 - LARGURA_DICA / 2 : r.left;
    const left = Math.min(Math.max(8, desejado), window.innerWidth - LARGURA_DICA - 8);
    setPos(window.innerHeight - r.bottom > 160 ? { left, top: r.bottom + 8 } : { left, bottom: window.innerHeight - r.top + 8 });
  };
  const esconder = () => setPos(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `esconder` só chama setPos, que é estável
  useEffect(() => {
    if (!pos) return;
    // Rolar ou redimensionar com a dica aberta: fecha (a posição deixaria de bater).
    window.addEventListener("scroll", esconder, true);
    window.addEventListener("resize", esconder);
    return () => {
      window.removeEventListener("scroll", esconder, true);
      window.removeEventListener("resize", esconder);
    };
  }, [pos]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: dica (tooltip) que também abre pelo foco do teclado
    <span
      ref={gatilho}
      tabIndex={focavel ? 0 : undefined}
      onMouseEnter={mostrar}
      onMouseLeave={esconder}
      onFocus={mostrar}
      onBlur={esconder}
      className="inline-flex cursor-help rounded outline-none focus-visible:ring-2 focus-visible:ring-marca-300"
    >
      {children}
      {pos &&
        createPortal(
          <span
            role="tooltip"
            style={{ ...pos, width: LARGURA_DICA }}
            className="pointer-events-none fixed z-[90] rounded-xl bg-tinta px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-flutuante"
          >
            {texto}
          </span>,
          document.body,
        )}
    </span>
  );
}
