import { type ClassValue, clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

// ───────────────────────────── Botão ─────────────────────────────

const VARIANTES = {
  primario: "gradiente-marca text-white shadow-flutuante hover:brightness-110 active:brightness-95",
  secundario: "bg-marca-50 text-marca-700 hover:bg-marca-100",
  contorno: "border border-linha bg-superficie text-tinta hover:bg-fundo",
  fantasma: "text-tinta-2 hover:bg-marca-50 hover:text-marca-700",
  sucesso: "bg-verde text-white hover:brightness-105",
  erro: "bg-vermelho text-white hover:brightness-105",
  perigo: "bg-vermelho-bg text-vermelho hover:brightness-95",
  branco: "bg-white text-marca-800 hover:bg-marca-50",
} as const;

const TAMANHOS = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-2xl",
  xl: "h-14 px-6 text-base gap-2 rounded-2xl",
} as const;

export type VarianteBotao = keyof typeof VARIANTES;

export function classesBotao(variante: VarianteBotao = "primario", tamanho: keyof typeof TAMANHOS = "md") {
  return cn(
    "inline-flex select-none items-center justify-center font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    VARIANTES[variante],
    TAMANHOS[tamanho],
  );
}

export function Botao({
  variante = "primario",
  tamanho = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variante?: VarianteBotao; tamanho?: keyof typeof TAMANHOS }) {
  return <button className={cn(classesBotao(variante, tamanho), className)} {...props} />;
}

// ───────────────────────────── Card ─────────────────────────────

export function Cartao({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-card border border-linha/70 bg-superficie shadow-card", className)} {...props} />;
}

export function CabecalhoCartao({ titulo, icone, acao, className }: { titulo: ReactNode; icone?: ReactNode; acao?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2 font-semibold text-tinta">
        {icone}
        <span>{titulo}</span>
      </div>
      {acao}
    </div>
  );
}

// ───────────────────────────── Pill / Badge ─────────────────────────────

export type Tom = "lilas" | "azul" | "laranja" | "verde" | "rosa" | "ambar" | "vermelho" | "neutro";

const TONS: Record<Tom, string> = {
  lilas: "bg-lilas-bg text-lilas",
  azul: "bg-azul-bg text-azul",
  laranja: "bg-laranja-bg text-laranja",
  verde: "bg-verde-bg text-verde",
  rosa: "bg-rosa-bg text-rosa",
  ambar: "bg-ambar-bg text-ambar",
  vermelho: "bg-vermelho-bg text-vermelho",
  neutro: "bg-fundo text-suave",
};

export function classesTom(tom: Tom) {
  return TONS[tom];
}

export function Pill({ tom = "lilas", className, ...props }: ComponentProps<"span"> & { tom?: Tom }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", TONS[tom], className)}
      {...props}
    />
  );
}

// ───────────────────────────── Tile de ícone ─────────────────────────────

export function TileIcone({
  tom = "lilas",
  tamanho = "md",
  className,
  children,
}: {
  tom?: Tom;
  tamanho?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}) {
  const t = { sm: "size-8 rounded-[10px] [&_svg]:size-4", md: "size-11 rounded-tile [&_svg]:size-5", lg: "size-14 rounded-2xl [&_svg]:size-6" }[tamanho];
  return <div className={cn("grid shrink-0 place-items-center", TONS[tom], t, className)}>{children}</div>;
}

// ───────────────────────────── Progresso ─────────────────────────────

export function BarraProgresso({
  valor,
  className,
  cor = "bg-marca-600",
  trilho = "bg-marca-100",
}: {
  valor: number;
  className?: string;
  cor?: string;
  trilho?: string;
}) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full", trilho, className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", cor)} style={{ width: `${v}%` }} />
    </div>
  );
}

