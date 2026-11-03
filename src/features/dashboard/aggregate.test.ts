import { describe, expect, it } from "vitest";
import { addMonths, daysInMonth, weekStartOf } from "@/lib/dates";
import { aggregateDashboard, compareWithPrevious, periodStart, statsRange, type StatRow } from "./aggregate";

const A = "a";
const B = "b";
const row = (day: string, subject: string, minutes: number, sessions = 1): StatRow => ({
  day,
  subject_id: subject,
  study_type: "theory",
  seconds: minutes * 60,
  sessions,
  questions: 0,
});

// Terça, 3 de novembro de 2026
const today = "2026-11-03";

describe("datas", () => {
  it("início da semana respeita a preferência", () => {
    expect(weekStartOf(today, 1)).toBe("2026-11-02"); // segunda
    expect(weekStartOf(today, 0)).toBe("2026-11-01"); // domingo
    expect(weekStartOf("2026-11-01", 1)).toBe("2026-10-26");
  });
  it("meses", () => {
    expect(addMonths("2026-11-03", -11)).toBe("2025-12-01");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-01");
    expect(daysInMonth("2028-02-10")).toBe(29);
  });
});

describe("aggregateDashboard", () => {
  const rows = [
    row("2026-11-03", A, 60),
    row("2026-11-03", B, 30),
    row("2026-11-02", A, 45),
    row("2026-11-01", B, 120), // domingo
    row("2026-10-31", A, 30), // mês anterior
    row("2026-10-05", B, 60),
  ];

  it("hoje, semana e mês", () => {
    const d = aggregateDashboard(rows, { today, weekStartsOn: 1, period: "7" });
    expect(d.today).toBe(90 * 60);
    expect(d.week).toBe(135 * 60); // seg + ter
    expect(d.month).toBe(255 * 60); // 1 a 3 de nov
    const sun = aggregateDashboard(rows, { today, weekStartsOn: 0, period: "7" });
    expect(sun.week).toBe(255 * 60); // dom + seg + ter
  });

  it("período de 7 dias: total, média diária, dias estudados e buckets diários", () => {
    const d = aggregateDashboard(rows, { today, weekStartsOn: 1, period: "7" });
    expect(d.period.from).toBe("2026-10-28");
    expect(d.period.seconds).toBe(285 * 60);
    expect(d.period.days).toBe(7);
    expect(d.period.studiedDays).toBe(4);
    expect(d.period.dailyAverage).toBeCloseTo((285 * 60) / 7);
    expect(d.buckets).toHaveLength(7);
    expect(d.buckets.at(-1)).toMatchObject({ key: today, label: "ter", seconds: 90 * 60, current: true });
    expect(d.buckets.at(-1)!.bySubject[0]).toEqual({ subjectId: A, seconds: 3600 });
  });

  it("distribuição por matéria ordenada com participação", () => {
    const d = aggregateDashboard(rows, { today, weekStartsOn: 1, period: "30" });
    expect(d.bySubject.map((s) => s.subjectId)).toEqual([B, A]);
    expect(d.bySubject[0].seconds).toBe(210 * 60);
    expect(d.bySubject[0].share + d.bySubject[1].share).toBeCloseTo(1);
  });

  it("90 dias usa semanas; 12 meses usa meses completos", () => {
    const w = aggregateDashboard(rows, { today, weekStartsOn: 1, period: "90" });
    expect(w.granularity).toBe("week");
    expect(w.buckets.every((b) => b.from <= b.to)).toBe(true);
    expect(w.buckets.at(-1)!.from).toBe("2026-11-02");
    expect(w.buckets.at(-1)!.seconds).toBe(135 * 60);
    const m = aggregateDashboard(rows, { today, weekStartsOn: 1, period: "365" });
    expect(m.buckets).toHaveLength(12);
    expect(m.buckets[0].from).toBe("2025-12-01");
    expect(m.buckets.at(-1)).toMatchObject({ label: "nov", seconds: 255 * 60, current: true });
    expect(m.buckets.at(-2)).toMatchObject({ label: "out", seconds: 90 * 60 });
  });

  it("sem dados não divide por zero", () => {
    const d = aggregateDashboard([], { today, weekStartsOn: 1, period: "30" });
    expect(d.period.dailyAverage).toBe(0);
    expect(d.bySubject).toEqual([]);
    expect(d.buckets).toHaveLength(30);
  });

  it("uma consulta cobre período, semana, mês e as comparações", () => {
    expect(statsRange("7", "2026-11-25", 1).from).toBe("2026-10-01");
    expect(statsRange("7", "2026-11-03", 1).from).toBe("2026-10-01");
    expect(statsRange("365", "2026-11-03", 1).from).toBe("2025-12-01");
    expect(periodStart("90", today, 1) <= "2026-08-06").toBe(true);
  });
});

describe("compareWithPrevious", () => {
  // Terça, 3 nov 2026; semana começa na segunda (2 nov).
  const t = "2026-11-03";
  it("compara com ontem, a semana passada e o mês passado até o mesmo dia", () => {
    const rows = [
      row("2026-11-03", A, 60),
      row("2026-11-02", A, 30),
      row("2026-10-27", A, 45), // terça passada: entra na semana anterior
      row("2026-10-28", A, 100), // quarta passada: fora (depois do mesmo dia)
      row("2026-10-01", A, 20), // mês passado, dentro dos 3 primeiros dias
      row("2026-10-04", A, 999), // mês passado, fora
    ];
    const c = compareWithPrevious(rows, { today: t, weekStartsOn: 1 });
    expect(c.today).toEqual({ current: 3600, previous: 1800 });
    expect(c.week).toEqual({ current: 90 * 60, previous: 45 * 60 });
    expect(c.month).toEqual({ current: 90 * 60, previous: 20 * 60 });
    expect(c.last7.map((d) => d.studied)).toEqual([true, false, false, false, false, true, true]);
    expect(c.last7.at(-1)?.day).toBe(t);
  });

  it("mês anterior mais curto termina no último dia dele", () => {
    const rows = [row("2026-02-28", A, 10), row("2026-03-31", A, 5)];
    const c = compareWithPrevious(rows, { today: "2026-03-31", weekStartsOn: 1 });
    expect(c.month).toEqual({ current: 300, previous: 600 });
  });

  it("a visão de 7 dias traz a data como segunda linha", () => {
    const d = aggregateDashboard([], { today: t, weekStartsOn: 1, period: "7" });
    expect(d.buckets[0].sublabel).toBe("28/10");
    expect(d.buckets.at(-1)?.sublabel).toBe("03/11");
  });
});
