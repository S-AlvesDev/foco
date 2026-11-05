import { addDays, eachDay } from "@/lib/dates";

export type QRow = {
  day: string;
  area: string;
  disciplina: string;
  assunto: string;
  answered: number;
  correct: number;
};

export type Tally = { answered: number; correct: number; rate: number | null };

const tally = (answered: number, correct: number): Tally => ({
  answered,
  correct,
  rate: answered > 0 ? correct / answered : null,
});

/** Resumo das respostas num intervalo de dias (inclusive). */
export function questionSummary(rows: QRow[], from: string, to: string) {
  const inRange = rows.filter((r) => r.day >= from && r.day <= to);
  const answered = inRange.reduce((n, r) => n + r.answered, 0);
  const correct = inRange.reduce((n, r) => n + r.correct, 0);
  const days = new Set(inRange.filter((r) => r.answered > 0).map((r) => r.day)).size;
  return { ...tally(answered, correct), days };
}

/** Acerto por disciplina, das que mais foram resolvidas para as que menos. */
export function byDisciplina(rows: QRow[]) {
  const m = new Map<string, { answered: number; correct: number }>();
  for (const r of rows) {
    const t = m.get(r.disciplina) ?? { answered: 0, correct: 0 };
    t.answered += r.answered;
    t.correct += r.correct;
    m.set(r.disciplina, t);
  }
  return [...m]
    .map(([disciplina, t]) => ({ disciplina, ...tally(t.answered, t.correct) }))
    .sort((a, b) => b.answered - a.answered || a.disciplina.localeCompare(b.disciplina, "pt-BR"));
}

/** Assuntos com pior acerto (mínimo de respostas para não punir um erro isolado). */
export function weakSpots(rows: QRow[], minAnswered = 3, limit = 5) {
  const m = new Map<
    string,
    { area: string; disciplina: string; assunto: string; answered: number; correct: number }
  >();
  for (const r of rows) {
    const k = `${r.area}\u0000${r.disciplina}\u0000${r.assunto}`;
    const t = m.get(k) ?? {
      area: r.area,
      disciplina: r.disciplina,
      assunto: r.assunto,
      answered: 0,
      correct: 0,
    };
    t.answered += r.answered;
    t.correct += r.correct;
    m.set(k, t);
  }
  return [...m.values()]
    .filter((t) => t.answered >= minAnswered && t.correct < t.answered)
    .map((t) => ({ ...t, rate: t.correct / t.answered }))
    .sort((a, b) => a.rate - b.rate || b.answered - a.answered)
    .slice(0, limit);
}

/**
 * O que reforçar: assuntos com pior acerto; se nenhum assunto tem respostas suficientes
 * (comum no começo, com poucas questões por assunto), cai para as disciplinas.
 */
export function weakFocus(rows: QRow[], limit = 5) {
  const topics = weakSpots(rows, 3, limit);
  if (topics.length > 0) return { level: "assunto" as const, items: topics };
  const disc = byDisciplina(rows)
    .filter((d) => d.answered >= 3 && d.correct < d.answered)
    .map((d) => ({
      area: areaOf(rows, d.disciplina),
      disciplina: d.disciplina,
      assunto: null,
      answered: d.answered,
      correct: d.correct,
      rate: d.rate ?? 0,
    }))
    .sort((a, b) => a.rate - b.rate || b.answered - a.answered)
    .slice(0, limit);
  return { level: "disciplina" as const, items: disc };
}

const areaOf = (rows: QRow[], disciplina: string) =>
  rows.find((r) => r.disciplina === disciplina)?.area ?? "";

/** Uma barra por dia: certas e erradas. */
export function dailySeries(rows: QRow[], from: string, to: string) {
  const m = new Map<string, { answered: number; correct: number }>();
  for (const r of rows) {
    const t = m.get(r.day) ?? { answered: 0, correct: 0 };
    t.answered += r.answered;
    t.correct += r.correct;
    m.set(r.day, t);
  }
  return eachDay(from, to).map((day) => ({ day, ...(m.get(day) ?? { answered: 0, correct: 0 }) }));
}

export function lastNDays(today: string, n: number) {
  return { from: addDays(today, -(n - 1)), to: today };
}

/** Faixa de cor do acerto: abaixo de 50% vermelho, até 70% âmbar, acima verde. */
export function rateTone(rate: number | null) {
  if (rate === null) return "none" as const;
  return rate >= 0.7 ? ("good" as const) : rate >= 0.5 ? ("mid" as const) : ("low" as const);
}
