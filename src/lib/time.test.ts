import { describe, expect, it } from "vitest";
import { greeting, longDate, timeZoneName, timeZoneOffset, timeZoneOffsetMinutes } from "./time";
import { initials, safeNextPath } from "./utils";

// 2026-11-03 01:30 UTC = 2026-11-02 22:30 em Fortaleza
const at = new Date("2026-11-03T01:30:00Z");

describe("time", () => {
  it("formata o offset com sinal tipográfico", () => {
    expect(timeZoneOffset("America/Fortaleza", at)).toBe("UTC−03:00");
    expect(timeZoneOffset("Asia/Kolkata", at)).toBe("UTC+05:30");
    expect(timeZoneOffset("UTC", at)).toBe("UTC+00:00");
    expect(timeZoneOffsetMinutes("America/Manaus", at)).toBe(-240);
  });

  it("usa a data local do usuário, não a UTC", () => {
    expect(longDate("America/Fortaleza", at)).toBe("segunda-feira, 2 de novembro");
    expect(longDate("Europe/Lisbon", at)).toBe("terça-feira, 3 de novembro");
  });

  it("cumprimenta conforme a hora local", () => {
    expect(greeting("America/Fortaleza", at)).toBe("Boa noite");
    expect(greeting("Asia/Tokyo", at)).toBe("Bom dia"); // 10:30 em Tóquio
    expect(greeting("Europe/Lisbon", new Date("2026-11-03T15:00:00Z"))).toBe("Boa tarde");
  });

  it("nomeia fusos brasileiros em português", () => {
    expect(timeZoneName("America/Sao_Paulo")).toBe("São Paulo, Brasília");
    expect(timeZoneName("America/New_York")).toBe("New York");
  });
});

describe("utils", () => {
  it("só aceita caminhos internos em next", () => {
    expect(safeNextPath("/configuracoes")).toBe("/configuracoes");
    expect(safeNextPath("//evil.com")).toBe("/painel");
    expect(safeNextPath("https://evil.com")).toBe("/painel");
    expect(safeNextPath("/\\evil.com")).toBe("/painel");
    expect(safeNextPath(null)).toBe("/painel");
  });

  it("gera iniciais", () => {
    expect(initials("Luiz Samuel Alves")).toBe("LA");
    expect(initials("  ana ")).toBe("A");
    expect(initials("")).toBe("?");
  });
});
