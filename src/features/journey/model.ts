import { MONTHS_LONG, MONTHS_SHORT, addDays, addMonths, monthStartOf, weekStartOf } from "@/lib/dates";
import { formatDuration, plural } from "@/lib/format";

/** Você sempre na cor de destaque; a outra pessoa num verde-azulado bem distinto. */
export const PERSON_COLORS = { me: "var(--accent)", partner: "#3FB6A8" } as const;

export type DailyRow = { user_id: string; day: string; seconds: number; sessions: number };

export type ChallengeMetric = "minutes" | "sessions" | "study_days" | "questions";
export type ChallengeScope = "combined" | "each";
export type ChallengeKind = "joint_goal" | "weekly_challenge";

export type Challenge = {
  id: string;
  kind: ChallengeKind;
  title: string;
  description: string | null;
  metric: ChallengeMetric;
  scope: ChallengeScope;
  target: number;
  starts_on: string;
  ends_on: string;
  created_by: string | null;
};

export const CHALLENGE_METRIC_LABEL: Record<ChallengeMetric, string> = {
  minutes: "Horas de estudo",
  sessions: "Sessões",
  study_days: "Dias com estudo",
  questions: "Questões",
};

/** "10h", "20 sessões", "5 dias de estudo", "300 questões". */
export function metricAmount(metric: ChallengeMetric, value: number) {
  switch (metric) {
    case "minutes":
      return formatDuration(value * 60);
    case "sessions":
      return plural(value, "sessão", "sessões");
    case "study_days":
      return plural(value, "dia de estudo", "dias de estudo");
    case "questions":
      return plural(value, "questão", "questões");
  }
}

export type ChallengeStatus = "upcoming" | "active" | "ended";

export function challengeStatus(c: Pick<Challenge, "starts_on" | "ends_on">, today: string): ChallengeStatus {
  if (today < c.starts_on) return "upcoming";
  if (today > c.ends_on) return "ended";
  return "active";
}

/** Cumprido: juntos, a soma chega ao alvo; cada um, os dois chegam ao alvo. */
export function challengeDone(
  c: Pick<Challenge, "scope" | "target">,
  values: { me: number; partner: number | null },
) {
  if (c.scope === "combined") return values.me + (values.partner ?? 0) >= c.target;
  return values.me >= c.target && (values.partner ?? 0) >= c.target;
}

export function sumFor(rows: DailyRow[], userId: string, from: string, to: string) {
  let seconds = 0;
  let sessions = 0;
  let days = 0;
  for (const r of rows) {
    if (r.user_id !== userId || r.day < from || r.day > to) continue;
    seconds += r.seconds;
    sessions += r.sessions;
    if (r.seconds > 0) days += 1;
  }
  return { seconds, sessions, days };
}

export type PairBucket = {
  key: string;
  label: string;
  title: string;
  me: number;
  partner: number | null;
  current: boolean;
};

/** Evolução: últimas 8 semanas ou últimos 6 meses, um valor por pessoa. */
export function evolution(
  view: "semana" | "mes",
  rows: DailyRow[],
  ids: { me: string; partner: string | null },
  today: string,
  weekStartsOn: number,
): PairBucket[] {
  const out: PairBucket[] = [];
  if (view === "semana") {
    const cur = weekStartOf(today, weekStartsOn);
    for (let i = 7; i >= 0; i--) {
      const from = addDays(cur, -7 * i);
      const to = addDays(from, 6);
      const [, m, d] = from.split("-").map(Number);
      out.push({
        key: from,
        label: `${d}/${m}`,
        title: `Semana de ${d} ${MONTHS_SHORT[m - 1]}`,
        me: sumFor(rows, ids.me, from, to).seconds,
        partner: ids.partner ? sumFor(rows, ids.partner, from, to).seconds : null,
        current: i === 0,
      });
    }
  } else {
    const cur = monthStartOf(today);
    for (let i = 5; i >= 0; i--) {
      const from = addMonths(cur, -i);
      const to = addDays(addMonths(from, 1), -1);
      const [y, m] = from.split("-").map(Number);
      out.push({
        key: from,
        label: MONTHS_SHORT[m - 1].replace(".", ""),
        title: `${MONTHS_LONG[m - 1]} de ${y}`,
        me: sumFor(rows, ids.me, from, to).seconds,
        partner: ids.partner ? sumFor(rows, ids.partner, from, to).seconds : null,
        current: i === 0,
      });
    }
  }
  return out;
}

/** Janela atual e a anterior para os cartões de resumo. */
export function windows(view: "semana" | "mes", today: string, weekStartsOn: number) {
  if (view === "semana") {
    const from = weekStartOf(today, weekStartsOn);
    return { from, to: today, prevFrom: addDays(from, -7), prevTo: addDays(from, -1) };
  }
  const from = monthStartOf(today);
  return { from, to: today, prevFrom: addMonths(from, -1), prevTo: addDays(from, -1) };
}

/** Nível 0–4 para o calendário compartilhado. */
export function level(seconds: number) {
  if (seconds <= 0) return 0;
  if (seconds < 1800) return 1;
  if (seconds < 3600) return 2;
  if (seconds < 7200) return 3;
  return 4;
}
