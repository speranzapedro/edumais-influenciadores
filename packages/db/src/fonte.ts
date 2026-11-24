import { db, ok, todas } from "./client";

/**
 * Materiais de uma trilha lidos do Postgres — implementa (estruturalmente) a interface
 * FonteMateriais do motor agêntico. A busca usa full-text search em português.
 */
export class FonteMateriaisDb {
  constructor(private trilhaId: string) {}

  async listar() {
    const r = ok(
      await db().from("materiais").select("id, nome, mime, paginas").eq("trilha_id", this.trilhaId).eq("status", "pronto").order("created_at"),
      "materiais",
    );
    return r.map((m) => ({ id: m.id, nome: m.nome, mime: m.mime, paginas: m.paginas ?? 0 }));
  }

  async todasPaginas() {
    return todas(
      (de, ate) =>
        db().from("material_trechos").select("material_id, pagina, texto").eq("trilha_id", this.trilhaId).order("material_id").order("pagina").range(de, ate),
      "trechos",
    );
  }

  async lerPaginas(materialId: string, inicio: number, fim: number) {
    return ok(
      await db()
        .from("material_trechos")
        .select("material_id, pagina, texto")
        .eq("trilha_id", this.trilhaId)
        .eq("material_id", materialId)
        .gte("pagina", inicio)
        .lte("pagina", fim)
        .order("pagina"),
      "lerPaginas",
    );
  }

  async buscar(consulta: string, limite: number) {
    const tentar = async (q: string) => ok(await db().rpc("buscar_trechos", { p_trilha: this.trilhaId, p_consulta: q, p_limite: limite }), "buscar_trechos");
    let r = await tentar(consulta);
    // Sem resultados exigindo todos os termos: relaxa para "qualquer termo".
    if (r.length === 0 && !/\bOR\b/i.test(consulta)) {
      const termos = consulta.split(/\s+/).filter((t) => t.length > 2);
      if (termos.length > 1) r = await tentar(termos.join(" OR "));
    }
    return r.map((t) => ({ material_id: t.material_id, material_nome: t.material_nome, pagina: t.pagina, trecho: t.trecho }));
  }
}
