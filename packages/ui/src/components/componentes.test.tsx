import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AnelProgresso,
  Avatar,
  Aviso,
  BarraProgresso,
  Botao,
  CabecalhoCartao,
  Campo,
  Cartao,
  classesBotao,
  classesTom,
  Esqueleto,
  iniciais,
  Marca,
  Pill,
  Seletor,
  TileIcone,
  urlAvatar,
} from "./base";
import { Confirmacoes, confirmar } from "./confirmar";
import { CampoSenha } from "./formulario";
import { GraficoArea } from "./graficos";
import { HEX_TOM, Icone, tomDe } from "./icones";
import { Modal } from "./modal";
import { BotaoVoltar, LinkTermos, RastreadorNavegacao } from "./navegacao";
import { TERMOS, TermosAluno, TermosCriador } from "./termos";
import { TextoComNegrito } from "./texto-rico";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ back: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe("marca e identidade", () => {
  it("Marca mostra Edu+ com o + destacado", () => {
    render(<Marca />);
    expect(screen.getByText("Edu")).toBeTruthy();
    expect(screen.getByText("+").className).toContain("text-marca-600");
    cleanup();
    render(<Marca claro />);
    expect(screen.getByText("+").className).toContain("text-marca-200");
  });

  it("Avatar usa as iniciais e mantém a cor pela semente", () => {
    expect(iniciais("Bia")).toBe("B");
    expect(iniciais("Bia de História Souza")).toBe("BS");
    expect(iniciais("  ")).toBe("?");
    expect(urlAvatar("bia")).toContain("seed=bia");
    render(<Avatar nome="Bia História" semente="x" tamanho={32} />);
    const el = screen.getByText("BH");
    expect(el.style.width).toBe("32px");
  });
});

describe("componentes de base", () => {
  it("Botao aplica variante e tamanho", () => {
    render(
      <Botao variante="perigo" tamanho="sm">
        Apagar
      </Botao>,
    );
    const b = screen.getByRole("button", { name: "Apagar" });
    expect(b.className).toContain("text-vermelho");
    expect(classesBotao()).toContain("gradiente-marca");
  });

  it("Cartao, Pill, TileIcone, Esqueleto e CabecalhoCartao renderizam o conteúdo", () => {
    render(
      <Cartao data-testid="cartao">
        <CabecalhoCartao titulo="Vendas" acao={<span>ação</span>} />
        <Pill tom="verde">Publicada</Pill>
        <TileIcone tom="azul" tamanho="lg">
          <span>ícone</span>
        </TileIcone>
        <Esqueleto className="h-4" />
      </Cartao>,
    );
    expect(screen.getByTestId("cartao").textContent).toContain("Vendas");
    expect(screen.getByText("Publicada").className).toContain(classesTom("verde").split(" ")[0]);
    expect(screen.getByText("ação")).toBeTruthy();
  });

  it("BarraProgresso e AnelProgresso limitam o valor entre 0 e 100", () => {
    const { container } = render(
      <>
        <BarraProgresso valor={150} />
        <AnelProgresso valor={-10} tamanho={80}>
          <span>0%</span>
        </AnelProgresso>
      </>,
    );
    expect((container.querySelector("[style*='width']") as HTMLElement).style.width).toBe("100%");
    expect(screen.getByText("0%")).toBeTruthy();
  });

  it("Campo e Seletor ligam o rótulo ao controle; Aviso tem o papel certo", () => {
    render(
      <>
        <Campo rotulo="Nome" name="nome" ajuda="Como aparece no app" />
        <Seletor rotulo="Cor" name="cor">
          <option>lilás</option>
        </Seletor>
        <Aviso>Algo deu errado.</Aviso>
        <Aviso tom="verde">Salvo.</Aviso>
      </>,
    );
    expect(screen.getByLabelText(/^Nome/)).toBeTruthy();
    expect(screen.getByLabelText("Cor")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Algo deu errado.");
    expect(screen.getByRole("status").textContent).toBe("Salvo.");
  });

  it("CampoSenha alterna entre mostrar e ocultar", () => {
    render(<CampoSenha rotulo="Senha" name="senha" />);
    const input = screen.getByLabelText("Senha") as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(input.type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(input.type).toBe("password");
  });

  it("TextoComNegrito transforma **trechos** em negrito", () => {
    const { container } = render(<TextoComNegrito texto="A **Bastilha** caiu em 1789." />);
    expect(container.querySelector("strong")?.textContent).toBe("Bastilha");
    expect(container.textContent).toBe("A Bastilha caiu em 1789.");
  });

  it("Icone cai num ícone padrão e tomDe traduz cores antigas", () => {
    const { container } = render(<Icone nome="nao-existe" className="x" />);
    expect(container.querySelector("svg")).toBeTruthy();
    expect(tomDe("violet")).toBe("lilas");
    expect(tomDe("green")).toBe("verde");
    expect(tomDe(null)).toBe("lilas");
    expect(HEX_TOM.verde.forte).toMatch(/^#/);
  });

  it("GraficoArea desenha a linha e o último valor", () => {
    const { container } = render(
      <GraficoArea
        dados={[
          { rotulo: "01/11", valor: 0 },
          { rotulo: "02/11", valor: 3 },
        ]}
        sufixo=" fãs"
      />,
    );
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("3");
  });
});

describe("modal e confirmação", () => {
  it("Modal fecha pelo botão e pelo Esc", () => {
    const aoFechar = vi.fn();
    render(
      <Modal aberto aoFechar={aoFechar} titulo="Detalhes">
        <p>conteúdo</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Detalhes" })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Fechar" })[1]);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(aoFechar).toHaveBeenCalledTimes(2);
  });

  it("confirmar() abre o diálogo da plataforma e devolve a escolha", async () => {
    render(<Confirmacoes />);
    let resposta: Promise<boolean> = Promise.resolve(false);
    act(() => {
      resposta = confirmar("Tirar a página do ar?", { botao: "Tirar do ar", perigo: true });
    });
    expect(screen.getByText("Tirar a página do ar?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tirar do ar" }));
    await expect(resposta).resolves.toBe(true);

    act(() => {
      resposta = confirmar("Arquivar a trilha?");
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await expect(resposta).resolves.toBe(false);
  });
});

describe("navegação", () => {
  it("LinkTermos abre o texto por cima e fecha em Entendi", () => {
    render(
      <LinkTermos rotulo="termos de uso">
        <p>texto dos termos</p>
      </LinkTermos>,
    );
    expect(screen.queryByText("texto dos termos")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "termos de uso" }));
    expect(screen.getByText("texto dos termos")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Entendi" }));
    expect(screen.queryByText("texto dos termos")).toBeNull();
  });

  it("BotaoVoltar sem histórico do app leva ao destino padrão", () => {
    render(
      <>
        <RastreadorNavegacao />
        <BotaoVoltar padrao="/trilhas">Voltar</BotaoVoltar>
      </>,
    );
    const link = screen.getByText("Voltar") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/trilhas");
    fireEvent.click(link);
  });
});

describe("termos", () => {
  it("o do aluno e o do criador trazem a versão e não falam de escola", () => {
    const { container } = render(
      <>
        <TermosAluno />
        <TermosCriador />
      </>,
    );
    const texto = container.textContent ?? "";
    expect(texto).toContain(`Versão ${TERMOS.versao}`);
    expect(texto).toContain("criadores de conteúdo");
    expect(texto).toContain("70% para você");
    expect(texto).not.toMatch(/turma|coordenação|matrícula/i);
  });
});
