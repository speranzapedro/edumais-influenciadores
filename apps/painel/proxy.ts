import { proxySessao } from "@edu/db/next";
import type { NextRequest } from "next/server";

// /redefinir-senha precisa da sessão aberta pelo link do e-mail, mas a página trata a falta dela.
const PUBLICAS = ["/login", "/cadastro", "/esqueci-senha", "/auth", "/redefinir-senha", "/termos", "/api/saude"];

export async function proxy(request: NextRequest) {
  return proxySessao("painel", request, PUBLICAS);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|exemplos/|.*.(?:svg|png|jpg|jpeg|webp|ico|md)$).*)"],
};
