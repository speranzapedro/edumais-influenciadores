import type { Bloco, BlocoCompletar, BlocoCorrigivel, BlocoOrdenar, BlocoQuiz, BlocoTexto } from "./conteudo";
import { normalizar } from "./validacao";

/**
 * Regras do player de aula com correção no servidor: o aluno recebe os blocos sem gabarito e cada
 * resposta é corrigida e registrada pelo servidor. A conclusão é apurada a partir dessas respostas.
 * A pergunta aberta é formativa: recebe feedback da IA e não entra em acertos/total.
 */

export interface BlocoQuizAluno {
  id: string;
  tipo: "quiz";
  pergunta: string;
  opcoes: { texto: string }[];
}
export interface BlocoCompletarAluno {
  id: string;
  tipo: "completar";
  /** Texto com marcadores [[1]], [[2]]… */
  texto: string;
  nLacunas: number;
  /** Respostas + distratores, embaralhados de forma determinística pelo id do bloco. */
  opcoes: string[];
}
export interface BlocoOrdenarAluno {
  id: string;
  tipo: "ordenar";
  instrucao: string;
  /** Passos embaralhados (nunca já na ordem correta). */
  passos: string[];
}
export interface BlocoAbertaAluno {
  id: string;
  tipo: "aberta";
  pergunta: string;
  dica: string | null;
}
export type BlocoAluno = BlocoTexto | BlocoQuizAluno | BlocoCompletarAluno | BlocoOrdenarAluno | BlocoAbertaAluno;

// ─────────────────────────── Embaralhamento determinístico ───────────────────────────

function hash32(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(semente: number) {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Permutação de 0..n-1 derivada da semente: `perm[i]` é o índice original do item exibido na posição i.
 * O servidor recalcula a mesma permutação na correção, então o cliente nunca recebe a ordem certa.
 * Com n ≥ 2 a permutação nunca é a identidade.
 */
export function embaralhar(n: number, semente: string): number[] {
  const perm = Array.from({ length: n }, (_, i) => i);
  const rnd = mulberry32(hash32(semente));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  if (n >= 2 && perm.every((v, i) => v === i)) perm.push(perm.shift()!);
  return perm;
}

const opcoesCompletar = (b: BlocoCompletar) => [...b.lacunas.map((l) => l.resposta), ...b.distratores];
const permCompletar = (b: BlocoCompletar) => embaralhar(opcoesCompletar(b).length, `completar:${b.id}`);
const permOrdenar = (b: BlocoOrdenar) => embaralhar(b.passos.length, `ordenar:${b.id}`);

/**
 * Nomes internos da estrutura da aula (Explicação → Prática, e os do roteiro anterior: Gancho → Conceito →
 * Checagem → Aprofundamento → Aplicação) que o Edu às vezes usa como título do bloco de texto. Para o
 * aluno, viram um rótulo que faz sentido ou somem.
 */
const ROTULOS_INTERNOS: Record<string, string | null> = {
  explicacao: null,
  pratica: null,
  gancho: "Para começar",
  conceito: null,
  checagem: null,
  aprofundamento: "Na prática",
  aplicacao: "Na prática",
  fechamento: "Resumo",
};

/** Título do bloco de texto como o aluno deve ver (nomes internos do roteiro trocados ou removidos). */
export function rotuloBlocoTexto(titulo: string | null | undefined): string | null {
  const t = (titulo ?? "").trim();
  if (!t) return null;
  const chave = t
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s\d:.!-]+$/, "")
    .trim();
  return chave in ROTULOS_INTERNOS ? ROTULOS_INTERNOS[chave] : t;
}

/** Remove gabarito e feedback antes de mandar a aula para o navegador. */
export function blocoParaAluno(b: Bloco): BlocoAluno {
  switch (b.tipo) {
    case "texto":
      return { ...b, titulo: rotuloBlocoTexto(b.titulo) };
    case "quiz":
      return { id: b.id, tipo: "quiz", pergunta: b.pergunta, opcoes: b.opcoes.map((o) => ({ texto: o.texto })) };
    case "completar": {
      const todas = opcoesCompletar(b);
      return { id: b.id, tipo: "completar", texto: b.texto, nLacunas: b.lacunas.length, opcoes: permCompletar(b).map((i) => todas[i]) };
    }
    case "ordenar":
      return { id: b.id, tipo: "ordenar", instrucao: b.instrucao, passos: permOrdenar(b).map((i) => b.passos[i]) };
    case "aberta":
      return { id: b.id, tipo: "aberta", pergunta: b.pergunta, dica: b.dica };
  }
}

