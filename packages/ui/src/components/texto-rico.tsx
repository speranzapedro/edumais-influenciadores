import { Fragment } from "react";

/** Partes do texto com a posição onde cada uma começa (chave estável para o React). */
function partes(texto: string) {
  let pos = 0;
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte) => {
    const inicio = pos;
    pos += parte.length;
    return { parte, inicio };
  });
}

/** Texto corrido com **negrito** (o que o tutor de IA às vezes usa) e quebras de linha preservadas. */
export function TextoComNegrito({ texto }: { texto: string }) {
  return (
    <>
      {partes(texto).map(({ parte, inicio }) =>
        parte.startsWith("**") && parte.endsWith("**") && parte.length > 4 ? (
          <strong key={inicio}>{parte.slice(2, -2)}</strong>
        ) : (
          <Fragment key={inicio}>{parte}</Fragment>
        ),
      )}
    </>
  );
}
