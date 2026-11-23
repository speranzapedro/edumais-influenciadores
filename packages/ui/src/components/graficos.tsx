import { cn } from "./base";

/** Caminho suave (Catmull-Rom → Bézier) passando pelos pontos. */
function caminhoSuave(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Gráfico de área lilás como o "Performance Overview" da referência. SVG puro, responsivo. */
export function GraficoArea({
  dados,
  altura = 160,
  className,
  cor = "#6c5ce7",
  rotulosX = 4,
  sufixo = "",
}: {
  dados: { rotulo: string; valor: number }[];
  altura?: number;
  className?: string;
  cor?: string;
  rotulosX?: number;
  sufixo?: string;
}) {
  const L = 600;
  const H = altura;
  const pad = { t: 28, b: 24, l: 34, r: 14 };
  const max = Math.max(1, ...dados.map((d) => d.valor));
  const teto = Math.ceil(max / 4) * 4 || 4;
  const x = (i: number) => pad.l + (i / Math.max(1, dados.length - 1)) * (L - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / teto) * (H - pad.t - pad.b);
  const pts = dados.map((d, i) => [x(i), y(d.valor)] as [number, number]);
  const linha = caminhoSuave(pts);
  const area = `${linha} L ${x(dados.length - 1)},${H - pad.b} L ${x(0)},${H - pad.b} Z`;
  const ult = pts[pts.length - 1];
  const idGrad = `grad-${cor.replace("#", "")}`;
  const passo = Math.max(1, Math.floor((dados.length - 1) / Math.max(1, rotulosX - 1)));

  return (
    <svg viewBox={`0 0 ${L} ${H}`} className={cn("w-full overflow-visible", className)} aria-hidden="true">
      <defs>
        <linearGradient id={idGrad} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={L - pad.r} y1={y(teto * f)} y2={y(teto * f)} stroke="#ebebf3" strokeDasharray="4 6" />
          <text x={pad.l - 8} y={y(teto * f) + 4} textAnchor="end" fontSize="11" fill="#8b8aa6">
            {Math.round(teto * f)}
          </text>
        </g>
      ))}
      <path d={area} fill={`url(#${idGrad})`} />
      <path d={linha} fill="none" stroke={cor} strokeWidth="3" strokeLinecap="round" />
      {dados.map((d, i) =>
        i % passo === 0 || i === dados.length - 1 ? (
          <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize="11" fill="#8b8aa6">
            {d.rotulo}
          </text>
        ) : null,
      )}
      {ult && (
        <g>
          <circle cx={ult[0]} cy={ult[1]} r="6" fill="white" stroke={cor} strokeWidth="3" />
          <rect x={ult[0] - 26} y={ult[1] - 30} width="52" height="20" rx="6" fill={cor} />
          <text x={ult[0]} y={ult[1] - 16} textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
            {dados[dados.length - 1].valor}
            {sufixo}
          </text>
        </g>
      )}
    </svg>
  );
}
