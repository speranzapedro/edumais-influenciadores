import { rotaMateriais } from "@edu/estudio/servidor";
import { rotasEstudio } from "@/lib/estudio";

export const runtime = "nodejs";

export const POST = rotaMateriais(rotasEstudio);