/** Anel de progresso (gauge) como na referência: arco grosso com ponta arredondada. */
export function AnelProgresso({
  valor,
  tamanho = 160,
  espessura = 16,
  cor = "#6c5ce7",
  trilho = "#ebe7ff",
  children,
  className,
}: {
  valor: number;
  tamanho?: number;
  espessura?: number;
  cor?: string;
  trilho?: string;
  children?: ReactNode;
  className?: string;
}) {
  const r = (tamanho - espessura) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90" aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke={trilho} strokeWidth={espessura} />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          fill="none"
          stroke={cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

// ───────────────────────────── Avatar ─────────────────────────────

/**
 * Personagem gerado (DiceBear) por cima das iniciais. Desligado por enquanto: o avatar mostra só as
 * iniciais do nome. Para religar, troque para `true` (o fundo e a semente continuam os mesmos).
 */
const PERSONAGEM_NO_AVATAR = false;

const FUNDOS_AVATAR = ["c7bdff", "b6e3f4", "ffd5dc", "ffdfbf", "d1f4d9", "e0d7ff"];

/** Mesma semente, mesmo fundo: cada pessoa mantém a cor do avatar em todas as telas. */
function fundoAvatar(semente: string) {
  let h = 0;
  for (const ch of semente) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FUNDOS_AVATAR[h % FUNDOS_AVATAR.length];
}

export function urlAvatar(semente: string) {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(semente)}&backgroundColor=${fundoAvatar(semente)}`;
}

/** "Pedro" → "P"; "Pedro Castro" → "PC"; "Pedro Castro Speranza" → "PS" (primeiro nome + último sobrenome). */
export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = (p?: string) => (p ? Array.from(p)[0] : "");
  return (primeira(partes[0]) + (partes.length > 1 ? primeira(partes[partes.length - 1]) : "")).toLocaleUpperCase("pt-BR") || "?";
}

export function Avatar({ nome, semente, tamanho = 40, className }: { nome: string; semente?: string; tamanho?: number; className?: string }) {
  const s = semente ?? nome;
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-marca-800 ring-2 ring-white", className)}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.36, backgroundColor: `#${fundoAvatar(s)}` }}
    >
      {iniciais(nome)}
      {PERSONAGEM_NO_AVATAR && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urlAvatar(s)} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
      )}
    </span>
  );
}

// ───────────────────────────── Skeleton ─────────────────────────────

export function Esqueleto({ className }: { className?: string }) {
  return <div className={cn("esqueleto rounded-xl", className)} />;
}

// ───────────────────────────── Formulários ─────────────────────────────

export const classesInput =
  "h-12 w-full rounded-2xl border border-linha bg-superficie px-4 text-[15px] text-tinta outline-none transition placeholder:text-suave/70 focus:border-marca-400 focus:ring-4 focus:ring-marca-100 disabled:opacity-60";

export function Campo({ rotulo, ajuda, className, id, ...props }: ComponentProps<"input"> & { rotulo: ReactNode; ajuda?: ReactNode }) {
  const campoId = id ?? (typeof props.name === "string" ? `campo-${props.name}` : undefined);
  return (
    <label htmlFor={campoId} className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-semibold text-tinta-2">{rotulo}</span>
      <input id={campoId} className={classesInput} {...props} />
      {ajuda && <span className="mt-1 block text-xs text-suave">{ajuda}</span>}
    </label>
  );
}

export function Seletor({ rotulo, className, children, id, ...props }: ComponentProps<"select"> & { rotulo?: ReactNode }) {
  const campoId = id ?? (typeof props.name === "string" ? `sel-${props.name}` : undefined);
  const select = (
    <select id={campoId} className={cn(classesInput, "h-10 rounded-xl pr-8 text-sm", !rotulo && className)} {...props}>
      {children}
    </select>
  );
  if (!rotulo) return select;
  return (
    <label htmlFor={campoId} className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-semibold text-tinta-2">{rotulo}</span>
      {select}
    </label>
  );
}

export function Aviso({ tom = "vermelho", className, ...props }: ComponentProps<"div"> & { tom?: "vermelho" | "verde" | "ambar" | "lilas" }) {
  const cores = {
    vermelho: "bg-vermelho-bg text-[#b42323]",
    verde: "bg-verde-bg text-[#11733f]",
    ambar: "bg-ambar-bg text-[#8a6100]",
    lilas: "bg-marca-50 text-marca-700",
  } as const;
  return (
    <div
      role={tom === "vermelho" ? "alert" : "status"}
      className={cn("rounded-2xl px-4 py-3 text-sm font-medium leading-snug", cores[tom], className)}
      {...props}
    />
  );
}

// ───────────────────────────── Marca ─────────────────────────────

/** Nome do produto, para textos e títulos. */
export const NOME_PRODUTO = "Edu+";

/** Logotipo do Edu+: o selo com a seta de crescimento e "Edu" com o "+" destacado. */
export function Marca({ className, claro = false }: { className?: string; claro?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="gradiente-marca grid size-9 place-items-center rounded-xl shadow-flutuante">
        <svg
          viewBox="0 0 24 24"
          className="size-5 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 17l5-5 4 4 7-8" />
          <path d="M15 8h5v5" />
        </svg>
      </div>
      <div className={cn("text-[17px] font-extrabold leading-none tracking-tight", claro ? "text-white" : "text-tinta")}>
        Edu<span className={claro ? "text-marca-200" : "text-marca-600"}>+</span>
      </div>
    </div>
  );
}
