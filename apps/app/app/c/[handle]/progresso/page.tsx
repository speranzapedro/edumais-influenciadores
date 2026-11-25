import { ShellCriador } from "@/components/ShellCriador";
import { TelaProgresso } from "@/components/telas/TelaProgresso";
import { exigirAssinante } from "@/lib/criador";

export const dynamic = "force-dynamic";

export default async function ProgressoDoCriador({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { aluno, criador, produtos, base } = await exigirAssinante(handle, `/@${handle}/progresso`);
  return (
    <ShellCriador base={base} marca={produtos[0]}>
      <TelaProgresso aluno={aluno} criadorId={criador.id} />
    </ShellCriador>
  );
}
