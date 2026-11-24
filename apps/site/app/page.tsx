import { Contato } from "@/components/secoes/Contato";
import { Faq } from "@/components/secoes/criadores/Faq";
import { PorQue } from "@/components/secoes/criadores/PorQue";
import { Responsabilidades } from "@/components/secoes/criadores/Responsabilidades";
import { Desafios } from "@/components/secoes/desafios/Desafios";
import { Hero } from "@/components/secoes/hero/Hero";
import { Metodologia } from "@/components/secoes/metodologia/Metodologia";
import { Nav } from "@/components/secoes/Nav";
import { Parceria } from "@/components/secoes/Parceria";
import { Rodape } from "@/components/secoes/Rodape";
import { Temas } from "@/components/secoes/Temas";

/** Landing de parceria com criadores: o produto (estúdio e app), por que, parceria 70/30, quem faz o quê e FAQ. */
export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Temas />
        <PorQue />
        <Parceria />
        <Responsabilidades />
        <Metodologia />
        <Desafios />
        <Faq />
        <Contato />
      </main>
      <Rodape />
    </>
  );
}
