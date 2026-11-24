import { proxySessao } from "@edu/db/next";
import type { NextRequest } from "next/server";

// /c/<@> é a página pública do criador; /redefinir-senha precisa da sessão do link do e-mail, mas a
// página trata a falta dela.
const PUBLICAS = ["/login", "/c", "/esqueci-senha", "/auth", "/redefinir-senha", "/termos", "/manifest.webmanifest", "/api/saude"];

export async function proxy(request: NextRequest) {
  return proxySessao("app", request, PUBLICAS);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
