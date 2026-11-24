import { Marca, TileIcone } from "@edu/ui";
import { BadgeDollarSign, FileText, Megaphone, Sparkles } from "lucide-react";

const DESTAQUES = [
  { icone: <FileText />, tom: "lilas" as const, titulo: "Do seu conteúdo à aula", texto: "Roteiros, posts, transcrições e e-books viram trilhas" },
  { icone: <Sparkles />, tom: "laranja" as const, titulo: "O Edu como coprodutor", texto: "Você revisa e aprova tudo antes de publicar" },
  { icone: <Megaphone />, tom: "azul" as const, titulo: "Um link para a sua audiência", texto: "Seus seguidores entram e começam a estudar" },
  { icone: <BadgeDollarSign />, tom: "verde" as const, titulo: "Vendas no seu painel", texto: "Assinantes, origem e a sua parte de cada venda" },
];

/** Coluna de apresentação das telas de entrada (desktop). */
export function LadoMarca() {
  return (
    <section className="hidden flex-col justify-between bg-superficie p-12 lg:flex">
      <Marca />
      <div>
        <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight">
          Sua audiência
          <br />
          <span className="text-marca-600">virando alunos.</span>
        </h1>
        <p className="mt-4 max-w-md text-suave">
          Envie o que você já produz e o Edu, nossa IA, monta com você uma trilha gamificada no estilo Duolingo, com a sua cara. Você divulga o link e acompanha
          as vendas.
        </p>
        <div className="mt-10 space-y-4">
          {DESTAQUES.map((d) => (
            <div key={d.titulo} className="flex items-center gap-3">
              <TileIcone tom={d.tom}>{d.icone}</TileIcone>
              <div>
                <div className="text-sm font-bold">{d.titulo}</div>
                <div className="text-xs text-suave">{d.texto}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-suave">Edu+ para criadores de conteúdo.</p>
    </section>
  );
}
