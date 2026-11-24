import type { Metadata } from "next";
import { DemoAula } from "./DemoAula";

export const metadata: Metadata = {
  title: "Edu+ · Experimente uma aula",
  description: "Uma aula de verdade do app da Edu+: microleitura, desafios e o feedback do Edu.",
};

/** Aula jogável com o player real do app (respostas corrigidas no navegador, nada é salvo). */
export default async function Experimente({ searchParams }: { searchParams: Promise<{ embutida?: string; r?: string }> }) {
  const { embutida, r } = await searchParams;
  const rodada = Number(r) || 0;
  return <DemoAula key={rodada} embutida={embutida === "1"} rodada={rodada} />;
}
