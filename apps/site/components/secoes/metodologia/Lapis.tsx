/** Lápis da referência, adaptado à paleta: corpo marca-900 com listras lilás, virola e borracha rosa. Ponta em (22, 240). */
export const PONTA_LAPIS = { x: 22, y: 240 };

export function Lapis({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 240" width="44" height="240" className={`overflow-visible drop-shadow-[12px_10px_8px_rgb(29_26_58/0.18)] ${className}`} aria-hidden>
      <rect x="6" y="0" width="32" height="32" rx="10" fill="#ff8fb1" />
      <rect x="6" y="16" width="32" height="16" fill="#ff8fb1" />
      <rect x="5" y="28" width="34" height="18" rx="2" fill="#e8478f" />
      <rect x="5" y="33" width="34" height="2.5" fill="#c22f70" />
      <rect x="5" y="39" width="34" height="2.5" fill="#c22f70" />
      <rect x="6" y="46" width="32" height="138" fill="#2b2680" />
      <rect x="14.5" y="46" width="3" height="138" fill="#9b87fb" />
      <rect x="26.5" y="46" width="3" height="138" fill="#9b87fb" />
      <rect x="8" y="48" width="3" height="134" rx="1.5" fill="#fff" opacity="0.18" />
      <path d="M6 184h32l-16 56z" fill="#ffe1bd" />
      <path d="M6 184c3 4 7 4 10.5 0 3.5 4 7.5 4 11 0 3.5 4 7.5 4 10.5 0" fill="#2b2680" />
      <path d="M17.6 225h8.8L22 240z" fill="#1d1a3a" />
    </svg>
  );
}
