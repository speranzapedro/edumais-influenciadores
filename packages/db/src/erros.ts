/** Erro com mensagem segura para mostrar ao usuário final (login, cadastro, formulários). */
export class ErroAcesso extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroAcesso";
  }
}

/** Recurso de outra pessoa (ou inexistente): a mensagem não revela qual dos dois. */
export class ErroPermissao extends Error {
  constructor(mensagem = "Você não tem permissão para esta ação.") {
    super(mensagem);
    this.name = "ErroPermissao";
  }
}
