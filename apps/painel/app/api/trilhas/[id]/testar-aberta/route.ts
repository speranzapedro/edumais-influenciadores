import { rotaTestarAberta } from "@edu/estudio/servidor";
import { rotasEstudio } from "@/lib/estudio";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export const POST = rotaTestarAberta(rotasEstudio);
