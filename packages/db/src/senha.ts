/** Erro do Supabase Auth ao gravar a senha (só o que a mensagem precisa). */
export type ErroAuthSenha = { code?: string; name?: string };

export const LINK_EXPIRADO = "Link expirado ou inválido. Peça um novo e-mail de redefinição.";

const SESSAO_PERDIDA = new Set(["session_not_found", "session_expired", "bad_jwt", "user_not_found"]);

/** Mensagem para quem tenta gravar a nova senha pelo link do e-mail e o Supabase Auth recusa. */
export function erroNovaSenha(erro: ErroAuthSenha) {
  if (erro.code === "same_password") return "Escolha uma senha diferente da atual.";
  if (erro.code === "weak_password") return "Senha fraca. Use pelo menos 8 caracteres, com letras e números.";
  if (erro.name === "AuthSessionMissingError" || (erro.code && SESSAO_PERDIDA.has(erro.code))) return LINK_EXPIRADO;
  return "Não foi possível salvar a nova senha agora. Tente de novo em instantes.";
}
