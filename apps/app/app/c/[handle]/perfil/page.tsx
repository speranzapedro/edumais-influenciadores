import { criadoresDoFa } from "@edu/db";
import { ShellCriador } from "@/components/ShellCriador";
import { TelaPerfil } from "@/components/telas/TelaPerfil";
import { exigirAssinante } from "@/lib/criador";

export const dynamic = "force-dynamic";

export default async function PerfilNoCriador({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { aluno, criador, produtos, base } = await exigirAssinante(handle, `/@${handle}/perfil`);
  const outros = (await criadoresDoFa(aluno.id)).filter((c) => c.id !== criador.id).length;
  return (
    <ShellCriador base={base} marca={produtos[0]}>
      <TelaPerfil aluno={aluno} criador={criador} outros={outros} />
    </ShellCriador>
  );
}
