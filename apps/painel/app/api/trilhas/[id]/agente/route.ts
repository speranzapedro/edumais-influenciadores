import { rotaAgente } from "@edu/estudio/servidor";
import { rotasEstudio } from "@/lib/estudio";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export const POST = rotaAgente(rotasEstudio);
