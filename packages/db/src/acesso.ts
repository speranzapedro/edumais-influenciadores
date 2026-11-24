import { db, ok, talvez } from "./client";
import type { Json, JsonNaoNulo, Row, UserRoleDb } from "./database.types";
import { ErroAcesso } from "./erros";
import type { AppSessao } from "./sessao";

/**
 * Contas: o login é o Supabase Auth (e-mail + senha) e cada conta tem uma linha em `users`, ligada
 * por `auth_user_id`. As contas nascem pelo servidor (`criarConta`), já confirmadas.
 */

export type Usuario = Row<"users">;

export async function getUsuario(id: string): Promise<Usuario | null> {
  return talvez(await db().from("users").select("*").eq("id", id).maybeSingle(), "getUsuario");
}

export async function getUsuarioPorAuth(authUserId: string): Promise<Usuario | null> {
  return talvez(await db().from("users").select("*").eq("auth_user_id", authUserId).maybeSingle(), "getUsuarioPorAuth");
}

/** O painel é do criador (e da equipe Edu+); o app é do fã. */
export const papelCabeNoApp = (role: UserRoleDb, app: AppSessao) => (app === "app" ? role === "aluno" : role !== "aluno");

// ─────────────────────────── Validação ───────────────────────────

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizarEmail = (email: string) => email.trim().toLowerCase();

export function validarEmail(email: string) {
  return EMAIL.test(email) ? null : "E-mail inválido.";
}

export const normalizarNome = (nome: string) => nome.trim().replace(/\s+/g, " ");

export const SENHA_MINIMA = 8;

export function validarSenha(senha: string) {
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return "Use letras e números na senha.";
  return null;
}

export const CREDENCIAIS_INVALIDAS = "E-mail ou senha incorretos.";
export const EMAIL_EM_USO = "Já existe uma conta com este e-mail. Entre com sua senha.";

export function traduzirErroAuth(msg: string) {
  if (/already (been )?registered|already exists/i.test(msg)) return new ErroAcesso(EMAIL_EM_USO);
  if (/password/i.test(msg)) return new ErroAcesso("Senha recusada pelo servidor de autenticação. Escolha outra senha.");
  return new Error(`[auth] ${msg}`);
}

// ─────────────────────────── Limite de tentativas ───────────────────────────

/**
 * Lança erro se a chave já teve `max` falhas na janela. Com `sucessos`, conta as tentativas que deram
 * certo (teto de cadastros por IP).
 */
export async function verificarLimite(chave: string, max: number, janelaMin: number, opcoes: { sucessos?: boolean } = {}) {
  const desde = new Date(Date.now() - janelaMin * 60_000).toISOString();
  const r = await db()
    .from("tentativas_login")
    .select("id", { count: "exact", head: true })
    .eq("chave", chave)
    .eq("sucesso", !!opcoes.sucessos)
    .gte("created_at", desde);
  if (r.error) throw new Error(`[db] limite: ${r.error.message}`);
  if ((r.count ?? 0) >= max) throw new ErroAcesso(`Muitas tentativas. Aguarde ${janelaMin} minutos e tente de novo.`);
}

export async function registrarTentativa(chaves: string[], sucesso: boolean) {
  ok(
    await db()
      .from("tentativas_login")
      .insert(chaves.map((chave) => ({ chave, sucesso }))),
    "tentativa",
  );
}

// ─────────────────────────── Criar conta ───────────────────────────

/**
 * Cria a conta no Auth (confirmada, sem e-mail de confirmação) e a linha em `users`. Se a linha
 * falhar, a conta do Auth é apagada: não sobra login sem usuário.
 */
export async function criarConta(p: { role: UserRoleDb; nome: string; email: string; senha: string }): Promise<Usuario> {
  const nome = normalizarNome(p.nome);
  const email = normalizarEmail(p.email);
  if (nome.length < 3) throw new ErroAcesso("Informe seu nome completo.");
  const erro = validarEmail(email) ?? validarSenha(p.senha);
  if (erro) throw new ErroAcesso(erro);
  if (talvez(await db().from("users").select("id").eq("email", email).maybeSingle(), "email existente")) throw new ErroAcesso(EMAIL_EM_USO);

  const { data, error } = await db().auth.admin.createUser({ email, password: p.senha, email_confirm: true, app_metadata: { role: p.role } });
  if (error || !data.user) throw traduzirErroAuth(error?.message ?? "falha ao criar conta");
  const linha = await db()
    .from("users")
    .insert({ auth_user_id: data.user.id, role: p.role, nome: nome.slice(0, 120), email, aceite_termos_em: new Date().toISOString() })
    .select("*")
    .single();
  if (linha.error) {
    await apagarConta(data.user.id);
    if (linha.error.code === "23505") throw new ErroAcesso(EMAIL_EM_USO);
    throw new Error(`[db] criar usuario: ${linha.error.message}`);
  }
  const meta = await db().auth.admin.updateUserById(data.user.id, { app_metadata: { role: p.role, user_id: linha.data.id } });
  if (meta.error) {
    await apagarConta(data.user.id);
    throw new Error(`[auth] ${meta.error.message}`);
  }
  return linha.data;
}

