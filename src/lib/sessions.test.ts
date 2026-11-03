import { describe, expect, it } from "vitest";
import { addMinutesToTime, clock, minutesBetween, minutesToInput, parseDurationInput } from "./format";
import { wallTime, zonedToUtc } from "./time";

describe("zonedToUtc", () => {
  it("converte hora de Fortaleza (UTC−3)", () => {
    expect(zonedToUtc("2026-11-02", "22:30", "America/Fortaleza").toISOString()).toBe(
      "2026-11-03T01:30:00.000Z",
    );
  });
  it("lida com horário de verão (Nova York, antes e depois)", () => {
    expect(zonedToUtc("2026-07-01", "09:00", "America/New_York").toISOString()).toBe(
      "2026-07-01T13:00:00.000Z",
    );
    expect(zonedToUtc("2026-12-01", "09:00", "America/New_York").toISOString()).toBe(
      "2026-12-01T14:00:00.000Z",
    );
  });
  it("lida com meia hora (Índia) e volta para a hora local", () => {
    const at = zonedToUtc("2026-11-02", "08:15", "Asia/Kolkata");
    expect(at.toISOString()).toBe("2026-11-02T02:45:00.000Z");
    expect(wallTime("Asia/Kolkata", at)).toBe("08:15");
  });
});

describe("duração", () => {
  it("entende vários formatos", () => {
    expect(parseDurationInput("90")).toBe(90);
    expect(parseDurationInput("1:30")).toBe(90);
    expect(parseDurationInput("1h30")).toBe(90);
    expect(parseDurationInput("1h 30min")).toBe(90);
    expect(parseDurationInput("2h")).toBe(120);
    expect(parseDurationInput("45min")).toBe(45);
    expect(parseDurationInput("45 m")).toBe(45);
    expect(parseDurationInput("1:75")).toBeNull();
    expect(parseDurationInput("abc")).toBeNull();
    expect(parseDurationInput("")).toBeNull();
  });
  it("calcula intervalos, inclusive passando da meia-noite", () => {
    expect(minutesBetween("14:00", "15:30")).toBe(90);
    expect(minutesBetween("23:00", "01:15")).toBe(135);
    expect(addMinutesToTime("23:30", 90)).toBe("01:00");
    expect(minutesToInput(90)).toBe("1:30");
    expect(minutesToInput(5)).toBe("0:05");
  });
  it("formata o relógio", () => {
    expect(clock(309)).toBe("0:05:09");
    expect(clock(3723)).toBe("1:02:03");
  });
});
