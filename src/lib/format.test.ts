import { describe, expect, it } from "vitest";
import { formatDuration, localDateISO, plural, relativeDay, shortDate } from "./format";

describe("formatDuration", () => {
  it("formata minutos e horas", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(45 * 60)).toBe("45 min");
    expect(formatDuration(65 * 60)).toBe("1h 05min");
    expect(formatDuration(2 * 3600)).toBe("2h");
    expect(formatDuration(12 * 3600 + 30 * 60)).toBe("12h 30min");
    expect(formatDuration(89)).toBe("1 min");
  });
});

describe("datas", () => {
  it("usa o dia local", () => {
    const at = new Date("2026-11-03T01:30:00Z");
    expect(localDateISO("America/Fortaleza", at)).toBe("2026-11-02");
    expect(localDateISO("Asia/Tokyo", at)).toBe("2026-11-03");
  });

  it("descreve dias relativos", () => {
    expect(relativeDay("2026-11-02", "2026-11-02")).toBe("hoje");
    expect(relativeDay("2026-11-01", "2026-11-02")).toBe("ontem");
    expect(relativeDay("2026-10-29", "2026-11-02")).toBe("há 4 dias");
    expect(relativeDay("2026-10-12", "2026-11-02")).toBe("12 out.");
    expect(relativeDay("2025-12-31", "2026-01-02")).toBe("há 2 dias");
    expect(shortDate("2025-03-05", "2026-01-02")).toBe("5 mar. 2025");
  });

  it("pluraliza", () => {
    expect(plural(1, "sessão", "sessões")).toBe("1 sessão");
    expect(plural(0, "sessão", "sessões")).toBe("0 sessões");
    expect(plural(1200, "sessão", "sessões")).toBe("1.200 sessões");
  });
});
