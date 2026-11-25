import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvioImagem, SeletorCor } from "./marca-campos";

afterEach(cleanup);

function CorControlada({ inicial = "#6c5ce7", aoMudar }: { inicial?: string; aoMudar?: (h: string) => void }) {
  const [cor, setCor] = useState(inicial);
  return (
    <>
      <SeletorCor
        rotulo="Cor principal"
        valor={cor}
        aoMudar={(h) => {
          setCor(h);
          aoMudar?.(h);
        }}
      />
      <button type="button" onClick={() => setCor("#1d4ed8")}>
        Paleta
      </button>
      <output>{cor}</output>
    </>
  );
}

describe("SeletorCor", () => {
  it("só aceita hex completo e acompanha mudanças de fora", () => {
    const aoMudar = vi.fn();
    render(<CorControlada aoMudar={aoMudar} />);
    const texto = screen.getByLabelText("Cor principal") as HTMLInputElement;
    fireEvent.change(texto, { target: { value: "ff0" } });
    expect(aoMudar).not.toHaveBeenCalled();
    fireEvent.change(texto, { target: { value: "FF0000" } });
    expect(aoMudar).toHaveBeenLastCalledWith("#ff0000");
    expect(screen.getByRole("status").textContent).toBe("#ff0000");

    fireEvent.change(screen.getByLabelText("Cor principal (seletor)"), { target: { value: "#00ff00" } });
    expect(screen.getByRole("status").textContent).toBe("#00ff00");

    fireEvent.click(screen.getByRole("button", { name: "Paleta" }));
    expect((screen.getByLabelText("Cor principal") as HTMLInputElement).value).toBe("#1d4ed8");
  });
});

describe("EnvioImagem", () => {
  it("mostra a prévia, envia o arquivo escolhido, exibe o erro e remove", async () => {
    const aoEscolher = vi.fn(async () => "A imagem pode ter no máximo 2 MB.");
    const aoRemover = vi.fn();
    const { rerender, container } = render(<EnvioImagem rotulo="Logo" url={null} aoEscolher={aoEscolher} aoRemover={aoRemover} />);
    expect(screen.getByRole("button", { name: /Escolher imagem/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Remover/ })).toBeNull();

    const arquivo = new File(["x"], "logo.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Logo"), { target: { files: [arquivo] } });
    });
    expect(aoEscolher).toHaveBeenCalledWith(arquivo);
    expect(screen.getByRole("alert").textContent).toContain("2 MB");

    rerender(<EnvioImagem rotulo="Logo" url="https://x.test/logo.png" aoEscolher={aoEscolher} aoRemover={aoRemover} enviando={false} />);
    // Imagem decorativa (alt vazio): o rótulo do campo já diz o que é.
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://x.test/logo.png");
    fireEvent.click(screen.getByRole("button", { name: /Remover/ }));
    expect(aoRemover).toHaveBeenCalled();
    rerender(<EnvioImagem rotulo="Logo" url="https://x.test/logo.png" aoEscolher={aoEscolher} enviando />);
    expect(screen.getByRole("button", { name: /Enviando/ }).hasAttribute("disabled")).toBe(true);
  });
});
