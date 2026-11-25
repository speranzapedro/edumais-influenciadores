import { estadoDemo } from "@edu/estudio/demo";
import { EstudioCriador } from "@/components/estudio/EstudioCriador";
import { exigirCriador } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/** Só destinos internos de trilhas e produtos (evita redirecionar para fora do painel). */
const destinoSeguro = (d: string | undefined) => (d && /^\/(trilhas|produtos)(\/|\?|$)/.test(d) ? d : "/produtos");

/**
 * Tour do estúdio com a trilha de exemplo num produto fictício.
 * Abre antes da primeira "Nova trilha" e pelo botão "Guia" do estúdio; nada aqui é salvo.
 */
export default async function TourEstudioPage({ searchParams }: { searchParams: Promise<{ depois?: string }> }) {
  const e = await exigirCriador();
  const sp = await searchParams;
  return (
    <EstudioCriador
      estado={estadoDemo({ id: "demo", nome: "Eletricidade (exemplo)" })}
      produto={{ nome: "Seu produto (exemplo)", publicado: true, assinantes: 400 }}
      usuario={{ id: e.usuario.id, nome: e.perfil.nome_publico }}
      linkPagina=""
      demo={{ depois: destinoSeguro(sp.depois) }}
    />
  );
}
