import {
  BookOpen,
  CalendarClock,
  ChartColumn,
  CalendarDays,
  HeartHandshake,
  LibraryBig,
  History,
  LayoutGrid,
  ListChecks,
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
  { href: "/questoes", label: "Questões", icon: ListChecks },
  { href: "/biblioteca", label: "Biblioteca", icon: LibraryBig },
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

/** Na barra inferior do celular: Painel, Questões, o botão +, Sessões e "Mais". */
export const TAB_BAR_PRIMARY = ["/painel", "/questoes", "/sessoes"];

export const SETTINGS_NAV: NavItem = {
  href: "/configuracoes",
  label: "Configurações",
  short: "Ajustes",
  icon: Settings,
};

/** Grupos da sidebar no desktop. */
const pick = (...hrefs: string[]) => hrefs.map((h) => PRIMARY_NAV.find((i) => i.href === h)!);

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Estudo",
    items: pick("/painel", "/questoes", "/biblioteca", "/sessoes", "/materias", "/revisoes"),
  },
  { label: "Planejamento", items: pick("/calendario", "/metas") },
  { label: "Registros", items: pick("/anotacoes", "/diario") },
  { label: "Análise", items: pick("/desempenho", "/jornada") },
];
