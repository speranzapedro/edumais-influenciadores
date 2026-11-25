import { randomUUID } from "node:crypto";
import { Player } from "@edu/aula-ui";
import { aulaParaJogar, eduDisponivel, produtoDaTrilha } from "@edu/db";
import { notFound, redirect } from "next/navigation";
import { EstiloMarca } from "@/components/EstiloMarca";
import { exigirAluno } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function AulaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aluno = await exigirAluno();
  const r = await aulaParaJogar(id, aluno);
  if (r.tipo === "nao_encontrada") notFound();
  if (r.tipo === "bloqueada") redirect(`/trilhas/${r.trilhaId}?bloqueada=1`);
  const dados = r.dados;
  const [edu, marca] = await Promise.all([eduDisponivel(aluno, dados.aula.trilha.id), produtoDaTrilha(dados.aula.trilha.id)]);
  return (
    <>
      {marca && <EstiloMarca primaria={marca.produto.cor_primaria} destaque={marca.produto.cor_destaque} />}
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
    </>
  );
}
