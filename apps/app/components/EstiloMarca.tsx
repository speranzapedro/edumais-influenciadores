import { COR_MARCA, cssDoTema, gerarTema, normalizarHex } from "@edu/core";

/**
 * Tema do produto na página: as variáveis da marca no :root (vale também para modais em portal).
 * O CSS sai de cssDoTema, que só emite variáveis conhecidas com cores #rrggbb (nada vindo do banco
 * entra cru). Sem cor própria, não emite nada e fica o Edu+.
 */
export function EstiloMarca({ primaria, destaque }: { primaria: string | null | undefined; destaque?: string | null }) {
  const p = normalizarHex(primaria) ?? COR_MARCA;
  const d = normalizarHex(destaque);
  const padrao = p === COR_MARCA && (d === null || d === COR_MARCA);
  const css = padrao ? "" : cssDoTema(gerarTema({ primaria: p, destaque: d }).vars);
  // biome-ignore lint/security/noDangerouslySetInnerHtml: CSS gerado por cssDoTema (só variáveis conhecidas e hex validados)
  return css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null;
}

/** Cor da barra do navegador e do app instalado (contraste com o branco garantido pelo motor). */
export const corDoTema = (primaria: string | null | undefined, destaque?: string | null) => gerarTema({ primaria, destaque }).corTema;
