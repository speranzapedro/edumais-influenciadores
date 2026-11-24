/**
 * Conteúdo da landing de criadores (o texto fica em conteudo/influenciadores.ts).
 * Listas com tamanho fixo acompanham os componentes visuais (4 etapas do loop, 7 passos, 7
 * benefícios, 6 cartas de desafio, 3 telas): a posição de cada item decide o visual dele.
 */

export type Link = { texto: string; href: string };
/** Mini-ilustração de um passo do "Como funciona". */
export type ChaveMini = "tema" | "upload" | "modulos" | "revisao" | "aulas" | "publicar" | "aluno" | "feedback";
type Par = { titulo: string; texto: string };

export interface Conteudo {
  /** Atalhos do menu para as seções da página. */
  nav: { cta: Link; ctaCurto: string; links: { href: string; rotulo: string }[] };
  hero: {
    eyebrow: string;
    /** Palavras do título; `circulo` e `destaque` são os índices rabiscados. */
    titulo: { palavras: string[]; circulo: number; destaque: number };
    subDestaque: string;
    sub: string;
    ctaPrimario: Link;
    ctaSecundario: Link;
    /** Três selos abaixo dos CTAs (só no desktop); sem eles, a linha some. */
    selos?: [string, string, string];
    /** Sticker da direita (na escola, o ranking). */
    sticker: { rotulo: string; valor: string };
    /** Nome sob o avatar de quem ensina na ilustração (padrão: "Profa. Ana"). */
    autor?: string;
    /** Telas do app na ilustração padrão da hero (a de criadores tem ilustração própria). */
    telas?: {
      /** Terceiro indicador da home do app (escola: posição na turma). */
      indicador: { valor: string; rotulo: string };
      trilha: string;
      modulo: string;
      aula: string;
      trilhas: { t: string; p: number }[];
      leitura: { titulo: string; destaque: string; legenda: string; dica: string };
      /** A alternativa certa é sempre a terceira (é onde o "dedo" toca). */
      quiz: { pergunta: string; opcoes: [string, string, string, string]; explicacao: string };
      festa: string;
    };
  };
  /** Faixa de temas que correm na tela (só na /influenciadores). */
  temas?: { eyebrow: string; linhaA: string[]; linhaB: string[] };
  /** Parceria 70/30 com simulador de receita (só na /influenciadores). */
  parceria?: {
    eyebrow: string;
    tituloA: string;
    tituloB: string;
    texto: string;
    /** A divisão da receita: criador primeiro, Edu+ depois. */
    divisao: [{ rotulo: string; pct: number; texto: string }, { rotulo: string; pct: number; texto: string }];
    link: Link;
    simulador: { titulo: string; preco: string; vendas: string; total: string; suaParte: string; parteEdu: string; nota: string };
  };
  /** Seções próprias da landing de criadores (rota /influenciadores). */
  criador?: {
    /** Três benefícios para o criador, cada um num cartão com mini-animação. */
    porQue: {
      eyebrow: string;
      tituloA: string;
      tituloB: string;
      texto: string;
      receita: { titulo: string; texto: string; seguidores: string; alunos: string; vendas: string; crescimento: string; bolso: string };
      qualidade: { titulo: string; texto: string; ebook: string; ebookDetalhe: string; curso: string; cursoDetalhe: string; xp: string };
      comunidade: {
        titulo: string;
        texto: string;
        ranking: string;
        linhas: [{ nome: string; xp: number }, { nome: string; xp: number }, { nome: string; xp: number }];
        ofensiva: string;
        xp: string;
      };
    };
    /** Quem faz o quê na parceria: criador e Edu+. */
    responsabilidades: {
      eyebrow: string;
      tituloA: string;
      tituloB: string;
      texto: string;
      lados: [{ rotulo: string; itens: Par[] }, { rotulo: string; itens: Par[] }];
    };
    faq: { eyebrow: string; tituloA: string; tituloB: string; perguntas: { p: string; r: string }[]; ajuda: { titulo: string; texto: string; link: Link } };
  };
  metodologia?: {
    /** Nome de quem cria nos rótulos dos passos (padrão: "Professor"). */
    agente?: string;
    eyebrow: string;
    tituloA: string;
    tituloB: string;
    texto: string;
    passos: Par[];
    /** Mini-ilustração de cada passo, na ordem (padrão: upload, módulos, revisão, aulas, publicar, aluno, feedback). */
    visual?: ChaveMini[];
    fim: string;
    minis: {
      /** Passo "escolha o tema": títulos de trilha digitados um a um (emoji, título, rótulo curto do chip). */
      tema?: { rotulo: string; temas: [string, string, string][]; outro: string };
      upload: { zona: string; arquivo: string };
      modulos: [string, string][];
      revisao: { linhas: [string, string, string]; extra: string; balao: string };
      publicar: { trilha: string };
      /** Placar do passo do aluno: na escola, ranking da turma (com avatares). */
      placar: { linhas: [{ nome: string; xp: number }, { nome: string; xp: number }]; voce: string; posicoes: [string, string, string]; avatares: boolean };
      erros?: { titulo: string; itens: { q: string; p: number }[]; sufixo: string; postit: string };
    };
  };
  desafios: {
    eyebrow: string;
    tituloA: string;
    tituloB: string;
    cartas: { nome: string; tag: string; texto: string }[];
    demos: {
      leitura: { titulo: string; antes: string; destaque: string; meio: string; negrito: string; fim: string; dica: string };
      /** A alternativa certa é sempre a terceira. */
      quiz: { pergunta: string; opcoes: { t: string; f: string }[] };
      completar: { antes: string; meio: string; fim: string; palavras: [string, string, string]; gabarito: [string, string]; explicacao: string };
      ordenar: { pergunta: string; passos: [string, string, string, string]; explicacao: string };
      aberta: { pergunta: string; resposta: string; tutor: string };
    };
  };
  contato: {
    eyebrow: string;
    tituloA: string;
    tituloB: string;
    texto: string;
    passos: [string, string, string];
    /** Contato direto pelo WhatsApp. `numero` com DDI e DDD, só dígitos. */
    whatsapp: { titulo: string; texto: string; numero: string; mensagem: string; botao: string; rodape: string };
  };
  rodape: { tagline: string; copyright: string };
}
