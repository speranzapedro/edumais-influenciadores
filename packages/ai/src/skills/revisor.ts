import type { Etapa } from "@edu/core";
import type { PerfilCriadorIA } from "./base";

const RUBRICAS: Record<Etapa, string> = {
  // A visão geral é revisada pelo professor (não passa pelo revisor); a rubrica existe só por completude.
  visao: `
- aderencia: objetivo geral e competências servem ao objetivo da trilha, ficam dentro do recorte e contemplam os conteúdos para complementar.
- clareza: competências observáveis, com verbo no infinitivo, sem sobreposição.`,
  ementa: `
- fidelidade: a ementa reflete o material, sem inventar nem omitir conteúdo relevante dentro do recorte. Tópicos dos conteúdos para complementar podem vir de fora do material (sem fonte) e não contam como invenção.
- cobertura: todo o conteúdo de aprendizagem do material dentro do recorte definido pelo professor (bloco "SOBRE ESTA TRILHA"; sem recorte, o material inteiro) está em algum tópico, os conteúdos para complementar também entraram, e nada além disso entrou.
- aderencia: a ementa serve ao objetivo da trilha informado pelo professor (sem objetivo informado, avalie a coerência entre o objetivo geral e os módulos).
- granularidade: tópicos ensináveis em 1 a 3 microaulas, sem sobreposição.
- progressao: módulos e tópicos em ordem de pré-requisito.
- competencias: toda competência da visão geral é desenvolvida por tópicos adequados, e os vínculos tópico → competência fazem sentido.
- clareza: descrições específicas (dizem o que será aprendido).`,
  cards: `
- fidelidade: conteúdo correto e coerente com o material (verifique números, fórmulas, normas e passos). Cards de conteúdos para complementar não têm material de apoio: avalie se estão tecnicamente corretos e prudentes.
- atomicidade: um conceito por card, sem duplicações entre cards.
- cobertura: os cards de cada tópico cumprem tudo o que a descrição do tópico promete.
- clareza: linguagem adequada ao público informado pela instituição, termos técnicos explicados, sem presumir idade ou modalidade de ensino.
- exemplos: exemplos concretos, do trabalho ou do cotidiano, que realmente ilustram o conceito.`,
  aulas: `
- correcao: nenhuma afirmação, resposta de desafio ou gabarito incorreto (confira contra o material e os cards).
- desafios: nenhum desafio se responde apontando uma frase da explicação ou reconhecendo palavras dela (nem só do último bloco: considere a explicação inteira); aponte cada um com gravidade "media" e sugira um caso novo, uma comparação entre conceitos da explicação ou uma previsão; quizzes sem ambiguidade e com distratores plausíveis; lacunas inequívocas com distratores do mesmo tipo; sequências de ordenar únicas e justificáveis; perguntas abertas realistas com gabarito preciso (critérios verificáveis, essenciais bem marcados, alertas críticos pertinentes); tipo de desafio adequado ao conteúdo e variado ao longo da trilha.
- feedback: feedbacks e explicações que ensinam (explicam o porquê) em todos os desafios.
- ritmo: explicação de 3 a 5 textos que constrói o conceito antes de qualquer desafio, com gancho no início; prática com desafios que usam a explicação inteira; no máximo 2 ciclos; blocos curtos.
- adequacao: tom e exemplos adequados ao público da instituição.`,
};

/** A rubrica mede a adequação aos seguidores do criador, não a um público escolar. */
function rubrica(etapa: Etapa) {
  return RUBRICAS[etapa]
    .replace(
      "linguagem adequada ao público informado pela instituição, termos técnicos explicados, sem presumir idade ou modalidade de ensino",
      "linguagem leve e próxima, no jeito de falar do criador, termos do tema explicados, sem tom de prova escolar",
    )
    .replace(
      "exemplos concretos, do trabalho ou do cotidiano,",
      "exemplos concretos, ligados ao cotidiano, aos estudos ou aos interesses dos seguidores do criador,",
    )
    .replace("tom e exemplos adequados ao público da instituição", "tom, exemplos e dificuldade adequados aos seguidores do criador e ao objetivo da trilha");
}

export function promptRevisor(etapa: Etapa, perfil: PerfilCriadorIA): string {
  const destino = `que ${perfil.nome}, criador de conteúdo, vende aos seguidores (${perfil.publico})`;
  return `
Você é um revisor pedagógico sênior. Avalie o rascunho da etapa "${etapa}" de uma trilha de microaulas ${destino}, comparando-o com os materiais do professor (fornecidos como documentos).

Critérios (nota de 1 a 5 cada; 5 = pronto para publicar, 3 = aceitável com ajustes, 1 = precisa refazer):${rubrica(etapa)}

Regras:
- Seja específico e acionável: cada problema aponta o id do item (ex.: T4, C12, A3, B27), descreve o problema e sugere a correção concreta.
- Gravidade "alta" = erro factual, resposta de desafio errada/ambígua, gabarito impreciso, conteúdo importante faltando; "media" = prejudica o aprendizado; "baixa" = polimento.
- Liste no máximo 12 problemas, os mais importantes primeiro. Não invente problemas para preencher a lista.
- A nota geral é sua avaliação holística (1 a 5, pode ter uma casa decimal).
- Aponte até 3 pontos fortes.
- Escreva em português do Brasil.
`.trim();
}
