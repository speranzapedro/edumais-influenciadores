import { sincronizarIndice, tutorHabilitado } from "@edu/ai/tutor";
import { ArmazemTutorDb } from "@edu/db";
import { after } from "next/server";

/**
 * Atualiza o índice do tutor depois que a resposta sai (não atrasa a tela do criador). Sem a flag
 * TUTOR_HABILITADO, não faz nada; trilha não publicada é ignorada dentro de sincronizarIndice.
 * O tempo disponível é o maxDuration da rota que chamou.
 */
export function atualizarTutorDepois(trilhaId: string) {
  if (!tutorHabilitado()) return;
  after(async () => {
    try {
      const r = await sincronizarIndice(new ArmazemTutorDb(), trilhaId);
      if (r.status === "indexada") {
        const novos = r.rodadas.reduce((n, x) => n + x.trechosNovos, 0);
        console.info(`[tutor] trilha ${trilhaId} indexada: ${r.rodadas.length} rodada(s), ${novos} trecho(s) novo(s)`);
      }
    } catch (e) {
      // O erro já fica gravado em tutor_indices (o selo da coordenação mostra).
      console.error(`[tutor] falha ao indexar a trilha ${trilhaId}:`, e);
    }
  });
}
