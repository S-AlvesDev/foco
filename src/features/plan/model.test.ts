import { describe, expect, it } from "vitest";
import { planState, reviewTopics, type Plan, type TopicInfo, type TopicProgress } from "./model";
import { PRF_PLAN } from "./plan-prf";

const plan: Plan = {
  id: "t",
  name: "Teste",
  source: "",
  metas: [
    {
      id: "01",
      items: [{ kind: "read", disciplineId: "d", discipline: "D", title: "A", topics: ["a1", "a2"] }],
    },
    {
      id: "02",
      items: [{ kind: "practice", disciplineId: "d", discipline: "D", title: "B", topics: ["a1"] }],
    },
    { id: "03", review: ["01", "02"] },
    {
      id: "E1",
      extra: true,
      items: [{ kind: "read", disciplineId: "d", discipline: "D", title: "X", topics: ["zz"] }],
    },
  ],
};
const topics = new Map<string, TopicInfo>(
  ["a1", "a2"].map((id) => [id, { id, number: null, title: id, disciplineId: "d" }]),
);
const base = {
  plan,
  topics,
  memory: new Map(),
  today: "2026-11-11",
  toLocal: (ts: string) => ts.slice(0, 10),
};

describe("planState", () => {
  it("conclui a meta de leitura só com todos os tópicos lidos", () => {
    const progress = new Map<string, TopicProgress>([
      ["a1", { status: "done", percent: 100, completedAt: "2026-11-09T10:00:00Z" }],
    ]);
    let s = planState({ ...base, progress, marks: new Map() });
    expect(s.metas[0].done).toBe(false);
    expect(s.metas[0].progress).toBe(0.5);
    expect(s.current?.id).toBe("01");
    progress.set("a2", { status: "done", percent: 100, completedAt: "2026-11-10T10:00:00Z" });
    s = planState({ ...base, progress, marks: new Map() });
    expect(s.metas[0].done).toBe(true);
    expect(s.metas[0].doneOn).toBe("2026-11-10");
    expect(s.current?.id).toBe("02");
  });

  it("questões, revisão geral e tópicos ausentes concluem pela marcação", () => {
    const s = planState({
      ...base,
      progress: new Map(),
      marks: new Map([
        ["02:0", "2026-11-10"],
        ["03:0", "2026-11-11"],
      ]),
    });
    expect(s.metas[1].done).toBe(true);
    expect(s.metas[2].done).toBe(true);
    expect(s.metas[2].items[0].topics.map((t) => t.id)).toEqual(["a1", "a2"]);
    expect(s.metas[3].items[0].manual).toBe(true);
    expect(s.metas[3].items[0].missing).toBe(1);
    expect(s.current?.id).toBe("01");
    expect(s.coreTotal).toBe(3);
  });

  it("usa o ritmo real a partir de 3 metas, sem diluir o começo do plano", () => {
    const progress = new Map<string, TopicProgress>(
      ["a1", "a2"].map((id) => [id, { status: "done", percent: 100, completedAt: "2026-11-09T10:00:00Z" }]),
    );
    let s = planState({ ...base, progress, marks: new Map([["02:0", "2026-11-10"]]) });
    expect(s.pace.basis).toBe("default");
    s = planState({
      ...base,
      progress,
      marks: new Map([
        ["02:0", "2026-11-10"],
        ["03:0", "2026-11-11"],
      ]),
    });
    // 3 metas em 7 dias (janela mínima) = 3 por semana; falta 1 meta -> 3 dias.
    expect(s.pace.basis).toBe("real");
    expect(s.pace.perWeek).toBe(3);
    expect(s.finishOn).toBe("2026-11-14");
  });
});

describe("plano da PRF", () => {
  it("tem ids únicos e revisões que apontam para metas existentes", () => {
    const ids = PRF_PLAN.metas.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of PRF_PLAN.metas)
      if (m.review) {
        expect(ids).toContain(m.review[0]);
        expect(ids).toContain(m.review[1]);
        expect(reviewTopics(PRF_PLAN, m.review).length).toBeGreaterThan(0);
      }
  });

  it("não deixa tópico da Biblioteca com id malformado", () => {
    for (const m of PRF_PLAN.metas)
      for (const i of m.items ?? [])
        for (const t of i.topics) expect(t).toMatch(/^prf-[a-z]+\.c\d\d\.t\d\d$/);
  });
});
