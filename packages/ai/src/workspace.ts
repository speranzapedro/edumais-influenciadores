import { type AulasDraft, type CardsDraft, type Ementa, type Etapa, todosTopicos } from "@edu/core";
import type { Emissor, TipoMudanca } from "./eventos";
import type { MaterialInfo } from "./materiais";

/**
 * Estado de trabalho de uma execução do agente. Só o rascunho da etapa corrente é mutável;
 * as etapas anteriores (já aprovadas) entram como contexto somente leitura.
 */
export class Workspace {
  ementa: Ementa;
  cards: CardsDraft;
  aulas: AulasDraft;
  readonly mudancas: Record<string, TipoMudanca> = {};
  private emitirTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    readonly etapa: Etapa,
    inicial: { ementa: Ementa; cards: CardsDraft; aulas: AulasDraft },
    readonly materiais: MaterialInfo[],
    private readonly emit: Emissor,
  ) {
    this.ementa = structuredClone(inicial.ementa);
    this.cards = structuredClone(inicial.cards);
    this.aulas = structuredClone(inicial.aulas);
  }

  get materiaisIds() {
    return this.materiais.map((m) => m.id);
  }

  draft(): Ementa | CardsDraft | AulasDraft {
    return this.etapa === "ementa" ? this.ementa : this.etapa === "cards" ? this.cards : this.aulas;
  }

  marcar(id: string, tipo: TipoMudanca) {
    const antes = this.mudancas[id];
    if (antes === "adicionado" && tipo === "alterado") return;
    if (antes === "adicionado" && tipo === "removido") {
      delete this.mudancas[id];
      return;
    }
    this.mudancas[id] = tipo;
  }

  /** Emite o rascunho atualizado para a UI (agrupando mudanças muito próximas). */
  publicar() {
    if (this.emitirTimer) return;
    this.emitirTimer = setTimeout(() => {
      this.emitirTimer = null;
      this.emitirAgora();
    }, 120);
  }

  emitirAgora() {
    if (this.emitirTimer) {
      clearTimeout(this.emitirTimer);
      this.emitirTimer = null;
    }
    this.emit({ tipo: "draft", etapa: this.etapa, draft: structuredClone(this.draft()), mudancas: { ...this.mudancas } });
  }

  // ── consultas usadas pelas tools ──
  modulo(id: string) {
    return this.ementa.modulos.find((m) => m.id === id);
  }

  topico(id: string) {
    for (const m of this.ementa.modulos) {
      const i = m.topicos.findIndex((t) => t.id === id);
      if (i >= 0) return { modulo: m, indice: i, topico: m.topicos[i] };
    }
    return null;
  }

  card(id: string) {
    return this.cards.cards.find((c) => c.id === id);
  }

  aula(id: string) {
    return this.aulas.aulas.find((a) => a.id === id);
  }

  bloco(id: string) {
    for (const a of this.aulas.aulas) {
      const i = a.blocos.findIndex((b) => b.id === id);
      if (i >= 0) return { aula: a, indice: i, bloco: a.blocos[i] };
    }
    return null;
  }

  idsTopicos() {
    return todosTopicos(this.ementa).map((t) => t.id);
  }

  idsBlocos() {
    return this.aulas.aulas.flatMap((a) => a.blocos.map((b) => b.id));
  }
}
