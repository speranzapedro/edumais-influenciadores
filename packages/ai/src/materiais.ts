import type Anthropic from "@anthropic-ai/sdk";
import { normalizar } from "@edu/core";

export interface MaterialInfo {
  id: string;
  nome: string;
  mime: string;
  paginas: number;
}

export interface Pagina {
  material_id: string;
  pagina: number;
  texto: string;
}

export interface TrechoEncontrado {
  material_id: string;
  material_nome: string;
  pagina: number;
  trecho: string;
}

/** Acesso aos materiais de uma trilha. Implementado sobre o Postgres (app) ou em memória (evals). */
export interface FonteMateriais {
  listar(): Promise<MaterialInfo[]>;
  buscar(consulta: string, limite: number): Promise<TrechoEncontrado[]>;
  lerPaginas(materialId: string, inicio: number, fim: number): Promise<Pagina[]>;
  todasPaginas(): Promise<Pagina[]>;
}

/** Acima deste volume os materiais não vão inteiros no prompt: o agente navega por busca. */
export const LIMITE_CARACTERES_CONTEXTO = 400_000;

const STOP = new Set("a o as os de da do das dos e é em no na nos nas um uma uns umas para por com sem que se ao à às como mais ou ser são foi".split(" "));

export class FonteEmMemoria implements FonteMateriais {
  constructor(
    private materiais: MaterialInfo[],
    private paginas: Pagina[],
  ) {}

  async listar() {
    return this.materiais;
  }

  async todasPaginas() {
    return this.paginas;
  }

  async lerPaginas(materialId: string, inicio: number, fim: number) {
    return this.paginas.filter((p) => p.material_id === materialId && p.pagina >= inicio && p.pagina <= fim);
  }

  async buscar(consulta: string, limite: number): Promise<TrechoEncontrado[]> {
    const termos = normalizar(consulta.replace(/\bOR\b/g, " "))
      .split(" ")
      .filter((t) => t.length > 2 && !STOP.has(t));
    if (termos.length === 0) return [];
    const nomes = new Map(this.materiais.map((m) => [m.id, m.nome]));
    return this.paginas
      .map((p) => {
        const n = normalizar(p.texto);
        const score = termos.reduce((s, t) => s + (n.split(t).length - 1), 0);
        return { p, n, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limite)
      .map(({ p, n }) => {
        const pos = Math.max(0, n.indexOf(termos.find((t) => n.includes(t))!) - 150);
        return {
          material_id: p.material_id,
          material_nome: nomes.get(p.material_id) ?? p.material_id,
          pagina: p.pagina,
          trecho: p.texto
            .slice(pos, pos + 420)
            .replace(/\s+/g, " ")
            .trim(),
        };
      });
  }
}

/**
 * Bloco de conteúdo com os materiais para o prefixo cacheado do prompt.
 * Cada material vira um `document` com marcadores de página, para o agente citar fontes.
 */
export async function blocosDeMateriais(
  fonte: FonteMateriais,
  limite = LIMITE_CARACTERES_CONTEXTO,
): Promise<{
  blocos: Anthropic.Beta.BetaContentBlockParam[];
  modoBusca: boolean;
}> {
  const materiais = await fonte.listar();
  const paginas = await fonte.todasPaginas();
  const total = paginas.reduce((s, p) => s + p.texto.length, 0);
  const modoBusca = total > limite;

  const blocos: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const m of materiais) {
    const dele = paginas.filter((p) => p.material_id === m.id).sort((a, b) => a.pagina - b.pagina);
    const corpo = modoBusca
      ? dele.map((p) => `[[página ${p.pagina}]] ${p.texto.slice(0, 220).replace(/\s+/g, " ")}…`).join("\n")
      : dele.map((p) => `[[página ${p.pagina}]]\n${p.texto.trim()}`).join("\n\n");
    blocos.push({
      type: "document",
      source: { type: "text", media_type: "text/plain", data: corpo || "(material sem texto extraível)" },
      title: m.nome,
      context: `material_id: ${m.id} · ${m.paginas} página(s)${modoBusca ? " · prévia — use as tools para ler o conteúdo completo" : ""}`,
    });
  }
  return { blocos, modoBusca };
}
