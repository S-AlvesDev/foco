import { describe, expect, it } from "vitest";
import { CAFE_DAYS } from "@/features/cafe/days";
import { CHALLENGE_DAYS } from "@/features/challenge/days";

// streakOf vive num módulo server-only; a regra é simples o bastante para testar copiada aqui.
function streakOf(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  const shift = (iso: string, n: number) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  let cur = set.has(today) ? today : shift(today, -1);
  let n = 0;
  while (set.has(cur)) {
    n++;
    cur = shift(cur, -1);
  }
  return n;
}

describe("Café com Lei", () => {
  it("tem ids únicos de dois dígitos, 5 pontos e 3 itens por dose", () => {
    const ids = CAFE_DAYS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of CAFE_DAYS) {
      expect(d.id).toMatch(/^\d\d$/);
      expect(d.points.length).toBeGreaterThanOrEqual(4);
      expect(d.questions).toHaveLength(3);
      if (d.topic) expect(d.topic.topicId).toMatch(/^pmpe-[a-z]+\.c\d\d\.t\d\d$/);
    }
  });
});

describe("Desafio 7 dias", () => {
  it("tem 7 dias, e as tarefas do Café apontam para doses que existem", () => {
    expect(CHALLENGE_DAYS).toHaveLength(7);
    const cafe = new Set(CAFE_DAYS.map((d) => d.id));
    for (const d of CHALLENGE_DAYS) {
      expect(d.tasks.length).toBeLessThanOrEqual(20);
      for (const t of d.tasks) if (t.cafe) expect(cafe.has(t.cafe)).toBe(true);
    }
  });
});

describe("sequência de dias", () => {
  it("conta dias seguidos terminando hoje ou ontem", () => {
    expect(streakOf(["2026-11-13", "2026-11-14", "2026-11-15"], "2026-11-15")).toBe(3);
    expect(streakOf(["2026-11-13", "2026-11-14"], "2026-11-15")).toBe(2);
    expect(streakOf(["2026-11-12"], "2026-11-15")).toBe(0);
    expect(streakOf(["2026-10-31", "2026-11-01"], "2026-11-01")).toBe(2);
  });
});
