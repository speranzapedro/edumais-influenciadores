import type { Conteudo } from "./tipos";

/**
 * Landing de parceria com criadores de conteúdo (rota /influenciadores): o criador coproduz com a
 * Edu+ uma trilha gamificada para vender ao próprio público, define o preço e fica com 70% de cada
 * venda (30% ficam com a Edu+). Vale para qualquer criador com um público fiel, não só os de
 * conteúdo educativo. Sem exclusividade; a entrada é por candidatura com curadoria.
 */
export const INFLUENCIADORES: Conteudo = {
  nav: {
    cta: { texto: "Quero me candidatar", href: "#contato" },
    ctaCurto: "Candidatar",
    links: [
      { href: "#por-que", rotulo: "Por que" },
      { href: "#parceria", rotulo: "Parceria 70/30" },
      { href: "#responsabilidades", rotulo: "Quem faz o quê" },
      { href: "#como-funciona", rotulo: "Como funciona" },
      { href: "#desafios", rotulo: "O app" },
      { href: "#faq", rotulo: "Dúvidas" },
    ],
  },
  hero: {
    eyebrow: "Para criadores de conteúdo",
    titulo: { palavras: ["Transforme", "sua", "audiência", "em", "alunos."], circulo: 2, destaque: 4 },
    subDestaque: "Monetize com seu próprio curso gamificado no estilo Duolingo.",
    sub: "Seu público já acompanha você nas redes sociais, agora ele pode aprender com você todo dia, numa trilha com o seu nome e o seu jeito de falar.",
    ctaPrimario: { texto: "Criar meu curso gamificado", href: "#contato" },
    ctaSecundario: { texto: "Como funciona", href: "#como-funciona" },
    sticker: { rotulo: "Vendas hoje", valor: "+38 alunos" },
    autor: "Você",
  },
  temas: {
    eyebrow: "Para quem cria conteúdo sobre",
    linhaA: ["Fitness", "Culinária", "Finanças pessoais", "Maquiagem", "Games", "Viagem", "Tecnologia"],
    linhaB: ["História", "Ciências", "Idiomas", "Música", "Fotografia", "Empreendedorismo", "Bem-estar"],
  },
  criador: {
    porQue: {
      eyebrow: "Por que a Edu+",
      tituloA: "O seu público já existe.",
      tituloB: "Falta o produto certo para ele.",
      texto: "Uma trilha gamificada com o seu nome: um produto de que você se orgulha, mais receita e uma comunidade que volta todo dia.",
      receita: {
        titulo: "Mais receita com o público que você já tem",
        texto: "Seus seguidores já confiam em você. Parte deles vira aluno pagante, e você ganha uma renda que não depende de publi nem do algoritmo.",
        seguidores: "seguidores",
        alunos: "viraram alunos",
        vendas: "vendas da trilha",
        crescimento: "mês a mês",
        bolso: "a mais no seu bolso por mês",
      },
      qualidade: {
        titulo: "Um produto à altura do seu nome",
        texto: "Nada de e-book esquecido no drive nem de curso gravado sem fim. São microaulas no celular, com prática em cada passo e revisadas por você.",
        ebook: "e-book.pdf",
        ebookDetalhe: "143 páginas",
        curso: "curso gravado",
        cursoDetalhe: "10h de vídeo",
        xp: "+10 XP",
      },
      comunidade: {
        titulo: "Sua comunidade mais engajada",
        texto: "Seu público estuda com você todo dia, mantém a ofensiva, sobe no ranking da sua trilha e volta amanhã para a próxima aula.",
        ranking: "Ranking da sua trilha",
        linhas: [
          { nome: "Lia", xp: 320 },
          { nome: "Caio", xp: 285 },
          { nome: "Nina", xp: 240 },
        ],
        ofensiva: "dias seguidos",
        xp: "+10 XP",
      },
    },
    responsabilidades: {
      eyebrow: "Quem faz o quê",
      tituloA: "Cada lado é responsável",
      tituloB: "pela sua especialidade.",
      texto: "Você é a voz e o rosto da trilha. A gente cuida da plataforma para você criar e da experiência da sua audiência.",
      lados: [
        {
          rotulo: "Você",
          itens: [
            { titulo: "Distribuição", texto: "Divulgar a trilha para o seu público: nos seus vídeos, posts e na bio." },
            { titulo: "Conteúdo e qualidade", texto: "Revisar e aprovar cada aula e zelar pela qualidade do seu produto." },
            { titulo: "Direitos sobre o material", texto: "Enviar material que é seu, com informações corretas e sem uso indevido de imagem ou música." },
            { titulo: "Preço", texto: "Definir quanto a trilha custa, com uma faixa sugerida pela Edu+." },
          ],
        },
        {
          rotulo: "Edu+",
          itens: [
            { titulo: "Atendimento aos alunos", texto: "Responder às dúvidas de compra e de acesso de quem comprou a sua trilha." },
            { titulo: "Pagamentos", texto: "Checkout e processamento de cada venda." },
            { titulo: "Suporte e plataforma", texto: "App, estúdio, o Edu como tutor dos alunos e o nosso time na coprodução das aulas." },
            { titulo: "Dados dos alunos", texto: "Guardar e proteger os dados de quem estuda com você, conforme a LGPD." },
          ],
        },
      ],
    },
    faq: {
      eyebrow: "Dúvidas",
      tituloA: "Perguntas que todo",
      tituloB: "criador faz.",
      perguntas: [
        {
          p: "Quanto eu ganho?",
          r: "70% da receita de cada venda da sua trilha. Os outros 30% ficam com a Edu+, que cuida da coprodução, da plataforma, do processamento dos pagamentos, do atendimento e do suporte aos alunos. As condições detalhadas ficam no contrato de parceria.",
        },
        {
          p: "Meu conteúdo não é educativo. Posso participar?",
          r: "Pode. O que importa é ter um público que confia em você e algo que você saiba ensinar: um treino, uma receita, um jeito de cuidar das finanças, uma técnica de maquiagem. A gente ajuda a transformar isso numa trilha.",
        },
        { p: "Quem define o preço da trilha?", r: "Você. A gente sugere uma faixa de preço para o tema e o tamanho da trilha, e a decisão final é sua." },
        {
          p: "O conteúdo continua sendo meu?",
          r: "Sim. A parceria não tem exclusividade: você continua dono do seu conteúdo e livre para seguir com seus vídeos, publis e outros produtos.",
        },
        {
          p: "Preciso ter muitos seguidores?",
          r: "Não existe um número mínimo. A parceria começa com uma candidatura: a gente avalia o tema, o público e o encaixe com a proposta da Edu+.",
        },
        {
          p: "Quanto trabalho isso dá para mim?",
          r: "Você envia o material que já tem, revisa as aulas e divulga a trilha para o seu público. O Edu e o nosso time fazem a produção pesada: estrutura, microaulas, desafios e publicação.",
        },
        {
          p: "Preciso entender de tecnologia?",
          r: "Não. Plataforma, app no celular, pagamentos e suporte aos alunos ficam com a Edu+. Você só precisa divulgar o seu link.",
        },
        {
          p: "Como acompanho as vendas?",
          r: "No painel do criador você vê as vendas, a sua parte da receita, os alunos ativos e onde eles travam, trilha por trilha.",
        },
      ],
      ajuda: {
        titulo: "Ficou alguma dúvida?",
        texto: "Manda pra gente no WhatsApp que a gente responde.",
        link: { texto: "Falar no WhatsApp", href: "#contato" },
      },
    },
  },
  metodologia: {
    agente: "Você",
    eyebrow: "Como funciona · 7 passos",
    tituloA: "Do seu conteúdo a uma trilha no app.",
    tituloB: "Com o Edu no trabalho pesado.",
    texto:
      "O Edu, nossa Inteligência Artificial, entende o seu objetivo educacional, absorve o conteúdo enviado e transforma em trilhas no estilo Duolingo com a sua cara!",
    passos: [
      {
        titulo: "Escolha a trilha que quer criar",
        texto: "Você decide qual trilha quer criar de acordo com o seu conteúdo. Vale qualquer tema que o seu público queira aprender com você.",
      },
      { titulo: "Envie o seu material", texto: "Roteiros, transcrições dos seus vídeos, e-books ou anotações. Vale PDF, DOCX, TXT ou MD, vários de uma vez." },
      {
        titulo: "O Edu monta a visão geral e a ementa",
        texto: "O Edu, nossa IA, lê tudo, propõe o objetivo da trilha, as competências e os módulos, e mostra de onde veio cada parte do seu material.",
      },
      {
        titulo: "Você revisa com o Edu",
        texto: "Revise módulo por módulo: edite, reordene ou peça ajustes ao Edu no chat até a trilha ficar com a sua voz. Nada vai ao ar sem a sua aprovação.",
      },
      {
        titulo: "Nascem as microaulas",
        texto: "Dos Cards de Conhecimento saem aulas de 3 a 5 minutos: primeiro a explicação, depois a prática com quiz, completar, ordenar e pergunta aberta.",
      },
      { titulo: "Teste como aluno e publique", texto: "Faça cada aula como o seu aluno faria, ajuste o que precisar e publique a trilha para os seus alunos." },
      {
        titulo: "Seu público joga e aprende",
        texto: "No celular, seus alunos ganham XP, mantêm a ofensiva, sobem no ranking e tiram dúvidas com o Edu, o tutor de IA da trilha.",
      },
    ],
    visual: ["tema", "upload", "modulos", "revisao", "aulas", "publicar", "aluno"],
    fim: "e a próxima trilha começa",
    minis: {
      tema: {
        rotulo: "Nova trilha",
        temas: [
          ["💄", "A história da maquiagem", "Maquiagem"],
          ["🤔", "O básico da Filosofia", "Filosofia"],
          ["🏛️", "Entenda a política nacional", "Política"],
          ["⚽", "A origem do Futebol", "Futebol"],
        ],
        outro: "+ o seu tema",
      },
      upload: { zona: "solte seu material aqui", arquivo: "roteiros-revolucao-francesa.pdf" },
      modulos: [
        ["A França antes de 1789", "vídeo 3"],
        ["Revolução Francesa", "vídeo 7"],
        ["A era Napoleão", "vídeo 12"],
      ],
      revisao: { linhas: ["A era Napoleão", "A França antes de 1789", "Revolução Francesa"], extra: " sem decoreba", balao: "+ do jeito que eu falo no canal" },
      publicar: { trilha: "Revoluções que mudaram o mundo" },
      placar: {
        linhas: [
          { nome: "Lia", xp: 150 },
          { nome: "Caio", xp: 135 },
        ],
        voce: "Você",
        posicoes: ["1º", "2º", "3º"],
        avatares: true,
      },
    },
  },
  parceria: {
    eyebrow: "Parceria 70/30",
    tituloA: "O produto é seu,",
    tituloB: "a Edu+ entra com a tecnologia e infraestrutura para você criar.",
    texto: "Cada trilha é um produto coproduzido: a sua voz e a sua audiência, com a plataforma e tecnologia de ponta da Edu+.",
    divisao: [
      { rotulo: "Você", pct: 70, texto: "Para quem tem a voz, o público e o conteúdo." },
      { rotulo: "Edu+", pct: 30, texto: "Para a plataforma, os pagamentos, o atendimento e o suporte." },
    ],
    link: { texto: "Veja quem faz o quê", href: "#responsabilidades" },
    simulador: {
      titulo: "Simule a sua parte",
      preco: "Preço que você definir",
      vendas: "Vendas no mês",
      total: "Receita da trilha",
      suaParte: "Sua parte",
      parteEdu: "Edu+",
      nota: "Simulação ilustrativa. As condições finais ficam no contrato de parceria.",
    },
  },
  desafios: {
    eyebrow: "O que o seu público recebe",
    tituloA: "Seu público não só assiste:",
    tituloB: "ele joga e aprende.",
    cartas: [
      { nome: "Microleitura", tag: "Texto", texto: "Uma ideia por tela, no seu jeito de explicar. Seu aluno lê em segundos e já parte para a prática." },
      { nome: "Quiz", tag: "Desafio", texto: "Uma pergunta, poucas opções e um feedback na hora para cada alternativa, inclusive as erradas." },
      {
        nome: "Complete a frase",
        tag: "Completar",
        texto: "Seu aluno toca nas palavras certas para preencher as lacunas. Ótimo para fixar nomes, datas e conceitos.",
      },
      { nome: "Coloque em ordem", tag: "Ordenar", texto: "Arrastar os passos até a sequência certa. Ideal para processos, linhas do tempo e etapas." },
      {
        nome: "Pergunta aberta",
        tag: "Aberta",
        texto: "Seu aluno responde com as próprias palavras e recebe o feedback do Edu, nosso tutor de IA. É para pensar mais fundo.",
      },
      {
        nome: "Recompensas",
        tag: "Recompensa",
        texto: "Cada aula concluída vale XP, sobe o nível, mexe no ranking dos seus alunos e renova a ofensiva. É o que faz seu público voltar amanhã.",
      },
    ],
    demos: {
      leitura: {
        titulo: "O que foi o Terror?",
        antes: "O Terror foi a",
        destaque: "fase mais violenta da Revolução Francesa",
        meio: "(1793–1794), liderada por",
        negrito: "Robespierre",
        fim: ".",
        dica: "Em pouco mais de um ano, cerca de 17 mil pessoas foram executadas.",
      },
      quiz: {
        pergunta: "Quem foi coroado imperador da França em 1804?",
        opcoes: [
          { t: "Luís XVI", f: "Quase! Luís XVI foi o rei guilhotinado em 1793." },
          { t: "Robespierre", f: "Quase! Robespierre liderou o Terror e foi executado em 1794." },
          { t: "Napoleão", f: "Mandou bem! Napoleão se coroou imperador em 1804." },
          { t: "Danton", f: "Quase! Danton foi um líder revolucionário executado em 1794." },
        ],
      },
      completar: {
        antes: "Em 1789, o povo de Paris tomou a",
        meio: "e deu início à Revolução",
        fim: ".",
        palavras: ["Francesa", "Industrial", "Bastilha"],
        gabarito: ["Bastilha", "Francesa"],
        explicacao: "A Queda da Bastilha, em 14 de julho de 1789, marca o início da Revolução Francesa.",
      },
      ordenar: {
        pergunta: "Coloque em ordem as fases da revolução.",
        passos: ["Os Estados Gerais", "A queda da Bastilha", "O Terror", "O golpe de Napoleão"],
        explicacao: "1789, 1789, 1793 e 1799.",
      },
      aberta: {
        pergunta: "Por que a Revolução Francesa ainda influencia as democracias de hoje?",
        resposta: "Porque ela espalhou a ideia de que o poder vem do povo, e não do rei.",
        tutor:
          "Boa! Você chegou na soberania popular. Pense também na Declaração dos Direitos do Homem: ela inspirou constituições no mundo todo, inclusive a brasileira.",
      },
    },
  },
  contato: {
    eyebrow: "Fale com a gente",
    tituloA: "Bora criar o seu",
    tituloB: "produto juntos?",
    texto: "Chama a gente no WhatsApp e conta sobre você e o seu público. A gente responde por lá mesmo.",
    passos: ["Você chama a gente no WhatsApp", "A gente conversa sobre o tema e o seu público", "Coproduzimos e lançamos a sua primeira trilha"],
    whatsapp: {
      titulo: "Fale direto com a Edu+",
      texto: "Sem formulário: abre o WhatsApp com a mensagem pronta, é só enviar.",
      numero: "5521984600257",
      mensagem: "Olá! Quero criar meu curso gamificado com a Edu+.",
      botao: "Chamar no WhatsApp",
      rodape: "Sem número mínimo de seguidores e sem compromisso.",
    },
  },
  rodape: {
    tagline: "Cursos gamificados coproduzidos com criadores de conteúdo: o criador define o preço e fica com 70% de cada venda.",
    copyright: "Feito para quem cria nas redes.",
  },
};
