/**
 * Doodles desenhados à mão (traço aberto, pontas arredondadas). O GSAP anima o `stroke`
 * com DrawSVG a partir da classe `.traco`. Todos são decorativos.
 */
const TRACOS = {
  circulo: {
    viewBox: "0 0 300 100",
    d: ["M262 24C214 4 92 2 40 22 6 35 4 72 50 86c58 17 168 12 216-8 32-14 28-48-24-62C200 6 150 8 116 13"],
  },
  sublinhado: {
    viewBox: "0 0 300 26",
    d: ["M4 15c36-9 66 7 100-2s66-8 100 0 58 6 92-5"],
  },
  sublinhadoDuplo: {
    viewBox: "0 0 300 34",
    d: ["M6 12c58-6 160-9 288-2", "M30 26c70-7 150-8 240-3"],
  },
  seta: {
    viewBox: "0 0 120 96",
    d: ["M8 12c34-6 82 10 94 64", "M84 62l18 16 10-22"],
  },
  setaCurva: {
    viewBox: "0 0 160 120",
    d: ["M10 100C20 40 70 12 140 18", "M120 6l22 12-18 18"],
  },
  estrela: {
    viewBox: "0 0 24 24",
    d: ["M12 1c1 8 3 10 11 11-8 1-10 3-11 11-1-8-3-10-11-11 8-1 10-3 11-11z"],
  },
  espiral: {
    viewBox: "0 0 56 34",
    d: ["M2 22C10 3 27 3 23 17 19 31 5 23 13 13 21 3 37 7 35 21 33 33 49 31 54 13"],
  },
  zigue: {
    viewBox: "0 0 80 20",
    d: ["M2 14 12 4l10 12 10-12 10 12 10-12 10 12 10-12 6 6"],
  },
} as const;

export type TipoRabisco = keyof typeof TRACOS;

export function Rabisco({
  tipo,
  className = "",
  espessura = 3,
  esticar = false,
}: {
  tipo: TipoRabisco;
  className?: string;
  espessura?: number;
  esticar?: boolean;
}) {
  const t = TRACOS[tipo];
  return (
    <svg
      viewBox={t.viewBox}
      className={`rabisco pointer-events-none overflow-visible ${className}`}
      preserveAspectRatio={esticar ? "none" : "xMidYMid meet"}
      fill="none"
      aria-hidden
    >
      {t.d.map((d) => (
        <path
          key={d}
          className="traco"
          d={d}
          stroke="currentColor"
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
