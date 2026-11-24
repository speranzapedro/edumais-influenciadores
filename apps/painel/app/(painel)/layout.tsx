import { Confirmacoes } from "@edu/ui";
import { Sidebar } from "@/components/Sidebar";
import { exigirCriador } from "@/lib/sessao";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const e = await exigirCriador();
  return (
    <div className="flex min-h-dvh">
      <Sidebar usuario={{ id: e.usuario.id, nome: e.perfil.nome_publico, handle: e.perfil.handle, foto: e.perfil.foto_url }} />
      <div className="min-w-0 flex-1">{children}</div>
      <Confirmacoes />
    </div>
  );
}
