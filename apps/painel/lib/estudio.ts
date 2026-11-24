import { cotaDoAgente, type EscopoCriador, exigirTrilhaDoCriador, notificar, perfilIADaTrilha } from "@edu/db";
import type { ConfigRotasEstudio } from "@edu/estudio/servidor";
import { criadorOuNulo } from "@/lib/sessao";
import { atualizarTutorDepois } from "@/lib/tutor";

/** Rotas do estúdio no painel do criador: só as trilhas do produto dele, contexto "criador" na IA, cota de IA. */
export const rotasEstudio: ConfigRotasEstudio<EscopoCriador> = {
  sessao: criadorOuNulo,
  podeAcessarTrilha: (e, trilhaId) =>
    exigirTrilhaDoCriador(e, trilhaId).then(
      () => true,
      () => false,
    ),
  perfilIA: async (_e, estudio) => {
    const r = await perfilIADaTrilha(estudio.trilha.id);
    if (!r) throw new Error("A trilha não é do seu produto.");
    return r.perfil;
  },
  antesDoAgente: (e) => cotaDoAgente(e),
  aoGerar: (e, { trilhaId, etapa, estudio }) =>
    notificar([
      {
        userId: e.usuario.id,
        tipo: "agente_ok",
        titulo: `Etapa "${etapa}" pronta para revisão`,
        corpo: estudio.trilha.titulo,
        link: `/trilhas/${trilhaId}/editar`,
      },
    ]),
  aoMudarMateriais: atualizarTutorDepois,
};
