import { addDays, addMonths, daysBetween, monthStartOf, weekStartOf } from "@/lib/dates";

export type DayCell = { date: string; inMonth: boolean; future: boolean; today: boolean };

/** Semanas (linhas de 7 dias) que cobrem o mês, começando no dia escolhido pelo usuário. */
export function monthGrid(monthISO: string, today: string, weekStartsOn: number): DayCell[][] {
  const first = monthStartOf(monthISO);
  const last = addDays(addMonths(first, 1), -1);
  const start = weekStartOf(first, weekStartsOn);
  const weeks: DayCell[][] = [];
  for (let d = start; d <= last;) {
    const week: DayCell[] = [];
    for (let i = 0; i < 7; i++, d = addDays(d, 1)) {
      week.push({
        date: d,
        inMonth: d.slice(0, 7) === first.slice(0, 7),
        future: d > today,
        today: d === today,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

/** Colunas de semanas para o mapa anual, terminando na semana de hoje (53 colunas). */
export function heatmapColumns(today: string, weekStartsOn: number, weeks = 53): DayCell[][] {
  const lastWeek = weekStartOf(today, weekStartsOn);
  const first = addDays(lastWeek, -7 * (weeks - 1));
  const cols: DayCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(first, w * 7 + i);
      col.push({ date, inMonth: true, future: date > today, today: date === today });
    }
    cols.push(col);
  }
  return cols;
}

/**
 * Intensidade 0–4 de um dia.
 * Com meta diária: proporção da meta (até 25%, 50%, 100%, 100%+).
 * Sem meta: até 30 min, 1h, 2h, mais que isso.
 */
export function intensity(seconds: number, dailyGoalMinutes?: number | null) {
  if (seconds <= 0) return 0;
  if (dailyGoalMinutes && dailyGoalMinutes > 0) {
    const r = seconds / 60 / dailyGoalMinutes;
    return r < 0.25 ? 1 : r < 0.5 ? 2 : r < 1 ? 3 : 4;
  }
  return seconds < 1800 ? 1 : seconds < 3600 ? 2 : seconds < 7200 ? 3 : 4;
}

export function monthParam(raw: unknown, today: string) {
  if (typeof raw === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) {
    const iso = `${raw}-01`;
    // Não navega para meses futuros.
    return iso > monthStartOf(today) ? monthStartOf(today) : iso;
  }
  return monthStartOf(today);
}

export function dayParam(raw: unknown, monthISO: string, today: string) {
  if (
    typeof raw === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(raw) &&
    raw.slice(0, 7) === monthISO.slice(0, 7) &&
    raw <= today
  ) {
    return raw;
  }
  return null;
}

export const heatmapStart = (today: string, weekStartsOn: number) =>
  heatmapColumns(today, weekStartsOn)[0][0].date;
export const spanDays = (from: string, to: string) => daysBetween(from, to) + 1;