/** Apaga o login no Auth; a linha em `users` (e tudo dela) sai em cascata. */
export async function apagarConta(authUserId: string) {
  const { error } = await db().auth.admin.deleteUser(authUserId);
  if (error && !/not.?found/i.test(error.message)) throw new Error(`[auth] ${error.message}`);
}

// ─────────────────────────── Login ───────────────────────────

/**
 * Confere o limite de tentativas e se a conta (ativa) pode entrar neste app. A senha é conferida pelo
 * app, com o cliente de sessão. Conta de outro app recebe a mesma mensagem de credencial inválida.
 */
export async function resolverLogin(p: { email: string; ip: string; app: AppSessao }) {
  const email = normalizarEmail(p.email);
  const chaves = [`ip:${p.ip}`, `login:${email}`];
  for (const c of chaves) await verificarLimite(c, c.startsWith("ip:") ? 30 : 8, 15);
  const u = talvez(await db().from("users").select("*").eq("email", email).maybeSingle(), "login");
  if (u?.status !== "ativo" || !papelCabeNoApp(u.role, p.app)) {
    await registrarTentativa(chaves, false);
    throw new ErroAcesso(CREDENCIAIS_INVALIDAS);
  }
  return { usuario: u, chaves };
}

export async function registrarAcesso(userId: string) {
  ok(await db().from("users").update({ ultimo_acesso_em: new Date().toISOString() }).eq("id", userId), "registrar acesso");
}

export async function trocarSenha(p: { authUserId: string; senha: string }) {
  const erro = validarSenha(p.senha);
  if (erro) throw new ErroAcesso(erro);
  const { error } = await db().auth.admin.updateUserById(p.authUserId, { password: p.senha });
  if (error) throw traduzirErroAuth(error.message);
}

export async function atualizarNome(userId: string, nome: string) {
  const n = normalizarNome(nome);
  if (n.length < 3) throw new ErroAcesso("Informe seu nome completo.");
  ok(
    await db()
      .from("users")
      .update({ nome: n.slice(0, 120), updated_at: new Date().toISOString() })
      .eq("id", userId),
    "atualizar nome",
  );
}

// ─────────────────────────── Guias do painel ───────────────────────────

/** Tour guiado concluído (ou pulado): não abre mais sozinho para esta pessoa. */
export async function concluirOnboarding(userId: string) {
  ok(
    await db().from("users").update({ onboarding_concluido_em: new Date().toISOString() }).eq("id", userId).is("onboarding_concluido_em", null),
    "concluir onboarding",
  );
}

/** "Refazer tour": o tour volta a abrir, do começo. */
export async function reiniciarOnboarding(userId: string) {
  ok(await db().from("users").update({ onboarding_concluido_em: null }).eq("id", userId), "reiniciar onboarding");
}

/** Guia do estúdio: registra as telas cujo guia a pessoa já viu (abre sozinho só na primeira vez). */
export async function marcarTourEstudio(userId: string, telas: string[]) {
  const u = ok(await db().from("users").select("tour_estudio").eq("id", userId).single(), "tour estudio");
  const vistas = [...new Set([...(u.tour_estudio ?? []), ...telas])].slice(0, 20);
  ok(await db().from("users").update({ tour_estudio: vistas }).eq("id", userId), "marcar tour estudio");
}

// ─────────────────────────── Auditoria ───────────────────────────

export async function registrarAuditoria(p: { ator: string | null; acao: string; entidade: string; entidadeId?: string | null; dados?: unknown }) {
  ok(
    await db()
      .from("audit_log")
      .insert({ ator_id: p.ator, acao: p.acao, entidade: p.entidade, entidade_id: p.entidadeId ?? null, dados: (p.dados ?? {}) as JsonNaoNulo }),
    "auditoria",
  );
}
