import { addDays, addMonths, monthStartOf, weekStartOf } from "@/lib/dates";
import { formatDuration, plural } from "@/lib/format";
import type { StatRow } from "@/features/dashboard/aggregate";

export type GoalPeriod = "daily" | "weekly" | "monthly";
export type GoalMetric = "minutes" | "sessions" | "questions";

export type Goal = {
  id: string;
  subject_id: string | null;
  period: GoalPeriod;
  metric: GoalMetric;
  target: number;
};

export const PERIOD_LABEL: Record<GoalPeriod, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
};
export const PERIOD_WINDOW_LABEL: Record<GoalPeriod, string> = {
  daily: "Hoje",
  weekly: "Esta semana",
  monthly: "Este mês",
};
export const METRIC_LABEL: Record<GoalMetric, string> = {
  minutes: "Horas de estudo",
  sessions: "Sessões",
  questions: "Questões resolvidas",
};

/** Janela atual da meta, em datas locais. */
export function goalWindow(period: GoalPeriod, today: string, weekStartsOn: number) {
  if (period === "daily") return { from: today, to: today };
  if (period === "weekly") {
    const from = weekStartOf(today, weekStartsOn);
    return { from, to: addDays(from, 6) };
  }
  const from = monthStartOf(today);
  return { from, to: addDays(addMonths(from, 1), -1) };
}

/** Início do intervalo que cobre todas as janelas atuais (uma consulta só). */
export function goalsRangeStart(today: string, weekStartsOn: number) {
  return [weekStartOf(today, weekStartsOn), monthStartOf(today)].sort()[0];
}

export type GoalProgress = Goal & {
  from: string;
  to: string;
  /** Minutos, sessões ou questões já feitos na janela. */
  value: number;
  ratio: number;
  done: boolean;
};

export function goalProgress(goal: Goal, rows: StatRow[], today: string, weekStartsOn: number): GoalProgress {
  const { from, to } = goalWindow(goal.period, today, weekStartsOn);
  let value = 0;
  for (const r of rows) {
    if (r.day < from || r.day > to) continue;
    if (goal.subject_id && r.subject_id !== goal.subject_id) continue;
    value +=
      goal.metric === "minutes" ? r.seconds / 60 : goal.metric === "sessions" ? r.sessions : r.questions;
  }
  value = goal.metric === "minutes" ? Math.floor(value) : value;
  const ratio = goal.target > 0 ? value / goal.target : 0;
  return { ...goal, from, to, value, ratio, done: value >= goal.target };
}

/** "Estudar 2h", "Fazer 5 sessões", "Resolver 100 questões". */
export function goalTitle(goal: Pick<Goal, "metric" | "target">) {
  if (goal.metric === "minutes") return `Estudar ${formatDuration(goal.target * 60)}`;
  if (goal.metric === "sessions") return `Fazer ${plural(goal.target, "sessão", "sessões")}`;
  return `Resolver ${plural(goal.target, "questão", "questões")}`;
}

/** "1h 20min de 2h" */
export function goalAmount(g: Pick<GoalProgress, "metric" | "target" | "value">) {
  if (g.metric === "minutes") return `${formatDuration(g.value * 60)} de ${formatDuration(g.target * 60)}`;
  return `${g.value.toLocaleString("pt-BR")} de ${g.target.toLocaleString("pt-BR")}`;
}

/** Ordem de exibição: diária, semanal, mensal; gerais antes das por matéria. */
export function sortGoals<T extends Goal>(goals: T[], subjectOrder: string[]) {
  const p = { daily: 0, weekly: 1, monthly: 2 };
  const m = { minutes: 0, sessions: 1, questions: 2 };
  const s = (id: string | null) => (id === null ? -1 : subjectOrder.indexOf(id));
  return [...goals].sort(
    (a, b) => p[a.period] - p[b.period] || s(a.subject_id) - s(b.subject_id) || m[a.metric] - m[b.metric],
  );
}
