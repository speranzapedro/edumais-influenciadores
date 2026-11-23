import { Fragment } from "react";

/** Texto corrido com **negrito** (o que o tutor de IA às vezes usa) e quebras de linha preservadas. */
export function TextoComNegrito({ texto }: { texto: string }) {
  return (
    <>
      {texto
        .split(/(\*\*[^*]+\*\*)/g)
        // biome-ignore lint/suspicious/noArrayIndexKey: as partes vêm de um split fixo do texto e nunca mudam de ordem.
        .map((parte, i) =>
          parte.startsWith("**") && parte.endsWith("**") && parte.length > 4 ? (
            <strong key={i}>{parte.slice(2, -2)}</strong>
          ) : (
            <Fragment key={i}>{parte}</Fragment>
          ),
        )}
    </>
  );
}
