import { BarraNavegacao } from "./BarraNavegacao";
import { EstiloMarca } from "./EstiloMarca";

/**
 * Moldura do app de um criador para quem assina: as cores da marca (do produto aberto ou do primeiro
 * produto) e o menu com os endereços /@criador/… — dali o fã não vê outros criadores.
 */
export function ShellCriador({
  base,
  marca,
  semMenu = false,
  children,
}: {
  base: string;
  marca: { cor_primaria: string; cor_destaque: string | null } | null | undefined;
  semMenu?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto min-h-dvh max-w-[440px] bg-fundo pb-32 shadow-[0_0_80px_-30px_rgba(29,26,58,0.25)]">
      {marca && <EstiloMarca primaria={marca.cor_primaria} destaque={marca.cor_destaque} />}
      {children}
      {!semMenu && <BarraNavegacao base={base} />}
    </div>
  );
}
