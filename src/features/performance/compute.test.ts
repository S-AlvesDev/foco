import { describe, expect, it } from "vitest";
import {
  bySubject,
  byType,
  cumulative,
  delta,
  frequency,
  goalHistory,
  monthlyBuckets,
  performanceRange,
  summarize,
  weeklyBuckets,
  type BreakdownRow,
  type DailyTotal,
} from "./compute";

const day = (d: string, seconds: number, extra: Partial<DailyTotal> = {}): DailyTotal => ({
  day: d,
  seconds,
  sessions: seconds ? 1 : 0,
  questions: 0,
  correct: 0,
  ...extra,
});

describe("performanceRange", () => {
  it("compara com o período anterior do mesmo tamanho", () => {
    expect(performanceRange("30", "2026-11-03")).toEqual({
      from: "2026-10-05",
      to: "2026-11-03",
      prevFrom: "2026-09-05",
      prevTo: "2026-10-04",
      days: 30,
    });
  });
});

describe("summarize e delta", () => {
  const daily = [
    day("2026-11-01", 3600, { questions: 20, correct: 15 }),
    day("2026-11-03", 1800),
    day("2026-10-01", 7200),
  ];
  it("soma só o período e calcula médias e acerto", () => {
    const s = summarize(daily, "2026-11-01", "2026-11-03");
    expect(s.seconds).toBe(5400);
    expect(s.studyDays).toBe(2);
    expect(s.days).toBe(3);
    expect(s.perStudyDay).toBe(2700);
    expect(s.accuracy).toBe(75);
  });
  it("delta sem base é null", () => {
    expect(delta(10, 0)).toBeNull();
    expect(delta(0, 0)).toBe(0);
    expect(delta(150, 100)).toBe(0.5);
  });
});

describe("buckets", () => {
  it("semanas começam no dia escolhido e a atual vem marcada", () => {
    const b = weeklyBuckets([day("2026-11-02", 3600), day("2026-11-03", 600)], "2026-10-20", "2026-11-03", 1);
    expect(b[0].from).toBe("2026-10-19");
    expect(b.at(-1)).toMatchObject({ from: "2026-11-02", seconds: 4200, current: true });
  });
  it("12 meses, o último é o atual", () => {
    const m = monthlyBuckets(
      [{ month: "2026-11-01", seconds: 100, sessions: 1, study_days: 1 }],
      "2026-11-03",
    );
    expect(m).toHaveLength(12);
    expect(m[0].from).toBe("2025-12-01");
    expect(m.at(-1)).toMatchObject({ seconds: 100, current: true });
  });
  it("acumulado preenche meses vazios", () => {
    const c = cumulative(
      [
        { month: "2026-08-01", seconds: 10, sessions: 1, study_days: 1 },
        { month: "2026-10-01", seconds: 5, sessions: 1, study_days: 1 },
      ],
      "2026-11-03",
    );
    expect(c.map((p) => p.total)).toEqual([10, 10, 15, 15]);
  });
});

describe("matérias e tipos", () => {
  const cur: BreakdownRow[] = [
    { subject_id: "a", study_type: "theory", seconds: 300, sessions: 1, questions: 0, correct: 0 },
    { subject_id: "b", study_type: "questions", seconds: 100, sessions: 1, questions: 10, correct: 8 },
  ];
  const prev: BreakdownRow[] = [
    { subject_id: "a", study_type: "theory", seconds: 100, sessions: 1, questions: 0, correct: 0 },
    { subject_id: "c", study_type: "reading", seconds: 50, sessions: 1, questions: 0, correct: 0 },
  ];
  it("compara cada matéria com o período anterior", () => {
    const s = bySubject(cur, prev);
    expect(s.map((x) => x.subjectId)).toEqual(["a", "b", "c"]);
    expect(s[0]).toMatchObject({ seconds: 300, previous: 100, share: 0.75 });
    expect(s[2]).toMatchObject({ seconds: 0, previous: 50 });
  });
  it("participação de cada tipo", () => {
    const t = byType(cur, prev);
    expect(t[0]).toMatchObject({ type: "theory", share: 0.75 });
    expect(t[0].previousShare).toBeCloseTo(100 / 150);
  });
});

describe("frequência", () => {
  it("dias estudados, maior sequência e maior pausa", () => {
    const f = frequency(
      [day("2026-11-01", 60), day("2026-11-02", 60), day("2026-11-06", 120)],
      "2026-11-01",
      "2026-11-07",
      1,
    );
    expect(f.studyDays).toBe(3);
    expect(f.longestStreak).toBe(2);
    expect(f.longestGap).toBe(3);
    expect(f.bestDay).toEqual({ day: "2026-11-06", seconds: 120 });
    expect(f.weekdays[0].label).toBe("seg");
  });
});

describe("histórico de metas", () => {
  it("conta só janelas depois da criação da meta", () => {
    const rows = [
      {
        day: "2026-11-02",
        subject_id: "a",
        study_type: "theory" as const,
        seconds: 7200,
        sessions: 1,
        questions: 0,
      },
      {
        day: "2026-11-01",
        subject_id: "a",
        study_type: "theory" as const,
        seconds: 600,
        sessions: 1,
        questions: 0,
      },
    ];
    const [h] = goalHistory(
      [
        {
          id: "g",
          subject_id: null,
          period: "daily",
          metric: "minutes",
          target: 60,
          created_on: "2026-11-01",
        },
      ],
      rows,
      "2026-11-03",
      1,
    );
    expect(h.windows).toHaveLength(2);
    expect(h.hits).toBe(1);
  });
});
