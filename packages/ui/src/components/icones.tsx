import {
  BookOpen,
  Brain,
  Briefcase,
  Calculator,
  CalendarCheck,
  Code2,
  Compass,
  Cpu,
  Crown,
  Flag,
  Flame,
  FlaskConical,
  Footprints,
  Gem,
  Globe,
  HardHat,
  Landmark,
  Languages,
  Leaf,
  type LucideIcon,
  Mountain,
  Music,
  Palette,
  PenLine,
  Rocket,
  Shield,
  Star,
  Target,
  Trophy,
  Wrench,
  Zap,
} from "lucide-react";
import type { Tom } from "./base";

const ICONES: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  briefcase: Briefcase,
  calculator: Calculator,
  "calendar-check": CalendarCheck,
  code: Code2,
  compass: Compass,
  cpu: Cpu,
  crown: Crown,
  flag: Flag,
  flask: FlaskConical,
  globe: Globe,
  brain: Brain,
  landmark: Landmark,
  languages: Languages,
  music: Music,
  palette: Palette,
  pen: PenLine,
  flame: Flame,
  footprints: Footprints,
  gem: Gem,
  "hard-hat": HardHat,
  leaf: Leaf,
  mountain: Mountain,
  rocket: Rocket,
  shield: Shield,
  star: Star,
  target: Target,
  trophy: Trophy,
  wrench: Wrench,
  zap: Zap,
};

export const ICONES_TRILHA = ["zap", "code", "briefcase", "shield", "wrench", "cpu", "calculator", "leaf", "hard-hat", "book-open"];
/** Ícones para trilhas de qualquer disciplina (professor particular). */
export const ICONES_DISCIPLINAS = ["book-open", "landmark", "globe", "languages", "music", "palette", "flask", "leaf", "calculator", "code", "brain", "pen"];
export const CORES: Tom[] = ["lilas", "azul", "laranja", "verde", "rosa", "ambar"];

export function Icone({ nome, className }: { nome: string; className?: string }) {
  const C = ICONES[nome] ?? BookOpen;
  return <C className={className} />;
}

/** Converte a cor salva no banco (ex.: "violet", "azul") em um tom do design system. */
export function tomDe(cor: string | null | undefined): Tom {
  const mapa: Record<string, Tom> = {
    violet: "lilas",
    lilas: "lilas",
    azul: "azul",
    blue: "azul",
    laranja: "laranja",
    orange: "laranja",
    verde: "verde",
    green: "verde",
    rosa: "rosa",
    pink: "rosa",
    ambar: "ambar",
    amber: "ambar",
  };
  return mapa[cor ?? ""] ?? "lilas";
}

export const HEX_TOM: Record<Tom, { forte: string; fundo: string }> = {
  lilas: { forte: "#7c5cf0", fundo: "#efeafe" },
  azul: { forte: "#3b82f6", fundo: "#e3eeff" },
  laranja: { forte: "#f59324", fundo: "#fff0dd" },
  verde: { forte: "#1fb768", fundo: "#ddf6e8" },
  rosa: { forte: "#e8478f", fundo: "#fde6f1" },
  ambar: { forte: "#e7a300", fundo: "#fff4d1" },
  vermelho: { forte: "#ef4444", fundo: "#fee6e6" },
  neutro: { forte: "#8b8aa6", fundo: "#f5f5fb" },
};
