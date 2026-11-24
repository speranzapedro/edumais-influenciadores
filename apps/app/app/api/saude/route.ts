import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Verificação de vida para o monitoramento e o smoke test depois do deploy. */
export function GET() {
  return NextResponse.json({ ok: true, app: "app" });
}
