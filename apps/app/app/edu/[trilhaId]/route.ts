import { rotaEdu } from "@edu/aula-ui/servidor";
import { usuarioDaSessao } from "@edu/db/next";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Pergunta ao Edu (SSE). */
export const POST = rotaEdu({ sessao: () => usuarioDaSessao("app") });
