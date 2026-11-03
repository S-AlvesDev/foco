import type { StudyType } from "@/lib/study-types";
import {
  MONTHS_SHORT,
  WEEKDAYS_SHORT,
  addDays,
  addMonths,
  daysBetween,
  monthStartOf,
  weekStartOf,
} from "@/lib/dates";

export type StatRow = {
  day: string;
  subject_id: string;
  study_type: StudyType;
  seconds: number;
  sessions: number;
  questions: number;
};

export const DASHBOARD_PERIODS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "365", label: "12 meses" },
] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]["value"];

export type Bucket = {
  key: string;
  /** Rótulo curto do eixo. */
  label: string;
  /** Rótulo completo do tooltip. */
  title: string;
  from: string;
  to: string;
  seconds: number;
  sessions: number;
  bySubject: { subjectId: string; seconds: number }[];
  /** Bucket ainda em andamento (hoje, esta semana, este mês). */
  current: boolean;
};

export type SubjectShare = { subjectId: string; seconds: number; sessions: number; share: number };

export type DashboardData = {
  today: number;
  week: number;
  month: number;
  period: {
    from: string;
    to: string;
    seconds: number;
    sessions: number;
    days: number;
    studiedDays: number;
    dailyAverage: number;
    questions: number;
  };
  bySubject: SubjectShare[];
  buckets: Bucket[];
  granularity: "day" | "week" | "month";
};

/** Primeiro dia do período (o 12 meses começa no 1º dia do mês, para meses completos). */
export function periodStart(period: DashboardPeriod, today: string, weekStartsOn: number) {
  switch (period) {
    case "7":
      return addDays(today, -6);
    case "30":
      return addDays(today, -29);
    case "90":
      return weekStartOf(addDays(today, -89), weekStartsOn);
    case "365":
      return addMonths(monthStartOf(today), -11);
  }
}

function shortDay(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

function sumBy<T>(items: T[], f: (t: T) => number) {
  return items.reduce((s, t) => s + f(t), 0);
}

export function aggregateDashboard(
  rows: StatRow[],
  opts: { today: string; weekStartsOn: number; period: DashboardPeriod },
): DashboardData {
  const { today, weekStartsOn, period } = opts;
  const weekStart = weekStartOf(today, weekStartsOn);
  const monthStart = monthStartOf(today);
  const from = periodStart(period, today, weekStartsOn);
  const inRange = (r: StatRow, a: string, b: string) => r.day >= a && r.day <= b;

  const periodRows = rows.filter((r) => inRange(r, from, today));
  const seconds = sumBy(periodRows, (r) => r.seconds);
  const days = daysBetween(from, today) + 1;
  const studied = new Set(periodRows.filter((r) => r.seconds > 0).map((r) => r.day));

  // Por matéria, maior primeiro.
  const subj = new Map<string, { seconds: number; sessions: number }>();
  for (const r of periodRows) {
    const s = subj.get(r.subject_id) ?? { seconds: 0, sessions: 0 };
    s.seconds += r.seconds;
    s.sessions += r.sessions;
    subj.set(r.subject_id, s);
  }
  const bySubject = [...subj.entries()]
    .map(([subjectId, v]) => ({ subjectId, ...v, share: seconds ? v.seconds / seconds : 0 }))
    .sort((a, b) => b.seconds - a.seconds);

  // Buckets do gráfico.
  const granularity = period === "90" ? "week" : period === "365" ? "month" : "day";
  const buckets: Bucket[] = [];
  let cursor = from;
  while (cursor <= today) {
    let end: string;
    let label: string;
    let title: string;
    if (granularity === "day") {
      end = cursor;
      const d = Number(cursor.slice(8));
      label = period === "7" ? WEEKDAYS_SHORT[new Date(cursor + "T00:00:00Z").getUTCDay()] : String(d);
      title = shortDay(cursor);
    } else if (granularity === "week") {
      end = addDays(cursor, 6);
      label = shortDay(cursor);
      title = `Semana de ${shortDay(cursor)}`;
    } else {
      end = addDays(addMonths(cursor, 1), -1);
      const m = Number(cursor.slice(5, 7));
      label = MONTHS_SHORT[m - 1];
      title = `${MONTHS_SHORT[m - 1]} ${cursor.slice(0, 4)}`;
    }
    const bRows = rows.filter((r) => inRange(r, cursor, end));
    const per = new Map<string, number>();
    for (const r of bRows) per.set(r.subject_id, (per.get(r.subject_id) ?? 0) + r.seconds);
    buckets.push({
      key: cursor,
      label,
      title,
      from: cursor,
      to: end,
      seconds: sumBy(bRows, (r) => r.seconds),
      sessions: sumBy(bRows, (r) => r.sessions),
      bySubject: [...per.entries()]
        .map(([subjectId, s]) => ({ subjectId, seconds: s }))
        .sort((a, b) => b.seconds - a.seconds),
      current: cursor <= today && today <= end,
    });
    cursor =
      granularity === "day"
        ? addDays(cursor, 1)
        : granularity === "week"
          ? addDays(cursor, 7)
          : addMonths(cursor, 1);
  }

  return {
    today: sumBy(
      rows.filter((r) => r.day === today),
      (r) => r.seconds,
    ),
    week: sumBy(
      rows.filter((r) => inRange(r, weekStart, today)),
      (r) => r.seconds,
    ),
    month: sumBy(
      rows.filter((r) => inRange(r, monthStart, today)),
      (r) => r.seconds,
    ),
    period: {
      from,
      to: today,
      seconds,
      sessions: sumBy(periodRows, (r) => r.sessions),
      days,
      studiedDays: studied.size,
      dailyAverage: seconds / days,
      questions: sumBy(periodRows, (r) => r.questions),
    },
    bySubject,
    buckets,
    granularity,
  };
}

/** Intervalo de datas que cobre período, semana e mês correntes numa única consulta. */
export function statsRange(period: DashboardPeriod, today: string, weekStartsOn: number) {
  const starts = [
    periodStart(period, today, weekStartsOn),
    weekStartOf(today, weekStartsOn),
    monthStartOf(today),
  ];
  return { from: starts.sort()[0], to: today };
}
