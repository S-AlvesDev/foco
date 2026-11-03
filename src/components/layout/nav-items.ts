import { BookOpen, LayoutGrid, Settings, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Só entram aqui módulos já construídos: nenhum item leva a uma tela vazia.
 * Cada etapa adiciona os seus.
 */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/painel", label: "Painel", icon: LayoutGrid },
  { href: "/materias", label: "Matérias", icon: BookOpen },
];

export const SETTINGS_NAV: NavItem = { href: "/configuracoes", label: "Configurações", icon: Settings };
