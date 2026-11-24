import { Marca } from "@edu/ui";
import { ContatoWhatsApp } from "./ContatoWhatsApp";
import { PassosCriador } from "./PassosCriador";

/** Coluna de apresentação das telas de entrada (desktop): como funciona, em 4 passos animados. */
export function LadoMarca() {
  return (
    <section className="hidden flex-col justify-between gap-10 bg-superficie p-12 lg:flex">
      <Marca />
      <div className="max-w-lg">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-marca-600">Como funciona</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-[1.1] tracking-tight">
          Seu curso gamificado
          <br />
          <span className="text-marca-600">em 4 passos.</span>
        </h1>
        <PassosCriador className="mt-8" />
      </div>
      <ContatoWhatsApp />
    </section>
  );
}
