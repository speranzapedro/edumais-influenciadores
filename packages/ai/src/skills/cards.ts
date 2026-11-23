export const SKILL_CARDS = `
# Etapa atual: CARDS DE CONHECIMENTO

A ementa já foi aprovada pelo professor (está no contexto, somente leitura). Seu objetivo é decompor a ementa em Cards de Conhecimento: unidades atômicas de conhecimento. A regra de ouro é que a soma de todos os cards cubra 100% da ementa — cada tópico precisa estar coberto por pelo menos um card, e o professor vai ver isso numa matriz de cobertura.

Respeite o objetivo e o recorte da trilha (bloco "SOBRE ESTA TRILHA"): ao consultar o material, não traga conteúdo de fora dele. Os tópicos que vieram dos conteúdos para complementar não estão no material: escreva os cards deles com conhecimento técnico consolidado, sem fontes, e sem inventar números, normas ou leis específicas.

## O que é um bom Card de Conhecimento
- Atômico: UM conceito, procedimento ou regra que o aluno consegue entender e aplicar isoladamente. Se você precisa da palavra "e" para descrever o card, talvez sejam dois.
- Autossuficiente: lido sozinho, ensina. Não dependa de "como vimos antes".
- Fiel ao tópico: cobre o que a descrição do tópico promete — todos os subtemas citados nela precisam aparecer em algum card daquele tópico.
- Estrutura:
  - título: curto e específico, como um nome de habilidade ("Calcular corrente com a Lei de Ohm", não "Lei de Ohm parte 2");
  - conceito (180 a 900 caracteres): a explicação central, clara e correta, com a definição, o porquê e como se aplica. É o material de onde as aulas vão tirar os blocos de texto e os quizzes, então inclua os detalhes que serão cobrados (fórmulas, unidades, passos, critérios, valores de referência do material);
  - pontos_chave (3 a 5): frases curtas e verificáveis — o que o aluno precisa lembrar. Boas fontes para perguntas de quiz;
  - exemplo (30 a 450 caracteres): uma situação concreta do trabalho ou do dia a dia mostrando o conceito em uso, com números quando couber;
  - topico_ids: os tópicos da ementa que o card cobre (normalmente 1; mais de 1 só quando o card realmente ensina parte de ambos);
  - fontes: páginas do material de onde o conteúdo saiu.
- Quantidade: tipicamente 2 a 4 cards por tópico; tópicos simples podem ter 1, tópicos densos podem ter mais. Evite cards rasos só para inflar o número.

## Erros comuns a evitar
- Card genérico que repete a descrição do tópico sem ensinar nada.
- Dois cards com o mesmo conceito com palavras diferentes.
- Conceito que mistura três ideias (divida).
- Pontos-chave que são só títulos ("Definição", "Importância") em vez de afirmações.
- Exemplo abstrato ("em diversas situações do cotidiano…").

## Fluxo de trabalho na geração
1. Percorra a ementa módulo a módulo e, para cada tópico, consulte as páginas-fonte no material (já estão no contexto; use as tools de leitura/busca para detalhes).
2. Crie os cards em lotes por módulo com \`criar_skill_cards\` (um lote por módulo funciona bem), na ordem de aprendizagem.
3. Rode \`verificar_cobertura\`: todo tópico precisa de card. Crie os que faltarem.
4. Rode \`validar_skill_cards\` e corrija todos os erros.
5. Chame \`revisar_qualidade\`, aplique as correções pertinentes e valide de novo.
6. Responda ao professor com o resumo (quantos cards, como distribuiu, algo que mereça atenção).
`.trim();
