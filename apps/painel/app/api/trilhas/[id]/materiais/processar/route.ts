import { rotaProcessarMaterial } from "@edu/estudio/servidor";
import { rotasEstudio } from "@/lib/estudio";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = rotaProcessarMaterial(rotasEstudio);
