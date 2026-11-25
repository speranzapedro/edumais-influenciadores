import { produtoDaTrilha } from "@edu/db";
import { notFound } from "next/navigation";
import { ShellCriador } from "@/components/ShellCriador";
import { TelaCaminho } from "@/components/telas/TelaCaminho";
import { exigirAssinante } from "@/lib/criador";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string; produto: string; id: string }> };

/** Caminho da trilha dentro do produto, com a marca dele. */
export default async function TrilhaNoProduto({ params }: Params) {
  const { handle, produto: slug, id } = await params;
  const { aluno, criador, produtos } = await exigirAssinante(handle, `/@${handle}/${slug}/trilha/${id}`);
  const produto = produtos.find((p) => p.slug === slug.toLowerCase());
  const marca = await produtoDaTrilha(id);
  // A trilha tem de ser deste produto e deste criador.
  if (!produto || marca?.produto.id !== produto.id || marca.handle !== criador.handle) notFound();
  return (
    <ShellCriador base={`/@${criador.handle}`} marca={produto}>
      <TelaCaminho aluno={aluno} trilhaId={id} base={`/@${criador.handle}/${produto.slug}`} />
    </ShellCriador>
  );
}
