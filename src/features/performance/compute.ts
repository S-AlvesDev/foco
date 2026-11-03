import type { StatRow, Bucket } from "@/features/dashboard/aggregate";
import type { Goal } from "@/features/goals/progress";
import type { StudyType } from "@/lib/study-types";
import {
  MONTHS_LONG,
  MONTHS_SHORT,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
  addDays,
  addMonths,
  daysBetween,
  eachDay,
  monthStartOf,
  weekday,
  weekStartOf,
} from "@/lib/dates";

export const PERFORMANCE_PERIODS = [
  { value: "30", label: "30 dias", days: 30 },
  { value: "90", label: "90 dias", days: 90 },
  { value: "180", label: "6 meses", days: 182 },
  { value: "365", label: "12 meses", days: 365 },
] as const;
export type PerformancePeriod = (typeof PERFORMANCE_PERIODS)[number]["value"];

export type DailyTotal = {
  day: string;
  seconds: number;
  sessions: number;
  questions: number;
  correct: number;
};
export type BreakdownRow = {
  subject_id: string;
  study_type: StudyType;
  seconds: number;
  sessions: number;
  questions: number;
  correct: number;
};
export type MonthlyTotal = { month: string; seconds: number; sessions: number; study_days: number };

/** Período atual (termina hoje) e o anterior, do mesmo tamanho, logo antes. */
export function performanceRange(period: PerformancePeriod, today: string) {
  const days = PERFORMANCE_PERIODS.find((p) => p.value === period)!.days;
  const from = addDays(today, -(days - 1));
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  return { from, to: today, prevFrom, prevTo, days };
}

export type Summary = {
  seconds: number;
  sessions: number;
  studyDays: number;
  days: number;
  /** Média por dia do período (inclui dias sem estudo). */
  perDay: number;
  /** Média por dia estudado. */
  perStudyDay: number;
  questions: number;
  correct: number;
  /** Acerto em %, só quando há questões com acertos informados. */
  accuracy: number | null;
};

export function summarize(daily: DailyTotal[], from: string, to: string): Summary {
  const rows = daily.filter((d) => d.day >= from && d.day <= to);
  const seconds = rows.reduce((s, r) => s + r.seconds, 0);
  const sessions = rows.reduce((s, r) => s + r.sessions, 0);
  const questions = rows.reduce((s, r) => s + r.questions, 0);
  const correct = rows.reduce((s, r) => s + r.correct, 0);
  const studyDays = rows.filter((r) => r.seconds > 0).length;
  const days = daysBetween(from, to) + 1;
  return {
    seconds,
    sessions,
    studyDays,
    days,
    perDay: days ? seconds / days : 0,
    perStudyDay: studyDays ? seconds / studyDays : 0,
    questions,
    correct,
    accuracy: questions > 0 && correct > 0 ? (correct / questions) * 100 : null,
  };
}

/** Variação relativa: null quando não há base de comparação. */
export function delta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? null : 0;
  return (current - previous) / previous;
}

const emptyBucket = (key: string, label: string, title: string, from: string, to: string, current: boolean) =>
  ({ key, label, title, from, to, seconds: 0, sessions: 0, bySubject: [], current }) satisfies Bucket;

/** Horas por semana dentro do período (semanas completas, a atual por último). */
export function weeklyBuckets(
  daily: DailyTotal[],
  from: string,
  today: string,
  weekStartsOn: number,
): Bucket[] {
  const out: Bucket[] = [];
  for (let w = weekStartOf(from, weekStartsOn); w <= today; w = addDays(w, 7)) {
    const end = addDays(w, 6);
    const [, m, d] = w.split("-").map(Number);
    const [, m2, d2] = end.split("-").map(Number);
    const b = emptyBucket(
      w,
      `${d}/${m}`,
      `Semana de ${d} ${MONTHS_SHORT[m - 1]} a ${d2} ${MONTHS_SHORT[m2 - 1]}`,
      w,
      end,
      today >= w && today <= end,
    );
    for (const r of daily) {
      if (r.day >= w && r.day <= end) {
        b.seconds += r.seconds;
        b.sessions += r.sessions;
      }
    }
    out.push(b);
  }
  return out;
}

