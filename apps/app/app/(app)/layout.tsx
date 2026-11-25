import { exigirAluno } from "@/lib/sessao";

/** Fora do app de um criador só ficam a escolha do criador e os endereços antigos (que redirecionam). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await exigirAluno();
  return <div className="relative mx-auto min-h-dvh max-w-[440px] bg-fundo pb-10 shadow-[0_0_80px_-30px_rgba(29,26,58,0.25)]">{children}</div>;
}
