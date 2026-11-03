import { describe, expect, it } from "vitest";
import { dayParam, heatmapColumns, intensity, monthGrid, monthParam } from "./grid";

const today = "2026-11-03";

describe("monthGrid", () => {
  it("novembro de 2026 começando na segunda", () => {
    const g = monthGrid("2026-11-01", today, 1);
    expect(g[0][0].date).toBe("2026-10-26");
    expect(g[0][6]).toMatchObject({ date: "2026-11-01", inMonth: true });
    expect(g.at(-1)!.at(-1)!.date).toBe("2026-12-06");
    expect(g.flat().find((c) => c.today)!.date).toBe(today);
    expect(g.flat().filter((c) => c.inMonth)).toHaveLength(30);
  });
  it("começando no domingo", () => {
    const g = monthGrid("2026-11-01", today, 0);
    expect(g[0][0].date).toBe("2026-11-01");
    expect(g).toHaveLength(5);
  });
});

describe("heatmap", () => {
  it("53 semanas terminando na semana de hoje", () => {
    const cols = heatmapColumns(today, 1);
    expect(cols).toHaveLength(53);
    expect(cols.at(-1)![0].date).toBe("2026-11-02");
    expect(cols.at(-1)!.filter((c) => c.future)).toHaveLength(5);
  });
  it("intensidade sem e com meta", () => {
    expect([0, 600, 1800, 3600, 9000].map((s) => intensity(s))).toEqual([0, 1, 2, 3, 4]);
    expect([0, 600, 1800, 3600, 7200].map((s) => intensity(s, 120))).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("parâmetros", () => {
  it("mês e dia válidos, sem futuro", () => {
    expect(monthParam("2026-09", today)).toBe("2026-09-01");
    expect(monthParam("2027-01", today)).toBe("2026-11-01");
    expect(monthParam("lixo", today)).toBe("2026-11-01");
    expect(dayParam("2026-11-02", "2026-11-01", today)).toBe("2026-11-02");
    expect(dayParam("2026-11-09", "2026-11-01", today)).toBeNull();
    expect(dayParam("2026-10-02", "2026-11-01", today)).toBeNull();
  });
});
