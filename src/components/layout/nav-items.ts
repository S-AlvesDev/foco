import { BookOpen, History, LayoutGrid, Settings, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; short?: string };

/**
 * Só entram aqui módulos já construídos: nenhum item leva a uma tela vazia.
 * Cada etapa adiciona os seus.
 */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/painel", label: "Painel", icon: LayoutGrid },
  { href: "/sessoes", label: "Sessões", icon: History },
  { href: "/materias", label: "Matérias", icon: BookOpen },
];

export const SETTINGS_NAV: NavItem = {
  href: "/configuracoes",
  label: "Configurações",
  short: "Ajustes",
  icon: Settings,
};
