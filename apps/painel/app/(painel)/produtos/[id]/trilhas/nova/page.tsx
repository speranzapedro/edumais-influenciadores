import { LIMITES_ORIENTACAO, TOUR_ESTUDIO_VISTO } from "@edu/core";
import { Aviso, Cartao, CORES, ICONES_DISCIPLINAS, Icone, TileIcone } from "@edu/ui";
import { ChevronLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { novaTrilha } from "../../../actions";
import { carregarProduto } from "../../cabecalho";

export const dynamic = "force-dynamic";

const classeInput =
  "mt-1.5 h-11 w-full rounded-xl border border-linha bg-fundo px-3.5 text-sm outline-none transition focus:border-marca-400 focus:bg-superficie";

/** Nova trilha dentro de um produto. */
export default async function NovaTrilhaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ titulo?: string; objetivo?: string; erro?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { e, produto } = await carregarProduto(id);
  const aqui = `/produtos/${produto.id}/trilhas/nova`;
  // Primeira trilha: antes do formulário, o tour do estúdio com a trilha de exemplo.
  if (!(e.usuario.tour_estudio ?? []).includes(TOUR_ESTUDIO_VISTO) && !sp.erro) {
    redirect(`/trilhas/tour?depois=${encodeURIComponent(aqui)}`);
  }
  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <Link href={`/produtos/${produto.id}`} className="inline-flex items-center gap-1 text-sm text-suave hover:text-tinta">
        <ChevronLeft className="size-4" /> {produto.nome}
      </Link>
      <h1 className="mt-4 text-[26px] font-extrabold tracking-tight">Nova trilha</h1>
      <p className="text-sm text-suave">A trilha entra em {produto.nome}. Conte o objetivo; depois você envia seus conteúdos e o Edu faz o resto.</p>

      <form action={novaTrilha.bind(null, produto.id)}>
        <Cartao className="mt-6 space-y-5 p-6">
          {sp.erro && <Aviso>{sp.erro}</Aviso>}
          <label className="block">
            <span className="text-sm font-semibold">Título</span>
            <input
              name="titulo"
              required
              minLength={3}
              defaultValue={sp.titulo ?? ""}
              placeholder="Ex.: Revoluções que mudaram o mundo"
              className={classeInput}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">
              Objetivo da trilha <span className="text-vermelho">*</span>
            </span>
            <textarea
              name="objetivo"
              rows={3}
              required
              minLength={LIMITES_ORIENTACAO.objetivoMin}
              maxLength={LIMITES_ORIENTACAO.objetivoMax}
              defaultValue={sp.objetivo ?? ""}
              placeholder="O que seus seguidores vão saber ou conseguir fazer ao fim da trilha"
              className="mt-1.5 w-full rounded-xl border border-linha bg-fundo px-3.5 py-2.5 text-sm outline-none transition focus:border-marca-400 focus:bg-superficie"
            />
            <span className="mt-1 block text-xs text-suave">Orienta o Edu na visão geral, na ementa e nas aulas.</span>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Descrição curta</span>
            <textarea
              name="descricao"
              rows={2}
              placeholder="O que o aluno vai aprender (aparece na sua página e no app)"
              className="mt-1.5 w-full rounded-xl border border-linha bg-fundo px-3.5 py-2.5 text-sm outline-none transition focus:border-marca-400 focus:bg-superficie"
            />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold">Cor</legend>
            <div className="mt-2 flex gap-2">
              {CORES.map((c, i) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="cor" value={c} defaultChecked={i === 0} className="peer sr-only" />
                  <TileIcone tom={c} tamanho="sm" className="ring-offset-2 peer-checked:ring-2 peer-checked:ring-marca-500">
                    <span className="size-3 rounded-full bg-current" />
                  </TileIcone>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold">Ícone</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ICONES_DISCIPLINAS.map((ic, i) => (
                <label key={ic} className="cursor-pointer">
                  <input type="radio" name="icone" value={ic} defaultChecked={i === 0} className="peer sr-only" />
                  <TileIcone tom="neutro" className="text-tinta-2 peer-checked:bg-marca-600 peer-checked:text-white">
                    <Icone nome={ic} />
                  </TileIcone>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="gradiente-marca flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold text-white shadow-flutuante transition hover:brightness-110"
          >
            <Sparkles className="size-4" /> Criar e abrir o estúdio
          </button>
        </Cartao>
      </form>
    </div>
  );
}
