import { ShellCriador } from "@/components/ShellCriador";
import { TelaNotificacoes } from "@/components/telas/TelaNotificacoes";
import { exigirAssinante } from "@/lib/criador";

export const dynamic = "force-dynamic";

export default async function NotificacoesDoCriador({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { aluno, criador, produtos, base } = await exigirAssinante(handle, `/@${handle}/notificacoes`);
  return (
    <ShellCriador base={base} marca={produtos[0]}>
      <TelaNotificacoes aluno={aluno} criadorId={criador.id} base={base} />
    </ShellCriador>
  );
}
