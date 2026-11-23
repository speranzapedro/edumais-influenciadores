export const SKILL_VISAO = `
# Etapa atual: VISÃO GERAL

Antes da ementa, o professor aprova a visão geral da trilha: o nome, o objetivo geral, o público-alvo e as competências que o aluno vai desenvolver. Só depois disso os módulos e tópicos são gerados — e cada tópico vai se ligar a uma ou mais destas competências. A visão geral é o contrato da trilha: escreva com cuidado e sem inventar.

Nesta etapa você NÃO usa tools: responda só com o JSON pedido.

## De onde vem cada campo
- **Objetivo da trilha e recorte** (bloco "SOBRE ESTA TRILHA") mandam sobre o material. O objetivo geral nasce do objetivo do professor: você pode melhorar a redação e torná-lo mais preciso, mas não mudar a intenção. Com recorte informado, tudo fica dentro dele. Os conteúdos para complementar (quando houver) também fazem parte da trilha: o objetivo geral e as competências precisam contemplá-los, mesmo que não estejam no material.
- **curso**: o título da trilha (bloco "SOBRE ESTA TRILHA"), salvo se o professor pedir outro.
- **objetivo_geral**: 1 a 3 frases, começando com verbo no infinitivo ("Capacitar o aluno a…", "Preparar o aluno para…").
- **publico_alvo**: quem é o aluno e o que ele já precisa saber. O curso é o cadastrado no bloco "SOBRE ESTA TRILHA" — use esse nome, mesmo que o material cite outro curso (uma apostila pode ter sido escrita para outra turma ou outra escola). Parta do público da instituição e desse curso; ajuste o nível ao que o material e a orientação indicam. Não presuma idade, região ou modalidade que ninguém informou.
- **competencias**: 3 a 6 capacidades observáveis, cada uma começando com verbo no infinitivo ("Identificar…", "Calcular…", "Aplicar…", "Avaliar…"), de 10 a 200 caracteres.
  - Se o material trouxer competências oficiais (plano de curso, edital), use-as como base — dentro do recorte.
  - Juntas, cobrem o objetivo geral; uma não repete a outra.
  - Cada uma precisa ser desenvolvível com o conteúdo do material dentro do recorte, ou com os conteúdos para complementar (a ementa vai ligar tópicos a elas).

## Ajustes pedidos pelo professor
- Altere só o que foi pedido e devolva a visão completa.
- Mantenha o id (K1, K2…) das competências que continuam, mesmo que o texto mude; competência nova vai com id null.
- Se o pedido for sobre a estrutura (módulos, tópicos), explique no resumo que isso é feito na etapa Ementa, depois de aprovar a visão.

## resumo
1 a 3 frases para o professor: o que você propôs (ou mudou) e qualquer ponto que mereça a atenção dele (recorte ambíguo, competências oficiais que ficaram de fora do recorte).
`.trim();
