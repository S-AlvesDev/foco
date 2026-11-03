import {
  BookOpen,
  CalendarClock,
  ChartColumn,
  CalendarDays,
  HeartHandshake,
  History,
  LayoutGrid,
  NotebookPen,
  NotebookText,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; short?: string };
export type NavGroup = { label: string; items: NavItem[] };

/**
 * Só entram aqui módulos já construídos: nenhum item leva a uma tela vazia.
 * Cada etapa adiciona os seus.
 */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/painel", label: "Painel", icon: LayoutGrid },
  { href: "/sessoes", label: "Sessões", icon: History },
  { href: "/materias", label: "Matérias", icon: BookOpen },
  { href: "/revisoes", label: "Revisões", icon: CalendarClock },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/anotacoes", label: "Anotações", icon: NotebookPen },
  { href: "/diario", label: "Diário", icon: NotebookText },
  { href: "/desempenho", label: "Desempenho", icon: ChartColumn },
  { href: "/jornada", label: "Nossa Jornada", icon: HeartHandshake },
];

/** Na barra inferior do celular: os dois primeiros, o botão +, Matérias e "Mais". */
export const TAB_BAR_PRIMARY = ["/painel", "/sessoes", "/materias"];

export const SETTINGS_NAV: NavItem = {
  href: "/configuracoes",
  label: "Configurações",
  short: "Ajustes",
  icon: Settings,
};

/** Grupos da sidebar no desktop. */
export const NAV_GROUPS: NavGroup[] = [
  { label: "Estudo", items: PRIMARY_NAV.slice(0, 6) },
  { label: "Registros", items: PRIMARY_NAV.slice(6, 8) },
  { label: "Análise", items: PRIMARY_NAV.slice(8) },
];
