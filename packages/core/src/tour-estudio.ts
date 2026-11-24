/** Marcador em `users.tour_estudio` de quem já viu (ou pulou) o tour de exemplo do estúdio. */
export const TOUR_ESTUDIO_VISTO = "demo";

/** Telas do estúdio por onde o tour passa (na ordem do fluxo). */
export type TelaEstudio = "materiais" | "visao" | "ementa" | "cards" | "aulas" | "publicar";

/** Balão do tour: abre a tela `etapa` e destaca o elemento com `data-tour="<alvo>"` (sem alvo, centralizado). */
export interface PassoTourEstudio {
  etapa: TelaEstudio;
  alvo: string;
  titulo: string;
  texto: string;
}

/**
 * Tour de exemplo: percorre uma trilha pronta com um passo por etapa, antes de o criador fazer a
 * primeira trilha. Abre antes da primeira "Nova trilha" e pelo botão "Guia" do estúdio.
 */
export const TOUR_ESTUDIO: PassoTourEstudio[] = [
  {
    etapa: "materiais",
    alvo: "estudio-passos",
    titulo: "Conheça o estúdio de criação",
    texto:
      "Veja uma trilha pronta, de exemplo. Ela nasce em seis etapas: em cada uma, o Edu, nossa IA, propõe o conteúdo e você revisa e aprova antes de seguir. Nada chega aos seus assinantes sem a sua aprovação.",
  },
  {
    etapa: "materiais",
    alvo: "materiais-orientacao",
    titulo: "1. Materiais",
    texto:
      "Você envia o que já produz (roteiros, transcrições de vídeos, posts, e-books, anotações) e diz ao Edu em que parte focar, o que deixar de fora e o que complementar. Ele lê tudo e indica de onde tirou cada conteúdo.",
  },
  {
    etapa: "visao",
    alvo: "visao-cartao",
    titulo: "2. Visão geral",
    texto:
      "O Edu propõe o objetivo, o público-alvo e as competências (K1, K2…): o que o aluno vai saber fazer ao fim da trilha. Tudo o que vem depois segue esta visão, e qualquer texto pode ser editado com um clique.",
  },
  {
    etapa: "visao",
    alvo: "estudio-edu",
    titulo: "O Edu trabalha com você",
    texto: "Por este chat você pede ajustes em linguagem natural, em qualquer etapa. O 💬 ao lado de cada item comenta só sobre ele.",
  },
  {
    etapa: "ementa",
    alvo: "estudio-modulo",
    titulo: "3. Ementa",
    texto:
      "A trilha se organiza em módulos (M) e tópicos (T). Você abre cada módulo, confere e marca como revisado: os próximos passos só são gerados com todos os módulos revisados.",
  },
  {
    etapa: "cards",
    alvo: "cards-cobertura",
    titulo: "4. Cards de Conhecimento",
    texto:
      "Cada card (C1, C2…) é um conceito pequeno, com pontos-chave e um exemplo. Juntos, cobrem 100% da Ementa. Aqui você também revisa módulo a módulo, edita e exclui cards.",
  },
  {
    etapa: "aulas",
    alvo: "aulas-preview",
    titulo: "5. Aulas",
    texto:
      "Cada aula junta alguns cards em textos curtos e desafios (quiz, completar, ordenar e pergunta aberta). Ao lado, uma simulação para revisar; no app, o aluno vê um bloco por vez.",
  },
  {
    etapa: "publicar",
    alvo: "publicar-painel",
    titulo: "6. Publicar",
    texto:
      'Com tudo aprovado, você publica a trilha no seu produto, com um recado seu, e ela aparece para todos os seus assinantes. Agora é a sua vez! Para rever este tour, use o botão "Guia" no topo do estúdio.',
  },
];
