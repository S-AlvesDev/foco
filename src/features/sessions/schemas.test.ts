import { describe, expect, it } from "vitest";
import { resolveSession, sessionFormSchema } from "./schemas";

const tz = "America/Fortaleza";
const now = new Date("2026-11-03T01:30:00Z"); // 22:30 de 02/11 em Fortaleza
const base = {
  subject_id: "6f1c1c9e-2b1a-4b7e-9d1e-1a2b3c4d5e6f",
  date: "2026-11-02",
  start: "",
  end: "",
  duration: "",
  study_type: "theory",
  topic: "",
  notes: "",
  questions_answered: "",
  questions_correct: "",
};
const run = (patch: Partial<typeof base>) =>
  resolveSession(sessionFormSchema.parse({ ...base, ...patch }), tz, now);

describe("resolveSession", () => {
  it("início e fim definem a duração e os instantes UTC", () => {
    const r = run({ start: "14:00", end: "15:30" });
    expect(r.ok && r.data).toMatchObject({
      duration_seconds: 5400,
      started_at: "2026-11-02T17:00:00.000Z",
      ended_at: "2026-11-02T18:30:00.000Z",
      session_date: "2026-11-02",
    });
  });

  it("aceita duração menor que o intervalo (pausas)", () => {
    const r = run({ start: "14:00", end: "16:00", duration: "1:30" });
    expect(r.ok && r.data.duration_seconds).toBe(5400);
    expect(r.ok && r.data.ended_at).toBe("2026-11-02T19:00:00.000Z");
  });

  it("recusa duração maior que o intervalo", () => {
    const r = run({ start: "14:00", end: "15:00", duration: "2h" });
    expect(!r.ok && r.errors.duration).toBe("Maior que o intervalo entre início e fim.");
  });

  it("início + duração calcula o fim", () => {
    const r = run({ start: "20:00", duration: "45" });
    expect(r.ok && r.data.ended_at).toBe("2026-11-02T23:45:00.000Z");
  });

  it("só duração não grava horários", () => {
    const r = run({ duration: "1h30" });
    expect(r.ok && r.data).toMatchObject({ duration_seconds: 5400, started_at: null, ended_at: null });
  });

  it("passa da meia-noite", () => {
    const r = run({ date: "2026-11-01", start: "23:00", end: "01:00" });
    expect(r.ok && r.data.duration_seconds).toBe(7200);
    expect(r.ok && r.data.ended_at).toBe("2026-11-02T04:00:00.000Z");
  });

  it("recusa futuro, fim sem início e campos vazios", () => {
    expect(!run({ date: "2026-11-03", duration: "30" }).ok).toBe(true);
    const futureEnd = run({ start: "22:00", end: "23:30" });
    expect(!futureEnd.ok && futureEnd.errors.end).toBe("O fim está no futuro.");
    const noStart = run({ end: "15:00", duration: "30" });
    expect(!noStart.ok && noStart.errors.start).toBe("Informe o início.");
    const nothing = run({});
    expect(!nothing.ok && nothing.errors.duration).toBe("Informe a duração.");
    const startOnly = run({ start: "10:00" });
    expect(!startOnly.ok && startOnly.errors.duration).toBe("Informe o fim ou a duração.");
  });

  it("valida questões", () => {
    const r = run({ duration: "30", questions_answered: "10", questions_correct: "12" });
    expect(!r.ok && r.errors.questions_correct).toBe("Acertos não podem passar do total.");
    const ok = run({ duration: "30", questions_answered: "20", questions_correct: "15" });
    expect(ok.ok && ok.data).toMatchObject({ questions_answered: 20, questions_correct: 15 });
  });
});
