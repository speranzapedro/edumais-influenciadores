import { irParaOCriador } from "@/lib/criador";

export const dynamic = "force-dynamic";

/** Endereço antigo: agora fica dentro do app de cada criador (/@criador/progresso). */
export default function Antigo() {
  return irParaOCriador("/progresso");
}