/** Horas por mês nos últimos 12 meses. */
export function monthlyBuckets(monthly: MonthlyTotal[], today: string, count = 12): Bucket[] {
  const byMonth = new Map(monthly.map((m) => [m.month.slice(0, 7), m]));
  const out: Bucket[] = [];
  const start = addMonths(monthStartOf(today), -(count - 1));
  for (let i = 0; i < count; i++) {
    const m = addMonths(start, i);
    const [y, mm] = m.split("-").map(Number);
    const row = byMonth.get(m.slice(0, 7));
    out.push({
      ...emptyBucket(
        m,
        MONTHS_SHORT[mm - 1].replace(".", ""),
        `${MONTHS_LONG[mm - 1]} de ${y}`,
        m,
        addDays(addMonths(m, 1), -1),
        i === count - 1,
      ),
      seconds: row?.seconds ?? 0,
      sessions: row?.sessions ?? 0,
    });
  }
  return out;
}

export type CumulativePoint = { month: string; label: string; title: string; seconds: number; total: number };

/** Total acumulado mês a mês, do primeiro mês com estudo até hoje. */
export function cumulative(monthly: MonthlyTotal[], today: string): CumulativePoint[] {
  if (monthly.length === 0) return [];
  const sorted = [...monthly].sort((a, b) => a.month.localeCompare(b.month));
  const byMonth = new Map(sorted.map((m) => [m.month.slice(0, 7), m.seconds]));
  const out: CumulativePoint[] = [];
  let total = 0;
  for (let m = monthStartOf(sorted[0].month); m <= monthStartOf(today); m = addMonths(m, 1)) {
    const [y, mm] = m.split("-").map(Number);
    const secs = byMonth.get(m.slice(0, 7)) ?? 0;
    total += secs;
    out.push({
      month: m,
      label: `${MONTHS_SHORT[mm - 1].replace(".", "")}${mm === 1 ? ` ${String(y).slice(2)}` : ""}`,
      title: `${MONTHS_LONG[mm - 1]} de ${y}`,
      seconds: secs,
      total,
    });
  }
  return out;
}

export type SubjectComparison = {
  subjectId: string;
  seconds: number;
  previous: number;
  sessions: number;
  share: number;
  questions: number;
  correct: number;
};

export function bySubject(current: BreakdownRow[], previous: BreakdownRow[]): SubjectComparison[] {
  const map = new Map<string, SubjectComparison>();
  const get = (id: string) => {
    let v = map.get(id);
    if (!v) {
      v = { subjectId: id, seconds: 0, previous: 0, sessions: 0, share: 0, questions: 0, correct: 0 };
      map.set(id, v);
    }
    return v;
  };
  for (const r of current) {
    const v = get(r.subject_id);
    v.seconds += r.seconds;
    v.sessions += r.sessions;
    v.questions += r.questions;
    v.correct += r.correct;
  }
  for (const r of previous) get(r.subject_id).previous += r.seconds;
  const total = [...map.values()].reduce((s, v) => s + v.seconds, 0);
  return [...map.values()]
    .map((v) => ({ ...v, share: total ? v.seconds / total : 0 }))
    .filter((v) => v.seconds > 0 || v.previous > 0)
    .sort((a, b) => b.seconds - a.seconds || b.previous - a.previous);
}

export type TypeShare = {
  type: StudyType;
  seconds: number;
  sessions: number;
  share: number;
  previousShare: number;
};

export function byType(current: BreakdownRow[], previous: BreakdownRow[]): TypeShare[] {
  const sum = (rows: BreakdownRow[]) => {
    const m = new Map<StudyType, { seconds: number; sessions: number }>();
    for (const r of rows) {
      const v = m.get(r.study_type) ?? { seconds: 0, sessions: 0 };
      v.seconds += r.seconds;
      v.sessions += r.sessions;
      m.set(r.study_type, v);
    }
    return m;
  };
  const cur = sum(current);
  const prev = sum(previous);
  const totalCur = [...cur.values()].reduce((s, v) => s + v.seconds, 0);
  const totalPrev = [...prev.values()].reduce((s, v) => s + v.seconds, 0);
  return [...cur.entries()]
    .map(([type, v]) => ({
      type,
      ...v,
      share: totalCur ? v.seconds / totalCur : 0,
      previousShare: totalPrev ? (prev.get(type)?.seconds ?? 0) / totalPrev : 0,
    }))
    .sort((a, b) => b.seconds - a.seconds);
}

