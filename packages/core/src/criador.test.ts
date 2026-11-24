import { describe, expect, it } from "vitest";
import { linkWhatsAppEdu, WHATSAPP_EDU } from "./criador";

describe("linkWhatsAppEdu", () => {
  it("aponta para o número da Edu+", () => {
    expect(linkWhatsAppEdu()).toBe(`https://wa.me/${WHATSAPP_EDU}`);
  });

  it("leva a mensagem codificada", () => {
    expect(linkWhatsAppEdu("Olá! Dúvida & pergunta")).toBe(`https://wa.me/${WHATSAPP_EDU}?text=Ol%C3%A1!%20D%C3%BAvida%20%26%20pergunta`);
  });
});
