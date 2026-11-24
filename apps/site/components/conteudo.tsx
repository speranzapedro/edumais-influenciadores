import { DEMO, type DemoApp } from "@/conteudo/demos";
import { INFLUENCIADORES } from "@/conteudo/influenciadores";
import type { Conteudo } from "@/conteudo/tipos";

/** Texto da landing (um público só: criadores de conteúdo). */
export const useConteudo = (): Conteudo => INFLUENCIADORES;
/** Trilha e aula de exemplo (telas reais do app e a aula jogável). */
export const useDemo = (): DemoApp => DEMO;