export type Frequency = {
  /** Um bucket por dia da semana, na ordem do usuário, com a média de tempo por ocorrência. */
  weekdays: Bucket[];
  studyDays: number;
  days: number;
  longestStreak: number;
  longestGap: number;
  bestDay: { day: string; seconds: number } | null;
};

export function frequency(daily: DailyTotal[], from: string, to: string, weekStartsOn: number): Frequency {
  const byDay = new Map(daily.filter((d) => d.day >= from && d.day <= to).map((d) => [d.day, d]));
  const days = eachDay(from, to);
  const acc = Array.from({ length: 7 }, () => ({ seconds: 0, sessions: 0, count: 0, studied: 0 }));
  let streak = 0;
  let longestStreak = 0;
  let gap = 0;
  let longestGap = 0;
  let bestDay: Frequency["bestDay"] = null;
  for (const day of days) {
    const wd = weekday(day);
    const r = byDay.get(day);
    acc[wd].count += 1;
    if (r && r.seconds > 0) {
      acc[wd].seconds += r.seconds;
      acc[wd].sessions += r.sessions;
      acc[wd].studied += 1;
      streak += 1;
      gap = 0;
      if (!bestDay || r.seconds > bestDay.seconds) bestDay = { day, seconds: r.seconds };
    } else {
      streak = 0;
      gap += 1;
    }
    longestStreak = Math.max(longestStreak, streak);
    longestGap = Math.max(longestGap, gap);
  }
  const order = Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7);
  const weekdays = order.map((wd) => {
    const a = acc[wd];
    return {
      ...emptyBucket(
        String(wd),
        WEEKDAYS_SHORT[wd],
        `${WEEKDAYS_LONG[wd][0].toUpperCase()}${WEEKDAYS_LONG[wd].slice(1)}: média de tempo (estudou em ${a.studied} de ${a.count})`,
        from,
        to,
        false,
      ),
      seconds: a.count ? Math.round(a.seconds / a.count) : 0,
      sessions: a.sessions,
    };
  });
  return {
    weekdays,
    studyDays: [...byDay.values()].filter((d) => d.seconds > 0).length,
    days: days.length,
    longestStreak,
    longestGap,
    bestDay,
  };
}

export type GoalHistory = Goal & {
  windows: { from: string; to: string; value: number; hit: boolean }[];
  hits: number;
};

/**
 * Para cada meta, as últimas janelas completas (30 dias, 12 semanas ou 6 meses),
 * a partir do dia em que a meta foi criada.
 */
export function goalHistory(
  goals: (Goal & { created_on: string })[],
  rows: StatRow[],
  today: string,
  weekStartsOn: number,
): GoalHistory[] {
  return goals.map((g) => {
    const windows: { from: string; to: string }[] = [];
    if (g.period === "daily") {
      for (let i = 30; i >= 1; i--) windows.push({ from: addDays(today, -i), to: addDays(today, -i) });
    } else if (g.period === "weekly") {
      const cur = weekStartOf(today, weekStartsOn);
      for (let i = 12; i >= 1; i--)
        windows.push({ from: addDays(cur, -7 * i), to: addDays(cur, -7 * i + 6) });
    } else {
      const cur = monthStartOf(today);
      for (let i = 6; i >= 1; i--) {
        const f = addMonths(cur, -i);
        windows.push({ from: f, to: addDays(addMonths(f, 1), -1) });
      }
    }
    const valid = windows.filter((w) => w.from >= g.created_on || w.to >= g.created_on);
    const evaluated = valid.map((w) => {
      let value = 0;
      for (const r of rows) {
        if (r.day < w.from || r.day > w.to) continue;
        if (g.subject_id && r.subject_id !== g.subject_id) continue;
        value += g.metric === "minutes" ? r.seconds / 60 : g.metric === "sessions" ? r.sessions : r.questions;
      }
      value = Math.floor(value);
      return { ...w, value, hit: value >= g.target };
    });
    return { ...g, windows: evaluated, hits: evaluated.filter((w) => w.hit).length };
  });
}

/** Menor data necessária para calcular o histórico das metas. */
export function goalHistoryStart(today: string, weekStartsOn: number) {
  return [
    addDays(today, -30),
    addDays(weekStartOf(today, weekStartsOn), -84),
    addMonths(monthStartOf(today), -6),
  ].sort()[0];
}
