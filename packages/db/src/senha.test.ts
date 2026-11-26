import { describe, expect, it } from "vitest";
import { erroNovaSenha, LINK_EXPIRADO } from "./senha";

describe("erroNovaSenha", () => {
  it("senha igual à atual diz o motivo, não que o link expirou", () => {
    expect(erroNovaSenha({ code: "same_password" })).toBe("Escolha uma senha diferente da atual.");
  });

  it("senha fraca pede letras e números", () => {
    expect(erroNovaSenha({ code: "weak_password" })).toMatch(/letras e números/);
  });

  it("sem sessão (link vencido ou aberto sem passar pelo e-mail) pede um novo e-mail", () => {
    expect(erroNovaSenha({ name: "AuthSessionMissingError" })).toBe(LINK_EXPIRADO);
    expect(erroNovaSenha({ code: "session_not_found" })).toBe(LINK_EXPIRADO);
    expect(erroNovaSenha({ code: "bad_jwt" })).toBe(LINK_EXPIRADO);
  });

  it("outro erro pede para tentar de novo", () => {
    expect(erroNovaSenha({ code: "unexpected_failure" })).toMatch(/Tente de novo/);
    expect(erroNovaSenha({})).toMatch(/Tente de novo/);
  });
});
