import { proxySessao } from "@edu/db/next";
import type { NextRequest } from "next/server";

// /@<criador> (e /c/<criador>, o endereço antigo) é a página pública do criador e dos produtos;
// /redefinir-senha precisa da sessão do link do e-mail, mas a página trata a falta dela.
const PUBLICAS = ["/login", "/c", "/esqueci-senha", "/auth", "/redefinir-senha", "/termos", "/manifest.webmanifest", "/api/saude"];
const publica = (path: string) => path.startsWith("/@") || PUBLICAS.some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  return proxySessao("app", request, publica);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
