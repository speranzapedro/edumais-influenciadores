/**
 * Moldura de celular dimensionada em `em`: o tamanho final vem do font-size do pai,
 * o que deixa o mesmo mockup servir na hero, nas seções e no mobile.
 */
export function Celular({ children, className = "", tela = "bg-fundo" }: { children: React.ReactNode; className?: string; tela?: string }) {
  return (
    <div
      className={`relative rounded-[3.3em] bg-tinta p-[0.55em] shadow-[0_3em_5em_-2em_rgb(43_38_128/0.55),inset_0_0_0_0.14em_rgb(255_255_255/0.1)] ${className}`}
    >
      <span className="absolute -left-[0.28em] top-[9em] h-[3.2em] w-[0.3em] rounded-l-full bg-tinta" />
      <span className="absolute -right-[0.28em] top-[11em] h-[5em] w-[0.3em] rounded-r-full bg-tinta" />
      <div className={`relative isolate h-full overflow-hidden rounded-[2.8em] ${tela}`}>
        <div className="absolute left-1/2 top-[0.75em] z-30 h-[1.55em] w-[6.4em] -translate-x-1/2 rounded-full bg-tinta" />
        {children}
      </div>
    </div>
  );
}
