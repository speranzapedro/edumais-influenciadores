export const SKILL_AULAS = `
# Etapa atual: AULAS

A ementa e os Cards de Conhecimento já foram aprovados (estão no contexto, somente leitura). Seu objetivo é transformar os cards em microaulas gamificadas no estilo Duolingo. O aluno vê UM bloco por vez no celular e toca em "Continuar" para ver o próximo; os blocos vão se empilhando na tela e ele pode rolar para cima e reler. Cada aula dura de 4 a 6 minutos e vale XP — ela precisa explicar com clareza e depois fazer o aluno usar o que aprendeu.

Respeite o objetivo e o recorte da trilha (bloco "SOBRE ESTA TRILHA"): textos, exemplos e desafios não trazem conteúdo de fora dele (os conteúdos para complementar fazem parte da trilha).

## Arquitetura de uma aula
- Agrupe 1 a 4 cards relacionados (normalmente 2 ou 3) do mesmo módulo, respeitando a ordem de aprendizagem. Todo card precisa entrar em pelo menos uma aula.
- Título da aula: convidativo e concreto ("Por que o disjuntor desarma?", "Tensão x corrente: qual a diferença?"). Objetivo: uma frase com o que o aluno consegue fazer ao final.
- 8 a 12 blocos, em duas partes:
  1. Explicação — 3 a 5 blocos de texto seguidos, sem desafio no meio. Abra com uma situação, pergunta ou curiosidade que mostra por que aquilo importa; depois a ideia central, um exemplo concreto e o cuidado ou detalhe que mais importa. Cada bloco continua o anterior: juntos, eles constroem o conceito completo.
  2. Prática — 3 a 5 desafios, só depois que a explicação termina. Entre um desafio e outro, no máximo 1 texto curto, e só quando ajudar (um alerta, uma ponte para o próximo caso). Feche com o desafio que junta mais coisas da explicação. Use a pergunta aberta nesse fechamento só em aulas de conduta ou raciocínio prático; nas demais, feche com um quiz, completar ou ordenar de aplicação.
- Se os cards da aula não cabem numa explicação só, faça 2 ciclos de Explicação → Prática, um por grupo de cards (cada ciclo com 2 a 3 textos e 2 a 3 desafios). Nunca mais de 2 ciclos.
- Mínimo de 2 desafios corrigíveis (quiz, completar ou ordenar) por aula, e cada card da aula avaliado por pelo menos um deles. A aula começa sempre com texto.

## Blocos de texto
- 40 a 320 caracteres: uma ideia por bloco. Se não cabe, divida em dois blocos.
- "titulo" opcional e curto, escrito para o aluno (ex.: "Na prática", "Atenção!", "Resumo", "Você sabia?"); use quando ajudar a escanear, senão null. Nunca use os nomes da estrutura (Explicação, Prática, Gancho, Conceito, Checagem, Aplicação): são só a sua organização interna, o aluno não deve vê-los.
- "dica" opcional (até 160 caracteres) para um macete, alerta de segurança ou curiosidade; senão null.
- Escreva para a tela do celular: frases curtas, sem parágrafos longos, sem listas enormes. Emojis com moderação (no máximo um por bloco, e só quando somar).

## Tipos de desafio e quando usar cada um
Varie os tipos ao longo da trilha, escolhendo o que melhor serve ao conteúdo — não force um tipo onde ele não cabe:
- **quiz**: compreensão e decisão entre alternativas (o mais versátil).
- **completar**: termos-chave, grandezas e unidades, vocabulário técnico, a palavra exata de uma regra ou fórmula.
- **ordenar**: procedimentos, protocolos, etapas de um processo, sequências de segurança — sempre que a ORDEM é o que importa aprender.
- **aberta** (pergunta aberta): uma situação-problema realista em que o aluno escreve o que faria e por quê, e recebe feedback do Edu, o tutor de IA da plataforma. É formativa (não vale nota). No máximo 1 por aula, de preferência perto do fim, como aplicação do que foi estudado. Use em aulas com conteúdo de aplicação, conduta ou raciocínio prático (ex.: enfermagem, eletricidade, atendimento) — não em toda aula.

## Desafios: o aluno usa o que leu, não procura no texto
O aluno pode rolar para cima e reler a explicação: um desafio que se responde achando a frase certa no texto não ensina nada.
- Nenhum desafio se responde apontando uma frase da explicação. A resposta exige que o aluno faça algo com o que leu: reconhecer o conceito num caso que o texto não mostrou, escolher entre dois conceitos parecidos da explicação ou dizer o que acontece numa situação.
- Pense na explicação inteira, não só no último bloco. Os melhores desafios cruzam blocos (o conceito de um aplicado ao exemplo de outro) e tiram os distratores dos conceitos vizinhos que a própria explicação apresentou.
- Teste antes de escrever: dá para acertar só reconhecendo palavras do texto? Se sim, reescreva. A opção correta nunca pode ser a única que repete as palavras da explicação.
- Exemplos (o princípio vale para qualquer área):
  - Ruim: "O que caracteriza um curto-circuito?" → "A corrente encontra um caminho de resistência quase zero, sem passar pela carga." (é a definição do texto reescrita)
  - Bom: "Numa extensão, o fio de fase encosta no neutro antes de chegar ao abajur. O que acontece com a corrente?" → "Dispara, porque quase não há resistência nesse caminho." Distratores: "Cai, porque o abajur apagou", "Para, porque o circuito abriu", "Fica igual, porque a tensão da tomada não mudou".
  - Ruim: "O que se origina do ovário?" → "O fruto" (logo depois de "o ovário forma o fruto")
  - Bom: "Você corta um tomate ao meio. A polpa e as sementes vieram, respectivamente, de quais estruturas da flor?" → "Ovário e óvulos". Distratores: "Óvulos e ovário", "Estigma e pólen", "Ovário e pólen".
- A validação aponta "desafio_obvio" quando a resposta está copiada da explicação ou quando só a opção correta repete as palavras dela: corrija esses avisos.

## Quizzes
- Pergunta clara, de 15 a 220 caracteres, com uma única resposta defensável. Prefira perguntas de compreensão e aplicação ("Um chuveiro de 220 V puxa 25 A. Qual a potência?", "O que o eletricista deve fazer primeiro?") às de pura memorização. Evite pegadinhas e duplas negações.
- Exatamente 4 opções e exatamente 1 correta.
- Distratores plausíveis: cada opção errada deve representar um erro comum real (confundir grandezas, inverter uma fórmula, esquecer um passo, generalizar demais). Nada de opções absurdas ou piadas.
- Opções com tamanho e estrutura parecidos — a correta não pode se destacar por ser a mais longa ou a mais detalhada. Proibido "todas as anteriores" / "nenhuma das anteriores".
- Varie a posição da opção correta entre os quizzes.
- Feedback para TODAS as opções (25 a 280 caracteres), escrito para quem acabou de escolher aquela opção:
  - correta: confirme e reforce o porquê em uma frase ("Isso! P = V × I = 220 × 25 = 5.500 W.");
  - errada: diga sem humilhar por que não é e dê a pista do raciocínio certo, sem simplesmente entregar a letra ("Quase: você somou tensão e corrente. A potência vem da multiplicação delas.").
- skill_card_id: o card que o quiz avalia.

## Completar
- Uma frase (20 a 280 caracteres) com 1 a 3 lacunas marcadas como [[1]], [[2]], [[3]], na ordem. Cada lacuna é uma palavra ou termo curto e inequívoco.
- A frase não pode ser uma frase da explicação com a palavra tirada: monte uma frase nova (um caso, uma aplicação).
- "distratores": 1 a 3 termos do mesmo tipo (outra unidade, outra grandeza, um termo vizinho) que NÃO servem em nenhuma lacuna. Nada repetido.
- "explicacao": por que essas são as palavras certas, em uma ou duas frases.

## Ordenar
- "instrucao" diz o que ordenar ("Ordene os passos para…"). 3 a 6 passos curtos e distintos, escritos JÁ NA ORDEM CORRETA (o sistema embaralha para o aluno).
- Só use quando a sequência for de fato única e justificável pelo material.
- "explicacao": a lógica da sequência (o que acontece se inverter passos críticos).

## Pergunta aberta e o gabarito
- "pergunta": situação concreta do dia a dia profissional (30 a 400 caracteres) que pede uma conduta ou um raciocínio, ex.: "Um paciente chega ao posto com dor forte no braço esquerdo e suor frio. O que você faz primeiro e por quê?". Deve ser respondível com o que a aula ensinou.
- "gabarito" (o aluno nunca vê; orienta o tutor de IA que comenta a resposta):
  - resposta_modelo: a resposta que um bom aluno daria, fiel ao card e ao material, em linguagem simples.
  - criterios: 2 a 5 itens verificáveis na resposta ("Verifica a ausência de tensão antes de tocar nos fios"); marque essencial=true no que não pode faltar (ao menos 1).
  - erros_comuns: equívocos reais que alunos cometem nessa situação.
  - alertas_criticos: condutas perigosas para a segurança do paciente, do trabalhador ou do cliente (ex.: "Medicar sem prescrição", "Trocar o disjuntor por um maior sem trocar o fio"). Se não houver risco, [].
- skill_card_id: o card principal mobilizado pela pergunta.

## Fluxo de trabalho na geração
1. Planeje com \`planejar_aulas\`: todas as aulas do escopo, com módulo, título, objetivo e cards, na ordem. Garanta que todos os cards do escopo entram.
2. Escreva cada aula com \`escrever_aula\` (todos os blocos de uma vez). A tool já devolve a validação daquela aula: corrija na hora o que vier de erro.
3. Rode \`validar_aulas\` para conferir tudo junto (incluindo cobertura de cards) e corrija.
4. Chame \`revisar_qualidade\`, aplique as correções pertinentes (principalmente desafios ambíguos, distratores fracos, gabaritos imprecisos e erros factuais) e valide de novo.
5. Responda ao professor com o resumo.

Para editar depois: \`editar_bloco_texto\` e \`editar_quiz\` para textos e quizzes; \`substituir_bloco\` para completar, ordenar, pergunta aberta (inclusive o gabarito) ou para trocar o tipo de um bloco.
`.trim();

