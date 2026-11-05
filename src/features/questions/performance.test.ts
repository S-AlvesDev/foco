import { describe, expect, it } from "vitest";
import {
  byDisciplina,
  dailySeries,
  questionSummary,
  rateTone,
  weakFocus,
  weakSpots,
  type QRow,
} from "./performance";

const rows: QRow[] = [
  {
    day: "2026-11-01",
    area: "policial",
    disciplina: "Penal",
    assunto: "Legalidade",
    answered: 4,
    correct: 1,
  },
  { day: "2026-11-02", area: "policial", disciplina: "Penal", assunto: "Dolo", answered: 2, correct: 0 },
  { day: "2026-11-03", area: "policial", disciplina: "Português", assunto: "Crase", answered: 5, correct: 5 },
  {
    day: "2026-11-03",
    area: "farmacia",
    disciplina: "Farmacologia",
    assunto: "AINEs",
    answered: 3,
    correct: 2,
  },
];

describe("desempenho em questões", () => {
  it("resume o período", () => {
    expect(questionSummary(rows, "2026-11-02", "2026-11-03")).toEqual({
      answered: 10,
      correct: 7,
      rate: 0.7,
      days: 2,
    });
    expect(questionSummary([], "2026-11-01", "2026-11-03").rate).toBeNull();
  });
  it("agrupa por disciplina, mais resolvidas primeiro", () => {
    expect(byDisciplina(rows).map((d) => [d.disciplina, d.answered])).toEqual([
      ["Penal", 6],
      ["Português", 5],
      ["Farmacologia", 3],
    ]);
  });
  it("pontos fracos exigem mínimo de respostas e ignoram 100%", () => {
    expect(weakSpots(rows).map((w) => w.assunto)).toEqual(["Legalidade", "AINEs"]);
  });
  it("sem assunto suficiente, cai para disciplinas", () => {
    const few = rows.map((r) => ({
      ...r,
      answered: Math.min(r.answered, 2),
      correct: Math.min(r.correct, 1),
    }));
    const all = [...few, ...few.map((r) => ({ ...r, assunto: r.assunto + " 2" }))];
    const w = weakFocus(all);
    expect(w.level).toBe("disciplina");
    expect(w.items[0].disciplina).toBe("Penal");
    expect(weakFocus(rows).level).toBe("assunto");
  });
  it("série diária preenche dias vazios", () => {
    const s = dailySeries(rows, "2026-10-31", "2026-11-03");
    expect(s.map((d) => d.answered)).toEqual([0, 4, 2, 8]);
  });
  it("faixas de cor", () => {
    expect([rateTone(0.7), rateTone(0.5), rateTone(0.49), rateTone(null)]).toEqual([
      "good",
      "mid",
      "low",
      "none",
    ]);
  });
});
