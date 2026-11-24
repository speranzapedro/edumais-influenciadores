import { rotaAberta } from "@edu/aula-ui/servidor";
import { usuarioDaSessao } from "@edu/db/next";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Feedback em tempo real da pergunta aberta (SSE). */
export const POST = rotaAberta({ sessao: () => usuarioDaSessao("app") });