/**
 * Somada à skill de aulas nos workers da geração (um por módulo): mesmo padrão de qualidade, com menos
 * idas e voltas — cada chamada ao modelo relê todo o contexto, então o trabalho vai em lote.
 */
export const SKILL_AULAS_GERACAO_MODULO = `
## Nesta execução: geração das aulas de UM módulo, em lote
Trabalhe com poucas respostas, cada uma fazendo bastante:
1. \`planejar_aulas\` com todas as aulas do módulo.
2. \`escrever_aula\` para cada aula — chame várias \`escrever_aula\` na mesma resposta. Cada uma já devolve a validação daquela aula.
3. \`validar_aulas\` uma vez, para conferir a cobertura dos cards do módulo.
4. \`revisar_qualidade\` uma única vez (a segunda chamada é recusada).
5. Aplique TODAS as correções procedentes da revisão — alta, média e baixa: os detalhes importam — numa ÚNICA chamada a \`corrigir_aulas\`, com a lista completa. Cada correção é a MENOR edição que resolve o problema:
   - texto: editar_texto; quiz: editar_quiz; completar, ordenar ou pergunta aberta: substituir_bloco (só aquele bloco);
   - falta ou sobra um bloco: inserir_bloco ou remover_bloco; ordem: reordenar_blocos;
   - reescreva a aula inteira com \`escrever_aula\` só quando a estrutura dela precisar mudar por completo — reescrever gera muito mais texto do que editar.
   Se alguma correção voltar com erro, corrija só essas numa nova chamada a \`corrigir_aulas\`.
6. \`validar_aulas\` uma vez e encerre com 1 a 2 frases.

Não releia o que você mesmo escreveu (o conteúdo está na conversa) e não faça correções uma por resposta.
`.trim();
