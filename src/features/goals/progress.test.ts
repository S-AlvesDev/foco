import { describe, expect, it } from "vitest";
import type { StatRow } from "@/features/dashboard/aggregate";
import {
  goalAmount,
  goalProgress,
  goalTitle,
  goalWindow,
  goalsRangeStart,
  sortGoals,
  type Goal,
} from "./progress";

const today = "2026-11-03"; // terça
const r = (day: string, subject: string, minutes: number, sessions = 1, questions = 0): StatRow => ({
  day,
  subject_id: subject,
  study_type: "theory",
  seconds: minutes * 60,
  sessions,
  questions,
});
const rows = [
  r("2026-11-03", "pt", 50, 1, 20),
  r("2026-11-03", "dir", 40, 2),
  r("2026-11-02", "pt", 90, 1, 30),
  r("2026-11-01", "pt", 60), // domingo
  r("2026-10-31", "dir", 120), // mês anterior
];
const g = (patch: Partial<Goal>): Goal => ({
  id: "g",
  subject_id: null,
  period: "daily",
  metric: "minutes",
  target: 120,
  ...patch,
});

describe("janelas", () => {
  it("dia, semana (conforme preferência) e mês", () => {
    expect(goalWindow("daily", today, 1)).toEqual({ from: today, to: today });
    expect(goalWindow("weekly", today, 1)).toEqual({ from: "2026-11-02", to: "2026-11-08" });
    expect(goalWindow("weekly", today, 0)).toEqual({ from: "2026-11-01", to: "2026-11-07" });
    expect(goalWindow("monthly", today, 1)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(goalsRangeStart("2026-11-03", 0)).toBe("2026-11-01");
    expect(goalsRangeStart("2026-12-01", 1)).toBe("2026-11-30");
  });
});

describe("progresso", () => {
  it("horas diárias gerais", () => {
    const p = goalProgress(g({}), rows, today, 1);
    expect(p).toMatchObject({ value: 90, done: false });
    expect(p.ratio).toBeCloseTo(0.75);
    expect(goalAmount(p)).toBe("1h 30min de 2h");
  });
  it("semanal por matéria respeita início da semana", () => {
    expect(
      goalProgress(g({ period: "weekly", subject_id: "pt", target: 120 }), rows, today, 1),
    ).toMatchObject({
      value: 140,
      done: true,
    });
    expect(goalProgress(g({ period: "weekly", subject_id: "pt", target: 300 }), rows, today, 0).value).toBe(
      200,
    );
  });
  it("sessões e questões no mês", () => {
    expect(goalProgress(g({ period: "monthly", metric: "sessions", target: 10 }), rows, today, 1).value).toBe(
      5,
    );
    const q = goalProgress(g({ period: "monthly", metric: "questions", target: 100 }), rows, today, 1);
    expect(q.value).toBe(50);
    expect(goalAmount(q)).toBe("50 de 100");
  });
  it("títulos", () => {
    expect(goalTitle({ metric: "minutes", target: 90 })).toBe("Estudar 1h 30min");
    expect(goalTitle({ metric: "sessions", target: 1 })).toBe("Fazer 1 sessão");
    expect(goalTitle({ metric: "questions", target: 100 })).toBe("Resolver 100 questões");
  });
  it("ordena por período, depois gerais e matérias", () => {
    const list = sortGoals(
      [
        g({ id: "m", period: "monthly" }),
        g({ id: "wd", period: "weekly", subject_id: "dir" }),
        g({ id: "w", period: "weekly" }),
        g({ id: "d", period: "daily" }),
      ],
      ["pt", "dir"],
    );
    expect(list.map((x) => x.id)).toEqual(["d", "w", "wd", "m"]);
  });
});
