import { redirect } from "next/navigation";

/** Endereço antigo: as trilhas agora ficam dentro de cada produto. */
export default function TrilhasAntiga() {
  redirect("/produtos");
}
