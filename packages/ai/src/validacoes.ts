import { camposComEscapeUnicode, type Pendencia, todosTopicos, validarAulas, validarCards, validarEmenta } from "@edu/core";
import { moduloDoCard } from "./tools/aulas";
import type { Workspace } from "./workspace";

/** Validação da etapa corrente do workspace (respeitando o escopo de módulo dos workers paralelos). */
export function validarWorkspace(ws: Workspace, escopoModulo: string | null = null): Pendencia[] {
  return [...validarEtapa(ws, escopoModulo), ...escapesUnicode(ws, escopoModulo)];
}

/**
 * Texto com `\u00e7` literal (acento escapado pelo modelo) aparece assim para o aluno.
 * As tools já decodificam a entrada; isto pega o que veio de versões anteriores.
 */
function escapesUnicode(ws: Workspace, escopoModulo: string | null): Pendencia[] {
  const alvos: { alvo: string; valor: unknown }[] =
    ws.etapa === "ementa"
      ? [{ alvo: "ementa", valor: ws.ementa }]
      : ws.etapa === "cards"
        ? ws.cards.cards.map((c) => ({ alvo: c.id, valor: c }))
        : ws.aulas.aulas.filter((a) => !escopoModulo || a.modulo_id === escopoModulo).map((a) => ({ alvo: a.id, valor: a }));
  return alvos.flatMap(({ alvo, valor }) =>
    camposComEscapeUnicode(valor).map((campo) => ({
      nivel: "erro" as const,
      alvo,
      regra: "escape_unicode",
      mensagem: `"${campo}" tem código de caractere no lugar do acento (ex.: \\u00e7 em vez de ç). Reescreva o texto com os caracteres normais.`,
    })),
  );
}

function validarEtapa(ws: Workspace, escopoModulo: string | null): Pendencia[] {
  if (ws.etapa === "ementa") return validarEmenta(ws.ementa, ws.materiaisIds);
  const ementaEscopo = escopoModulo ? { ...ws.ementa, modulos: ws.ementa.modulos.filter((m) => m.id === escopoModulo) } : ws.ementa;
  if (ws.etapa === "cards") return validarCards(ementaEscopo, ws.cards, ws.materiaisIds);
  if (!escopoModulo) return validarAulas(ws.ementa, ws.cards, ws.aulas);
  const topicoModulo = new Map(todosTopicos(ws.ementa).map((t) => [t.id, t.modulo_id]));
  return validarAulas(
    ementaEscopo,
    { cards: ws.cards.cards.filter((c) => moduloDoCard(topicoModulo, c) === escopoModulo) },
    { aulas: ws.aulas.aulas.filter((a) => a.modulo_id === escopoModulo) },
    { idsCardsValidos: new Set(ws.cards.cards.map((c) => c.id)) },
  );
}