// ─────────────────────────── Correção ───────────────────────────

export interface CorrecaoQuiz {
  tipo: "quiz";
  correta: boolean;
  feedback: string;
  indiceCorreto: number;
}
export interface CorrecaoCompletar {
  tipo: "completar";
  correta: boolean;
  porLacuna: boolean[];
  respostasCorretas: string[];
  feedback: string;
}
export interface CorrecaoOrdenar {
  tipo: "ordenar";
  correta: boolean;
  /** Para cada posição exibida pelo aluno, se o passo está no lugar certo. */
  posicoesCertas: boolean[];
  ordemCorreta: string[];
  feedback: string;
}
export type CorrecaoDesafio = CorrecaoQuiz | CorrecaoCompletar | CorrecaoOrdenar;

/** Resposta do aluno a um desafio corrigível (índices referem-se ao que o aluno viu). */
export type RespostaDesafio = { tipo: "quiz"; opcao: number } | { tipo: "completar"; escolhas: number[] } | { tipo: "ordenar"; ordem: number[] };

const inteiroEm = (v: number, n: number) => Number.isInteger(v) && v >= 0 && v < n;

export function corrigirQuiz(b: BlocoQuiz, opcao: number): CorrecaoQuiz {
  if (!inteiroEm(opcao, b.opcoes.length)) throw new Error("Opção inválida.");
  const escolhida = b.opcoes[opcao];
  return { tipo: "quiz", correta: escolhida.correta, feedback: escolhida.feedback, indiceCorreto: b.opcoes.findIndex((o) => o.correta) };
}

/** `escolhas[k]` = índice (na lista exibida) da opção colocada na lacuna k. */
export function corrigirCompletar(b: BlocoCompletar, escolhas: number[]): CorrecaoCompletar {
  const exibidas = permCompletar(b).map((i) => opcoesCompletar(b)[i]);
  if (escolhas.length !== b.lacunas.length || !escolhas.every((e) => inteiroEm(e, exibidas.length)) || new Set(escolhas).size !== escolhas.length) {
    throw new Error("Resposta inválida.");
  }
  const porLacuna = b.lacunas.map((l, k) => normalizar(exibidas[escolhas[k]]) === normalizar(l.resposta));
  return { tipo: "completar", correta: porLacuna.every(Boolean), porLacuna, respostasCorretas: b.lacunas.map((l) => l.resposta), feedback: b.explicacao };
}

/** `ordem[k]` = índice (na lista exibida) do passo que o aluno colocou na posição k. */
export function corrigirOrdenar(b: BlocoOrdenar, ordem: number[]): CorrecaoOrdenar {
  const perm = permOrdenar(b);
  const n = b.passos.length;
  if (ordem.length !== n || !ordem.every((o) => inteiroEm(o, n)) || new Set(ordem).size !== n) throw new Error("Resposta inválida.");
  const posicoesCertas = ordem.map((o, k) => normalizar(b.passos[perm[o]]) === normalizar(b.passos[k]));
  return { tipo: "ordenar", correta: posicoesCertas.every(Boolean), posicoesCertas, ordemCorreta: b.passos, feedback: b.explicacao };
}

export function corrigirDesafio(b: BlocoCorrigivel, r: RespostaDesafio): CorrecaoDesafio {
  if (b.tipo !== r.tipo) throw new Error("Resposta incompatível com o desafio.");
  if (b.tipo === "quiz" && r.tipo === "quiz") return corrigirQuiz(b, r.opcao);
  if (b.tipo === "completar" && r.tipo === "completar") return corrigirCompletar(b, r.escolhas);
  if (b.tipo === "ordenar" && r.tipo === "ordenar") return corrigirOrdenar(b, r.ordem);
  throw new Error("Resposta incompatível com o desafio.");
}

/** Apura acertos de uma tentativa; `completa` só quando todos os desafios corrigíveis foram respondidos. */
export function apurarTentativa(desafioIds: string[], respostas: { bloco_id: string; correta: boolean }[]) {
  const porBloco = new Map(respostas.map((r) => [r.bloco_id, r.correta]));
  const respondidas = desafioIds.filter((id) => porBloco.has(id));
  return {
    total: desafioIds.length,
    acertos: respondidas.filter((id) => porBloco.get(id)).length,
    completa: respondidas.length === desafioIds.length,
  };
}
