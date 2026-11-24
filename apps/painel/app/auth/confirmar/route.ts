import { confirmarLinkEmail, destinoSeguro } from "@edu/db/next";
import { type NextRequest, NextResponse } from "next/server";

/** Destino dos links de e-mail do Supabase Auth: troca o token por uma sessão e segue para `next`. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const ok = await confirmarLinkEmail("painel", params);
  const url = request.nextUrl.clone();
  url.search = "";
  url.pathname = ok ? destinoSeguro(params.get("next"), "/") : "/esqueci-senha";
  if (!ok) url.searchParams.set("erro", "link");
  return NextResponse.redirect(url);
}
