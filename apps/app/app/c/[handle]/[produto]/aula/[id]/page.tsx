import { randomUUID } from "node:crypto";
import { Player } from "@edu/aula-ui";
import { aulaParaJogar, eduDisponivel, produtoDaTrilha } from "@edu/db";
import { notFound, redirect } from "next/navigation";
import { EstiloMarca } from "@/components/EstiloMarca";
import { ProvedorAulaDoProduto } from "@/components/ProvedorAulaFa";
import { exigirAssinante } from "@/lib/criador";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string; produto: string; id: string }> };

/** Aula no player, dentro do produto (com a marca dele); concluir leva à próxima aula ou à trilha do produto. */
export default async function AulaNoProduto({ params }: Params) {
  const { handle, produto: slug, id } = await params;
  const { aluno, criador, produtos } = await exigirAssinante(handle, `/@${handle}/${slug}/aula/${id}`);
  const produto = produtos.find((p) => p.slug === slug.toLowerCase());
  if (!produto) notFound();
  const base = `/@${criador.handle}/${produto.slug}`;
  const r = await aulaParaJogar(id, aluno);
  if (r.tipo === "nao_encontrada") notFound();
  if (r.tipo === "bloqueada") redirect(`${base}/trilha/${r.trilhaId}?bloqueada=1`);
  const dados = r.dados;
  const [edu, marca] = await Promise.all([eduDisponivel(aluno, dados.aula.trilha.id), produtoDaTrilha(dados.aula.trilha.id)]);
  if (marca?.produto.id !== produto.id) notFound();
  return (
    <ProvedorAulaDoProduto base={base} inicio={`/@${criador.handle}`}>
      <EstiloMarca primaria={produto.cor_primaria} destaque={produto.cor_destaque} />
      <Player
        aula={{ id: dados.aula.id, titulo: dados.aula.titulo, objetivo: dados.aula.objetivo }}
        trilha={dados.aula.trilha}
        blocos={dados.blocos}
        abertasAnteriores={dados.abertasAnteriores}
        posicao={dados.posicao}
        totalAulas={dados.totalAulas}
        modo={dados.modo}
        tentativa={randomUUID()}
        edu={edu}
      />
    </ProvedorAulaDoProduto>
  );
}
