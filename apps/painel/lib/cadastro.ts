import { chaveConfere } from "@edu/core";

/**
 * O cadastro do criador não é aberto: a Edu+ envia pelo WhatsApp o link `/cadastro/<chave>`, com a
 * chave de CRIADOR_CADASTRO_CHAVE. Trocar a variável invalida os links antigos. Sem a variável
 * (ou com uma chave curta demais), o cadastro fica fechado.
 */
export function chaveDeCadastroValida(chave: string): boolean {
  const certa = process.env.CRIADOR_CADASTRO_CHAVE?.trim() ?? "";
  return certa.length >= 16 && chaveConfere(chave, certa);
}
