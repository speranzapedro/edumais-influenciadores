import { type Bloco, BlocoSchema, EmentaSchema } from "@edu/core";
import { db, ok, todas } from "./client";
import type { Database, Json } from "./database.types";

/**
 * Índice do tutor no Postgres — implementa (estruturalmente) as interfaces ArmazemTutor e
 * ConsultorTutor de @edu/ai/tutor. O conteúdo indexado é o da trilha publicada: materiais prontos,
 * skill cards e aulas ativas (o gabarito é filtrado na montagem dos trechos, em @edu/ai).
 */

type LinhaTrechoDb = Database["public"]["Tables"]["tutor_trechos"]["Insert"];
type EstadoIndiceDb = Omit<Database["public"]["Tables"]["tutor_indices"]["Insert"], "trilha_id">;

export class ArmazemTutorDb {
  async carregarConteudo(trilhaId: string) {
    const trilha = ok(await db().from("trilhas").select("titulo, descricao, ementa").eq("id", trilhaId).single(), "trilha");
    const ementa = trilha.ementa ? EmentaSchema.safeParse(trilha.ementa) : null;

    const materiais = ok(await db().from("materiais").select("id, nome").eq("trilha_id", trilhaId).eq("status", "pronto").order("id"), "materiais");
    const paginas = await todas(
      (de, ate) =>
        db().from("material_trechos").select("material_id, pagina, texto").eq("trilha_id", trilhaId).order("material_id").order("pagina").range(de, ate),
      "páginas",
    );

    const cards = ok(
      await db().from("skill_cards").select("id, titulo, conceito, pontos_chave, exemplo, topico_ids").eq("trilha_id", trilhaId).order("ordem"),
      "cards",
    );

    const aulas = ok(
      await db()
        .from("aulas")
        .select("id, ordem, modulo_id, modulo_titulo, titulo, objetivo")
        .eq("trilha_id", trilhaId)
        .is("arquivada_em", null)
        .order("ordem"),
      "aulas",
    );
    const blocos = aulas.length
      ? await todas(
          (de, ate) =>
            db()
              .from("aula_blocos")
              .select("aula_id, ordem, conteudo")
              .in(
                "aula_id",
                aulas.map((a) => a.id),
              )
              .order("aula_id")
              .order("ordem")
              .range(de, ate),
          "blocos",
        )
      : [];
    const blocosPorAula = new Map<string, Bloco[]>();
    for (const b of blocos) {
      const r = BlocoSchema.safeParse(b.conteudo);
      if (!r.success) continue;
      if (!blocosPorAula.has(b.aula_id)) blocosPorAula.set(b.aula_id, []);
      blocosPorAula.get(b.aula_id)!.push(r.data);
    }

    return {
      titulo: trilha.titulo,
      descricao: trilha.descricao,
      ementa: ementa?.success ? ementa.data : null,
      materiais: materiais.map((m) => ({
        id: m.id,
        nome: m.nome,
        paginas: paginas.filter((p) => p.material_id === m.id).map((p) => ({ pagina: p.pagina, texto: p.texto })),
      })),
      aulas: aulas.map((a) => ({ ...a, blocos: blocosPorAula.get(a.id) ?? [] })),
      cards: cards.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        conceito: c.conceito,
        pontos_chave: Array.isArray(c.pontos_chave) ? c.pontos_chave.map(String) : [],
        exemplo: c.exemplo,
        topico_ids: c.topico_ids,
      })),
    };
  }

  private async hashes(trilhaId: string, soComEmbedding: boolean) {
    const linhas = await todas((de, ate) => {
      let q = db().from("tutor_trechos").select("secao_hash").eq("trilha_id", trilhaId);
      if (soComEmbedding) q = q.not("embedding", "is", null);
      return q.order("id").range(de, ate);
    }, "hashes");
    return new Set(linhas.map((l) => l.secao_hash));
  }

  hashesIndexados(trilhaId: string) {
    return this.hashes(trilhaId, true);
  }

  hashesTodos(trilhaId: string) {
    return this.hashes(trilhaId, false);
  }

  async removerSecoes(trilhaId: string, hashes: string[]) {
    let removidos = 0;
    for (let i = 0; i < hashes.length; i += 50) {
      const r = await db()
        .from("tutor_trechos")
        .delete({ count: "exact" })
        .eq("trilha_id", trilhaId)
        .in("secao_hash", hashes.slice(i, i + 50));
      if (r.error) throw new Error(`[db] remover seções: ${r.error.message}`);
      removidos += r.count ?? 0;
    }
    return removidos;
  }

  async inserirTrechos(trilhaId: string, linhas: Omit<LinhaTrechoDb, "trilha_id">[]) {
    // ~8 KB por linha (vetor em texto): lotes de 100 ficam bem abaixo do limite do PostgREST.
    for (let i = 0; i < linhas.length; i += 100) {
      ok(
        await db()
          .from("tutor_trechos")
          .insert(linhas.slice(i, i + 100).map((l) => ({ ...l, trilha_id: trilhaId }))),
        "inserir trechos",
      );
    }
  }

  async removerSecoesExceto(trilhaId: string, manter: string[]) {
    const ficar = new Set(manter);
    return this.removerSecoes(
      trilhaId,
      [...(await this.hashesTodos(trilhaId))].filter((h) => !ficar.has(h)),
    );
  }

  async marcarIndice(trilhaId: string, estado: EstadoIndiceDb) {
    ok(
      await db()
        .from("tutor_indices")
        .upsert({ trilha_id: trilhaId, ...estado, updated_at: new Date().toISOString() }),
      "estado do índice",
    );
  }

  // ───────── Sugestões de perguntas do Edu (implementa ArmazemSugestoes de @edu/ai/tutor) ─────────

  async hashSugestoes(trilhaId: string) {
    return (await db().from("tutor_indices").select("sugestoes_hash").eq("trilha_id", trilhaId).maybeSingle()).data?.sugestoes_hash ?? null;
  }

  async gravarSugestoes(trilhaId: string, sugestoes: { trilha: string[]; aulas: Record<string, string[]> }, hash: string) {
    ok(
      await db()
        .from("tutor_indices")
        .update({ sugestoes: sugestoes as unknown as Json, sugestoes_hash: hash, updated_at: new Date().toISOString() })
        .eq("trilha_id", trilhaId),
      "sugestões do Edu",
    );
  }

  // ───────── Trava de indexação (implementa TravaTutor de @edu/ai/tutor) ─────────

  async trilhaPublicada(trilhaId: string) {
    const t = (await db().from("trilhas").select("status").eq("id", trilhaId).maybeSingle()).data;
    return t?.status === "publicada";
  }

  async solicitar(trilhaId: string) {
    const agora = new Date().toISOString();
    // Cria a linha se não existir (sem sobrescrever o estado de uma existente) e marca o pedido.
    ok(await db().from("tutor_indices").upsert({ trilha_id: trilhaId }, { onConflict: "trilha_id", ignoreDuplicates: true }), "índice");
    ok(await db().from("tutor_indices").update({ solicitado_em: agora, updated_at: agora }).eq("trilha_id", trilhaId), "solicitar indexação");
  }

  async travar(trilhaId: string, expiraMs: number) {
    const agora = new Date();
    const limite = new Date(agora.getTime() - expiraMs).toISOString();
    // Update condicional: só trava se ninguém está indexando (ou se a trava expirou). Consome o pedido.
    const r = ok(
      await db()
        .from("tutor_indices")
        .update({ status: "indexando", indexando_desde: agora.toISOString(), solicitado_em: null, erro: null, updated_at: agora.toISOString() })
        .eq("trilha_id", trilhaId)
        .or(`status.neq.indexando,indexando_desde.is.null,indexando_desde.lt.${limite}`)
        .select("trilha_id"),
      "travar indexação",
    );
    return r.length > 0;
  }

  async pedidoPendente(trilhaId: string) {
    const r = (await db().from("tutor_indices").select("solicitado_em").eq("trilha_id", trilhaId).maybeSingle()).data;
    return !!r?.solicitado_em;
  }

  async destravar(trilhaId: string) {
    const agora = new Date().toISOString();
    ok(
      await db()
        .from("tutor_indices")
        .update({ status: "erro", erro: "Indexação interrompida.", updated_at: agora })
        .eq("trilha_id", trilhaId)
        .eq("status", "indexando"),
      "destravar",
    );
    ok(await db().from("tutor_indices").update({ indexando_desde: null }).eq("trilha_id", trilhaId), "destravar");
  }
}

