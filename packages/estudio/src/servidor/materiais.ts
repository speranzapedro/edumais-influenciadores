import { randomUUID } from "node:crypto";
import { extrairPaginas, tipoSuportado } from "@edu/ai/ingestao";
import { db, marcarErroMaterial, ok, registrarMaterial, salvarPaginasMaterial } from "@edu/db";
import type { ConfigRotasEstudio, Contexto } from "./config";

/** Registra o material e devolve uma URL assinada para o browser enviar o arquivo direto ao Storage. */
export function rotaMateriais<S>(cfg: ConfigRotasEstudio<S>) {
  return async function rota(req: Request, ctx: Contexto) {
    const s = await cfg.sessao();
    if (!s) return new Response("Não autorizado", { status: 401 });
    const { id: trilhaId } = await ctx.params;
    if (!(await cfg.podeAcessarTrilha(s, trilhaId))) return new Response("Trilha não encontrada", { status: 404 });
    const { nome, mime, tamanho } = (await req.json()) as { nome: string; mime: string; tamanho: number };
    if (!tipoSuportado(mime, nome)) return Response.json({ erro: "Formato não suportado. Envie PDF, DOCX, TXT ou MD." }, { status: 400 });
    if (tamanho > 40 * 1024 * 1024) return Response.json({ erro: "Arquivo acima de 40 MB." }, { status: 400 });

    const seguro = nome
      .normalize("NFD")
      .replace(/[^\w.-]+/g, "_")
      .slice(-80);
    const caminho = `${trilhaId}/${randomUUID()}-${seguro}`;
    const material = await registrarMaterial({ trilhaId, storagePath: caminho, nome, mime: mime || "application/octet-stream", tamanho });
    const { data, error } = await db().storage.from("materiais").createSignedUploadUrl(caminho);
    if (error || !data) return Response.json({ erro: error?.message ?? "Falha ao preparar upload" }, { status: 500 });
    return Response.json({ material, url: data.signedUrl });
  };
}

/** Baixa o arquivo do Storage, extrai o texto por página e indexa para a busca do agente (e do tutor). */
export function rotaProcessarMaterial<S>(cfg: ConfigRotasEstudio<S>) {
  return async function rota(req: Request, ctx: Contexto) {
    const s = await cfg.sessao();
    if (!s) return new Response("Não autorizado", { status: 401 });
    const { id: trilhaId } = await ctx.params;
    if (!(await cfg.podeAcessarTrilha(s, trilhaId))) return new Response("Trilha não encontrada", { status: 404 });
    const { materialId } = (await req.json()) as { materialId: string };
    const m = ok(await db().from("materiais").select("*").eq("id", materialId).eq("trilha_id", trilhaId).single(), "material");
    try {
      const { data, error } = await db().storage.from("materiais").download(m.storage_path);
      if (error || !data) throw new Error(error?.message ?? "arquivo não encontrado no storage");
      const paginas = await extrairPaginas(new Uint8Array(await data.arrayBuffer()), m.mime, m.nome);
      const comTexto = paginas.filter((p) => p.trim().length > 20).length;
      if (comTexto === 0) throw new Error("Não encontrei texto no arquivo (PDF escaneado?). Envie uma versão com texto selecionável.");
      await salvarPaginasMaterial(materialId, trilhaId, paginas);
      // Trilha publicada: o material novo entra no índice do tutor depois da resposta.
      cfg.aoMudarMateriais?.(trilhaId);
      return Response.json({ ok: true, paginas: paginas.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await marcarErroMaterial(materialId, msg);
      return Response.json({ erro: msg }, { status: 422 });
    }
  };
}
