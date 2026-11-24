/**
 * Confere, só em tempo de compilação, que os tipos escritos à mão (src/database.types.ts) batem com os
 * gerados do banco local (`pnpm db:tipos`, que grava database.gerado.ts ao lado e roda o tsc aqui).
 * Regras por coluna: mesmo nome, mesma nulabilidade e o tipo manual cabe no gerado (o manual pode
 * estreitar `string` para uma união literal). Um erro de compilação aponta a tabela ou o enum que divergiu.
 */
import type { Database as Manual } from "../src/database.types";
import type { Database as Gerado } from "./database.gerado";

type Igual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Verdade<T extends true> = T;
type Anulavel<T> = null extends T ? true : false;

type TG = Gerado["public"]["Tables"];
type TM = Manual["public"]["Tables"];

type ColunaConfere<G, M> = Igual<Anulavel<G>, Anulavel<M>> extends true ? ([M] extends [G] ? true : false) : false;

/** Colunas que faltam, sobram ou divergem numa tabela. */
type ColunasDivergentes<G, M> = {
  [K in keyof G | keyof M]: K extends keyof G ? (K extends keyof M ? (ColunaConfere<G[K], M[K]> extends true ? never : K) : K) : K;
}[keyof G | keyof M];

/** Tabelas que faltam, sobram ou têm alguma coluna divergente. */
type TabelasDivergentes = {
  [T in keyof TG | keyof TM]: T extends keyof TG
    ? T extends keyof TM
      ? [ColunasDivergentes<TG[T]["Row"], TM[T]["Row"]>] extends [never]
        ? never
        : T
      : T
    : T;
}[keyof TG | keyof TM];

type EG = Gerado["public"]["Enums"];
type EM = Manual["public"]["Enums"];
type EnumsDivergentes = {
  [E in keyof EG | keyof EM]: E extends keyof EG ? (E extends keyof EM ? (Igual<EG[E], EM[E]> extends true ? never : E) : E) : E;
}[keyof EG | keyof EM];

type FG = Gerado["public"]["Functions"];
type FM = Manual["public"]["Functions"];
type FuncoesDivergentes = Exclude<keyof FG, keyof FM> | Exclude<keyof FM, keyof FG>;

// Se algum destes falhar, o tsc mostra o nome do que divergiu no lugar de `never`.
export type TabelasOk = Verdade<Igual<TabelasDivergentes, never>>;
export type EnumsOk = Verdade<Igual<EnumsDivergentes, never>>;
export type FuncoesOk = Verdade<Igual<FuncoesDivergentes, never>>;