export class ConsultorTutorDb {
  async buscar(p: { trilhaId: string; consulta: string; embedding: string | null; limite: number; modo: "hibrida" | "lexica" | "semantica" }) {
    return ok(
      await db().rpc("tutor_buscar", { p_trilha: p.trilhaId, p_consulta: p.consulta, p_embedding: p.embedding, p_limite: p.limite, p_modo: p.modo }),
      "tutor_buscar",
    );
  }
}

/** O que o motor de resposta precisa da trilha: título e mapa (null se ainda não indexada). */
export async function contextoTutor(trilhaId: string) {
  const t = ok(await db().from("trilhas").select("id, titulo").eq("id", trilhaId).single(), "trilha");
  const i = (await db().from("tutor_indices").select("mapa").eq("trilha_id", trilhaId).maybeSingle()).data;
  return i?.mapa ? { id: t.id, titulo: t.titulo, mapa: i.mapa } : null;
}

/** Grava uma troca (pergunta + resposta) do tutor, com os trechos usados e o custo, para auditoria e painel. */
export async function registrarTrocaTutor(p: {
  trilhaId: string;
  userId: string;
  conversaId: string;
  pergunta: string;
  resposta: string;
  detalhes: { consulta: string; trechos: unknown; citacoes: unknown; confiancaBaixa: boolean; conhecimentoGeral?: boolean; recusada: boolean };
  uso: { modelo: string; custo_usd: number; ms: unknown; tokens: unknown };
}) {
  const base = { trilha_id: p.trilhaId, user_id: p.userId, conversa_id: p.conversaId };
  const agora = Date.now();
  ok(
    await db()
      .from("tutor_mensagens")
      .insert([
        { ...base, role: "user", texto: p.pergunta, created_at: new Date(agora).toISOString() },
        { ...base, role: "assistant", created_at: new Date(agora + 1).toISOString(), texto: p.resposta, trechos: p.detalhes as Json, uso: p.uso as Json },
      ]),
    "registrar troca do tutor",
  );
}

/** Últimas trocas da conversa, da mais antiga para a mais nova (para montar o histórico). */
export async function historicoTutor(conversaId: string, limite = 6) {
  const msgs = ok(
    await db()
      .from("tutor_mensagens")
      .select("role, texto, created_at")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: false })
      .limit(limite * 2),
    "histórico do tutor",
  ).reverse();
  const trocas: { pergunta: string; resposta: string }[] = [];
  for (let i = 0; i + 1 < msgs.length; i++) {
    if (msgs[i].role === "user" && msgs[i + 1].role === "assistant") {
      trocas.push({ pergunta: msgs[i].texto, resposta: msgs[i + 1].texto });
      i++;
    }
  }
  return trocas;
}

/** Liga/desliga o Edu para os alunos desta trilha (o índice continua sendo atualizado). */
export async function definirEduAtivo(trilhaId: string, ativo: boolean) {
  ok(await db().from("trilhas").update({ tutor_ativo: ativo, updated_at: new Date().toISOString() }).eq("id", trilhaId), "Edu ativo na trilha");
}

export async function estadoIndiceTutor(trilhaId: string) {
  return (await db().from("tutor_indices").select("*").eq("trilha_id", trilhaId).maybeSingle()).data;
}
