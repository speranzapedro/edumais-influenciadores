import { randomUUID } from "node:crypto";
import { Player } from "@edu/aula-ui";
import { aulaParaJogar, eduDisponivel } from "@edu/db";
import { notFound, redirect } from "next/navigation";
import { exigirAluno } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function AulaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aluno = await exigirAluno();
  const r = await aulaParaJogar(id, aluno);
  if (r.tipo === "nao_encontrada") notFound();
  if (r.tipo === "bloqueada") redirect(`/trilhas/${r.trilhaId}?bloqueada=1`);
  const dados = r.dados;
  const edu = await eduDisponivel(aluno, dados.aula.trilha.id);
  return (
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
  );
}
