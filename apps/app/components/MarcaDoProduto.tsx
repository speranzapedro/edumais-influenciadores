import { gerarTema } from "@edu/core";
import { cn } from "@edu/ui";

/** Logo do produto ou a inicial sobre a cor principal do produto (contraste com o branco garantido). */
export function MarcaDoProduto({
  produto,
  logo,
  className,
}: {
  produto: { nome: string; cor_primaria: string; cor_destaque?: string | null };
  logo: string | null;
  className?: string;
}) {
  if (logo)
    return (
      <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-linha bg-white", className)}>
        <img src={logo} alt="" className="size-full object-contain p-1" />
      </div>
    );
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-2xl font-extrabold text-white", className)}
      style={{ background: gerarTema({ primaria: produto.cor_primaria }).corTema }}
      aria-hidden="true"
    >
      {produto.nome.charAt(0).toUpperCase()}
    </div>
  );
}
