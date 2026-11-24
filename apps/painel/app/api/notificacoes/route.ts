import { listarNotificacoes, marcarNotificacoesLidas } from "@edu/db";
import { criadorOuNulo } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export async function GET() {
  const e = await criadorOuNulo();
  if (!e) return new Response("Não autorizado", { status: 401 });
  return Response.json(await listarNotificacoes(e.usuario.id, 15));
}

export async function POST() {
  const e = await criadorOuNulo();
  if (!e) return new Response("Não autorizado", { status: 401 });
  await marcarNotificacoesLidas(e.usuario.id);
  return Response.json({ ok: true });
}
