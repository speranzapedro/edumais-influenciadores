import { emailUnico, ipUnico, limparBanco, SENHA } from "@edu/testing";
import { beforeAll, describe, expect, it } from "vitest";
import {
  apagarConta,
  atualizarNome,
  CREDENCIAIS_INVALIDAS,
  concluirOnboarding,
  criarConta,
  EMAIL_EM_USO,
  getUsuario,
  getUsuarioPorAuth,
  marcarTourEstudio,
  registrarAcesso,
  registrarAuditoria,
  reiniciarOnboarding,
  resolverLogin,
  trocarSenha,
  verificarLimite,
} from "../src/acesso";
import { db } from "../src/client";
import { ErroAcesso } from "../src/erros";

beforeAll(limparBanco);

describe("criarConta", () => {
  it("cria o login no Auth (confirmado) e a linha em users, com o e-mail normalizado", async () => {
    const email = emailUnico("Conta");
    const u = await criarConta({ role: "aluno", nome: "  Ana   Souza ", email: `  ${email.toUpperCase()} `, senha: SENHA });
    expect(u).toMatchObject({ nome: "Ana Souza", email: email.toLowerCase(), role: "aluno", status: "ativo" });
    expect(u.aceite_termos_em).not.toBeNull();
    const { data } = await db().auth.admin.getUserById(u.auth_user_id);
    expect(data.user?.email).toBe(email.toLowerCase());
    expect(data.user?.email_confirmed_at).toBeTruthy();
    expect(data.user?.app_metadata).toMatchObject({ role: "aluno", user_id: u.id });
    expect((await getUsuarioPorAuth(u.auth_user_id))?.id).toBe(u.id);
  });

  it("recusa e-mail já usado, sem diferenciar maiúsculas", async () => {
    const email = emailUnico();
    await criarConta({ role: "aluno", nome: "Primeira Pessoa", email, senha: SENHA });
    await expect(criarConta({ role: "criador", nome: "Segunda Pessoa", email: email.toUpperCase(), senha: SENHA })).rejects.toThrow(EMAIL_EM_USO);
  });

  it("valida nome, e-mail e senha antes de criar qualquer coisa", async () => {
    await expect(criarConta({ role: "aluno", nome: "Al", email: emailUnico(), senha: SENHA })).rejects.toThrow("nome completo");
    await expect(criarConta({ role: "aluno", nome: "Ana Souza", email: "sem-arroba", senha: SENHA })).rejects.toThrow("E-mail inválido");
    await expect(criarConta({ role: "aluno", nome: "Ana Souza", email: emailUnico(), senha: "curta1" })).rejects.toThrow("8 caracteres");
    await expect(criarConta({ role: "aluno", nome: "Ana Souza", email: emailUnico(), senha: "somenteletras" })).rejects.toThrow("letras e números");
  });

  it("apagar a conta no Auth remove o usuário em cascata", async () => {
    const u = await criarConta({ role: "aluno", nome: "Conta Temporária", email: emailUnico(), senha: SENHA });
    await apagarConta(u.auth_user_id);
    expect(await getUsuario(u.id)).toBeNull();
    // Apagar de novo não falha (a conta já não existe).
    await expect(apagarConta(u.auth_user_id)).resolves.toBeUndefined();
  });
});

describe("login", () => {
  it("aceita a conta no app certo e recusa no outro com a mesma mensagem", async () => {
    const email = emailUnico();
    const fa = await criarConta({ role: "aluno", nome: "Fã Login", email, senha: SENHA });
    const r = await resolverLogin({ email: email.toUpperCase(), ip: ipUnico(), app: "app" });
    expect(r.usuario.id).toBe(fa.id);
    await expect(resolverLogin({ email, ip: ipUnico(), app: "painel" })).rejects.toThrow(CREDENCIAIS_INVALIDAS);
    await expect(resolverLogin({ email: emailUnico("ninguem"), ip: ipUnico(), app: "app" })).rejects.toThrow(CREDENCIAIS_INVALIDAS);
  });

  it("conta desativada não entra", async () => {
    const email = emailUnico();
    const u = await criarConta({ role: "criador", nome: "Criador Inativo", email, senha: SENHA });
    await db().from("users").update({ status: "inativo" }).eq("id", u.id);
    await expect(resolverLogin({ email, ip: ipUnico(), app: "painel" })).rejects.toThrow(CREDENCIAIS_INVALIDAS);
  });

  it("bloqueia o e-mail depois de 8 falhas em 15 minutos", async () => {
    const email = emailUnico("alvo");
    for (let i = 0; i < 8; i++) await expect(resolverLogin({ email, ip: ipUnico(), app: "app" })).rejects.toThrow(ErroAcesso);
    await expect(resolverLogin({ email, ip: ipUnico(), app: "app" })).rejects.toThrow("Muitas tentativas");
  });

  it("verificarLimite conta sucessos quando pedido", async () => {
    const chave = `teste:${ipUnico()}`;
    await db()
      .from("tentativas_login")
      .insert([
        { chave, sucesso: true },
        { chave, sucesso: true },
      ]);
    await expect(verificarLimite(chave, 2, 60)).resolves.toBeUndefined();
    await expect(verificarLimite(chave, 2, 60, { sucessos: true })).rejects.toThrow("Muitas tentativas");
  });
});

describe("perfil e guias", () => {
  it("troca senha, nome e registra o acesso", async () => {
    const u = await criarConta({ role: "criador", nome: "Pessoa Perfil", email: emailUnico(), senha: SENHA });
    await expect(trocarSenha({ authUserId: u.auth_user_id, senha: "fraca" })).rejects.toThrow(ErroAcesso);
    await trocarSenha({ authUserId: u.auth_user_id, senha: "NovaSenha123" });
    await atualizarNome(u.id, "  Pessoa   Renomeada ");
    await expect(atualizarNome(u.id, "x")).rejects.toThrow("nome completo");
    await registrarAcesso(u.id);
    const depois = (await getUsuario(u.id))!;
    expect(depois.nome).toBe("Pessoa Renomeada");
    expect(depois.ultimo_acesso_em).not.toBeNull();
  });

  it("guarda o tour do painel e as telas vistas do estúdio", async () => {
    const u = await criarConta({ role: "criador", nome: "Pessoa Tour", email: emailUnico(), senha: SENHA });
    await concluirOnboarding(u.id);
    expect((await getUsuario(u.id))?.onboarding_concluido_em).not.toBeNull();
    await reiniciarOnboarding(u.id);
    expect((await getUsuario(u.id))?.onboarding_concluido_em).toBeNull();
    await marcarTourEstudio(u.id, ["visao", "ementa"]);
    await marcarTourEstudio(u.id, ["ementa", "cards"]);
    expect((await getUsuario(u.id))?.tour_estudio).toEqual(["visao", "ementa", "cards"]);
  });

  it("registra auditoria", async () => {
    const u = await criarConta({ role: "criador", nome: "Pessoa Auditada", email: emailUnico(), senha: SENHA });
    await registrarAuditoria({ ator: u.id, acao: "teste.feito", entidade: "users", entidadeId: u.id, dados: { x: 1 } });
    const { data } = await db().from("audit_log").select("*").eq("acao", "teste.feito").single();
    expect(data).toMatchObject({ ator_id: u.id, entidade_id: u.id, dados: { x: 1 } });
  });
});
