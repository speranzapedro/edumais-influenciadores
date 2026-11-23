import { describe, expect, it } from "vitest";
import { camposComEscapeUnicode, desescaparProfundo, desescaparUnicode, temEscapeUnicode } from "./escapes";

describe("desescaparUnicode", () => {
  it("troca acentos escapados pelo caractere", () => {
    expect(desescaparUnicode("Introdu\\u00e7\\u00e3o \\u00e0 Plat\\u00e3o")).toBe("Introdução à Platão");
    expect(desescaparUnicode("Resist\\u00eancia em \\u03a9")).toBe("Resistência em Ω");
    expect(desescaparUnicode("MAI\\u00daSCULA \\u00C7")).toBe("MAIÚSCULA Ç");
  });

  it("junta pares substitutos (emoji)", () => {
    expect(desescaparUnicode("Boa! \\ud83c\\udf89")).toBe("Boa! 🎉");
  });

  it("deixa como está o que não é sequência válida", () => {
    expect(desescaparUnicode("sem nada")).toBe("sem nada");
    expect(desescaparUnicode("\\u00g1 e \\u12")).toBe("\\u00g1 e \\u12");
    expect(desescaparUnicode("metade solta \\ud83c fim")).toBe("metade solta \\ud83c fim");
    expect(desescaparUnicode("nulo \\u0000")).toBe("nulo \\u0000");
    expect(desescaparUnicode("barra escapada \\\\u00e7")).toBe("barra escapada \\\\u00e7");
  });

  it("não mexe em trechos de código", () => {
    expect(desescaparUnicode("Em Java, `char c = '\\u00e7';` imprime \\u00e7.")).toBe("Em Java, `char c = '\\u00e7';` imprime ç.");
    expect(desescaparUnicode("Veja:\n```\nprint('\\u00e1')\n```\nAten\\u00e7\\u00e3o")).toBe("Veja:\n```\nprint('\\u00e1')\n```\nAtenção");
  });
});

describe("temEscapeUnicode", () => {
  it("só acusa fora de código", () => {
    expect(temEscapeUnicode("Plat\\u00e3o")).toBe(true);
    expect(temEscapeUnicode("`'\\u00e7'`")).toBe(false);
    expect(temEscapeUnicode("Platão")).toBe(false);
  });
});

describe("desescaparProfundo / camposComEscapeUnicode", () => {
  const entrada = { titulo: "Fun\\u00e7\\u00e3o", modulos: [{ topicos: ["ok", "Ilumina\\u00e7\\u00e3o"] }], n: 3, nada: null };

  it("percorre objetos e listas sem tocar no resto", () => {
    expect(desescaparProfundo(entrada)).toEqual({ titulo: "Função", modulos: [{ topicos: ["ok", "Iluminação"] }], n: 3, nada: null });
  });

  it("aponta os caminhos com defeito", () => {
    expect(camposComEscapeUnicode(entrada)).toEqual(["titulo", "modulos[0].topicos[1]"]);
    expect(camposComEscapeUnicode(desescaparProfundo(entrada))).toEqual([]);
  });
});
