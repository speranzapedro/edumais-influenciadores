/** Marca Edu+: o símbolo de tendência do design system + wordmark com o "+" em destaque. */
export function Logo({ claro = false, className = "" }: { claro?: boolean; className?: string }) {
  return (
    <span className={`group/logo inline-flex items-center gap-2.5 ${className}`}>
      <span className="gradiente-marca grid size-9 place-items-center rounded-xl shadow-flutuante transition-transform duration-500 ease-[var(--ease-mola)] group-hover/logo:-rotate-6 group-hover/logo:scale-105">
        <svg
          viewBox="0 0 24 24"
          className="size-5 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 17l5-5 4 4 7-8" />
          <path d="M15 8h5v5" />
        </svg>
      </span>
      <span className={`text-[21px] font-extrabold tracking-tight ${claro ? "text-white" : "text-tinta"}`}>
        Edu
        <span
          className={`inline-block transition-transform duration-700 ease-[var(--ease-mola)] group-hover/logo:rotate-180 ${claro ? "text-marca-300" : "text-marca-600"}`}
        >
          +
        </span>
      </span>
    </span>
  );
}
