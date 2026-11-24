import { createAvatar, type StyleOptions } from "@dicebear/core";
import * as notionists from "@dicebear/notionists";

type Opcoes = StyleOptions<notionists.Options>;

/**
 * Personagens da landing no estilo DiceBear "notionists" (o mesmo do Avatar do app).
 * As opções fixam gesto, óculos e estampa para cada um contar uma história.
 */
export const PERSONAGENS = {
  joao: {
    seed: "joaozinho",
    hair: ["variant01"],
    glasses: ["variant11"],
    glassesProbability: 100,
    bodyIcon: ["saturn"],
    bodyIconProbability: 100,
    gesture: ["handPhone"],
    gestureProbability: 100,
    beardProbability: 0,
  },
  ana: {
    seed: "profa-ana",
    hair: ["variant28"],
    glasses: ["variant08"],
    glassesProbability: 100,
    gesture: ["pointLongArm"],
    gestureProbability: 100,
    beardProbability: 0,
  },
  lia: { seed: "lia-turma-b", hair: ["variant46"], glassesProbability: 0, gesture: ["waveLongArm"], gestureProbability: 100, beardProbability: 0 },
  caio: {
    seed: "caio-eletro",
    hair: ["variant50"],
    glassesProbability: 0,
    gesture: ["ok"],
    gestureProbability: 100,
    bodyIcon: ["electric"],
    bodyIconProbability: 100,
    beardProbability: 0,
  },
  bia: { seed: "bia-mec", hair: ["variant39"], glassesProbability: 0, gestureProbability: 0, beardProbability: 0 },
  rafa: {
    seed: "rafa-info",
    hair: ["variant33"],
    glasses: ["variant08"],
    glassesProbability: 100,
    gestureProbability: 0,
    bodyIcon: ["galaxy"],
    bodyIconProbability: 100,
    beardProbability: 0,
  },
  duda: { seed: "duda-adm", hair: ["variant41"], glassesProbability: 0, gesture: ["hand"], gestureProbability: 100, beardProbability: 0 },
  marta: {
    seed: "marta-gestao",
    hair: ["variant58"],
    glasses: ["variant11"],
    glassesProbability: 100,
    gesture: ["okLongArm"],
    gestureProbability: 100,
    beardProbability: 0,
  },
  leo: { seed: "leo-quimica", hair: ["variant20"], glassesProbability: 0, gestureProbability: 0, beardProbability: 0 },
  nina: { seed: "nina-design", hair: ["variant59"], glassesProbability: 0, gesture: ["waveLongArms"], gestureProbability: 100, beardProbability: 0 },
  mae: { seed: "mae-claudia", hair: ["variant23"], glassesProbability: 0, gesture: ["hand"], gestureProbability: 100, beardProbability: 0 },
  paulo: {
    seed: "prof-paulo",
    hair: ["variant05"],
    glasses: ["variant11"],
    glassesProbability: 100,
    beard: ["variant03"],
    beardProbability: 100,
    gesture: ["point"],
    gestureProbability: 100,
  },
  rui: {
    seed: "diretor-rui",
    hair: ["variant60"],
    glasses: ["variant11"],
    glassesProbability: 100,
    beard: ["variant08"],
    beardProbability: 100,
    gesture: ["okLongArm"],
    gestureProbability: 100,
  },
} satisfies Record<string, Opcoes>;

export type Personagem = keyof typeof PERSONAGENS;

export function ehPersonagem(id: string): id is Personagem {
  return id in PERSONAGENS;
}

export function avatarSvg(id: Personagem) {
  return createAvatar(notionists, PERSONAGENS[id]).toString();
}
