import { addDays, daysBetween } from "@/lib/dates";
import { shortDate } from "@/lib/format";

export const REVIEW_PRESETS = [
  { days: 1, label: "Amanhã" },
  { days: 7, label: "Em 7 dias" },
  { days: 30, label: "Em 30 dias" },
] as const;

export type ReviewStatus = "pending" | "done" | "skipped";

export type Review = {
  id: string;
  subject_id: string;
  topic: string;
  note_id: string | null;
  session_id: string | null;
  previous_review_id: string | null;
  due_date: string;
  interval_days: number | null;
  status: ReviewStatus;
  completed_at: string | null;
  comment: string | null;
};

export const REVIEW_COLUMNS =
  "id, subject_id, topic, note_id, session_id, previous_review_id, due_date, interval_days, status, completed_at, comment";

/** "Atrasada há 3 dias", "Hoje", "Amanhã", "Em 5 dias" ou a data. */
export function dueLabel(due: string, today: string) {
  const diff = daysBetween(today, due);
  if (diff < -1) return `Atrasada há ${-diff} dias`;
  if (diff === -1) return "Atrasada desde ontem";
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff < 7) return `Em ${diff} dias`;
  return shortDate(due, today);
}

export type ReviewGroup = "overdue" | "today" | "week" | "later";

export function reviewGroup(due: string, today: string): ReviewGroup {
  const diff = daysBetween(today, due);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "week";
  return "later";
}

export const GROUP_TITLE: Record<ReviewGroup, string> = {
  overdue: "Atrasadas",
  today: "Para hoje",
  week: "Próximos 7 dias",
  later: "Mais adiante",
};

/** Próximo intervalo sugerido ao concluir: 1 → 7 → 30 → 60 → 120 dias. */
export function suggestedNextInterval(previous: number | null) {
  if (!previous || previous < 7) return 7;
  if (previous < 30) return 30;
  if (previous < 60) return 60;
  return 120;
}

export const presetDate = (today: string, days: number) => addDays(today, days);

/** "4 nov.", "4 nov. e 10 nov." ou "4 nov., 10 nov. e 3 dez." */
export function listDates(dates: string[], today: string) {
  const parts = [...dates].sort().map((d) => shortDate(d, today));
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}
