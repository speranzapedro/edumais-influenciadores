import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArmazemTutor, EstadoIndice, LinhaTrecho } from "./indexacao";
import { sincronizarIndice, type TravaTutor, tutorHabilitado } from "./sincronizar";
import type { ConteudoTrilha } from "./trechos";

vi.mock("./sugestoes", () => ({ atualizarSugestoes: vi.fn(async () => "iguais") }));

vi.mock("./voyage", async (original) => ({
  ...(await original<typeof import("./voyage")>()),
  modeloEmbedding: () => "modelo-teste",
  embedSecoes: vi.fn(async (secoes: string[][]) => ({
    vetores: secoes.map((s) => s.map(() => [0.1, 0.2])),
    tokens: secoes.flat().length * 10,
    modelo: "modelo-teste",
  })),
}));

const conteudo = (texto: string): ConteudoTrilha => ({
  titulo: "Trilha",
  descricao: null,
  ementa: null,
  materiais: [{ id: "m1", nome: "a.md", paginas: [{ pagina: 1, texto }] }],
  aulas: [],
  cards: [],
});

/** Armazém + trava em memória, com o mesmo comportamento do ArmazemTutorDb. */
class ArmazemFalso implements ArmazemTutor, TravaTutor {
  publicada = true;
  texto = "Texto sobre a Lei de Ohm e circuitos elétricos residenciais simples.";
  linhas: LinhaTrecho[] = [];
  estado: EstadoIndice & { indexando_desde?: number | null; solicitado_em?: number | null } = { status: "pendente" };
  carregamentos = 0;
  aoCarregar: (() => void) | null = null;
  falhar = false;

  async carregarConteudo() {
    this.carregamentos++;
    this.aoCarregar?.();
    if (this.falhar) throw new Error("falha simulada");
    return conteudo(this.texto);
  }
  async hashesIndexados() {
    return new Set(this.linhas.filter((l) => l.embedding).map((l) => l.secao_hash));
  }
  async hashesTodos() {
    return new Set(this.linhas.map((l) => l.secao_hash));
  }
  async inserirTrechos(_: string, linhas: LinhaTrecho[]) {
    this.linhas.push(...linhas);
  }
  async removerSecoes(_: string, hashes: string[]) {
    const antes = this.linhas.length;
    this.linhas = this.linhas.filter((l) => !hashes.includes(l.secao_hash));
    return antes - this.linhas.length;
  }
  async removerSecoesExceto(_: string, manter: string[]) {
    return this.removerSecoes(
      _,
      [...(await this.hashesTodos())].filter((h) => !manter.includes(h)),
    );
  }
  async marcarIndice(_: string, e: EstadoIndice) {
    this.estado = { ...this.estado, ...e };
  }
  async trilhaPublicada() {
    return this.publicada;
  }
  async solicitar() {
    this.estado.solicitado_em = Date.now();
  }
  async travar(_: string, expiraMs: number) {
    const livre = this.estado.status !== "indexando" || !this.estado.indexando_desde || this.estado.indexando_desde < Date.now() - expiraMs;
    if (!livre) return false;
    this.estado = { ...this.estado, status: "indexando", indexando_desde: Date.now(), solicitado_em: null, erro: null };
    return true;
  }
  async pedidoPendente() {
    return !!this.estado.solicitado_em;
  }
  async hashSugestoes() {
    return null;
  }
  async gravarSugestoes() {}
  async destravar() {
    if (this.estado.status === "indexando") this.estado = { ...this.estado, status: "erro", erro: "Indexação interrompida." };
    this.estado.indexando_desde = null;
  }
}

describe("sincronizarIndice", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("ignora trilha não publicada", async () => {
    const a = new ArmazemFalso();
    a.publicada = false;
    expect(await sincronizarIndice(a, "t1")).toEqual({ status: "ignorada", motivo: "trilha não publicada" });
    expect(a.carregamentos).toBe(0);
  });

  it("indexa, libera a trava e não duplica ao rodar de novo", async () => {
    const a = new ArmazemFalso();
    const r = await sincronizarIndice(a, "t1");
    expect(r.status).toBe("indexada");
    expect(a.estado.status).toBe("pronto");
    const n = a.linhas.length;
    expect(n).toBeGreaterThan(0);
    const r2 = await sincronizarIndice(a, "t1");
    expect(r2.status === "indexada" && r2.rodadas[0].trechosNovos).toBe(0);
    expect(a.linhas.length).toBe(n);
  });

  it("pedido feito durante a indexação gera mais uma rodada (com o conteúdo novo)", async () => {
    const a = new ArmazemFalso();
    a.aoCarregar = () => {
      if (a.carregamentos === 1) {
        a.texto = "Conteúdo alterado durante a indexação: disjuntores e sobrecarga em circuitos.";
        void a.solicitar();
      }
    };
    const r = await sincronizarIndice(a, "t1");
    expect(r.status === "indexada" && r.rodadas.length).toBe(2);
    expect(a.linhas.every((l) => l.texto.includes("alterado"))).toBe(true);
  });

  it("com outra execução em andamento, só deixa o pedido na fila", async () => {
    const a = new ArmazemFalso();
    a.estado = { status: "indexando", indexando_desde: Date.now() };
    expect(await sincronizarIndice(a, "t1")).toEqual({ status: "na_fila" });
    expect(a.estado.solicitado_em).toBeTruthy();
    expect(a.carregamentos).toBe(0);
  });

  it("trava expirada (processo morreu) é retomada", async () => {
    const a = new ArmazemFalso();
    a.estado = { status: "indexando", indexando_desde: Date.now() - 11 * 60_000 };
    expect((await sincronizarIndice(a, "t1")).status).toBe("indexada");
  });

  it("erro grava status e solta a trava", async () => {
    const a = new ArmazemFalso();
    a.falhar = true;
    await expect(sincronizarIndice(a, "t1")).rejects.toThrow("falha simulada");
    expect(a.estado.status).toBe("erro");
    expect(a.estado.indexando_desde).toBeNull();
    a.falhar = false;
    expect((await sincronizarIndice(a, "t1")).status).toBe("indexada");
  });

  it("flag TUTOR_HABILITADO", () => {
    vi.stubEnv("TUTOR_HABILITADO", "");
    expect(tutorHabilitado()).toBe(false);
    vi.stubEnv("TUTOR_HABILITADO", "true");
    expect(tutorHabilitado()).toBe(true);
  });
});
