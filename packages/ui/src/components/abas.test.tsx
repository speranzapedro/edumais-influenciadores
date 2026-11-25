import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Abas, AreaTexto } from "./abas";

afterEach(cleanup);

describe("Abas e AreaTexto", () => {
  it("marca só a aba ativa e mostra a contagem", () => {
    render(
      <Abas
        rotulo="Seções do produto"
        ativa="/produtos/1"
        itens={[
          { href: "/produtos/1", rotulo: "Trilhas", contagem: 3 },
          { href: "/produtos/1/detalhes", rotulo: "Detalhes" },
        ]}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Seções do produto" })).toBeTruthy();
    const trilhas = screen.getByRole("link", { name: /Trilhas/ });
    expect(trilhas.getAttribute("aria-current")).toBe("page");
    expect(trilhas.textContent).toContain("3");
    expect(screen.getByRole("link", { name: "Detalhes" }).getAttribute("aria-current")).toBeNull();
  });

  it("AreaTexto liga o rótulo ao campo e mostra a ajuda", () => {
    render(<AreaTexto rotulo="Descrição" name="descricao" ajuda="Aparece na sua página." defaultValue="Olá" />);
    const campo = screen.getByLabelText(/Descrição/) as HTMLTextAreaElement;
    expect(campo.value).toBe("Olá");
    expect(campo.id).toBe("campo-descricao");
    expect(screen.getByText("Aparece na sua página.")).toBeTruthy();
  });
});
