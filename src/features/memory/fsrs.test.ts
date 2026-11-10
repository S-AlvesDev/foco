import { describe, expect, it } from "vitest";
import {
  buildQueue,
  calibrate,
  correctedScore,
  DEFAULT_SETTINGS,
  finalGrade,
  forecast,
  levelOf,
  nextState,
  planReview,
  rawInterval,
  retrievability,
  scheduleDays,
  targetFor,
  type Grade,
  type MemState,
  type QueueItem,
} from "./fsrs";

/** Percorre uma sequência de notas como no documento: D1 fixo, depois o intervalo calculado. */
function walk(grades: Grade[], target = 0.85) {
  let st: MemState | null = null;
  let gap = 0;
  const out: { s: number; d: number; days: number; r: number | null }[] = [];
  for (const g of grades) {
    const n = nextState(st, gap, g);
    st = n.state;
    gap = scheduleDays(st.stability, { target, maxInterval: 180 });
    out.push({ s: st.stability, d: st.difficulty, days: gap, r: n.r });
  }
  return out;
}

describe("modelo FSRS", () => {
  it("R = 90% quando t = S e cai com o tempo", () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 6);
    expect(retrievability(0, 10)).toBe(1);
    expect(retrievability(30, 10)).toBeLessThan(retrievability(10, 10));
  });

  it("intervalo pela meta: 85% ≈ 1,64 S; 90% = S; 95% ≈ 0,46 S", () => {
    expect(rawInterval(1, 0.85)).toBeCloseTo(1.637, 2);
    expect(rawInterval(1, 0.9)).toBeCloseTo(1, 6);
    expect(rawInterval(1, 0.95)).toBeCloseTo(0.461, 2);
  });

  it("exemplo do documento: Princípios (Bom, Bom, Fácil) → +5, +25, teto de 180", () => {
    const w = walk([3, 3, 4]);
    expect(w.map((x) => x.days)).toEqual([5, 25, 180]);
    expect(w[0].s).toBeCloseTo(3.17, 2);
    expect(w[1].s).toBeCloseTo(15.0, 0);
    expect(w[1].r).toBeCloseTo(0.85, 2);
  });

  it("exemplo do documento: Atributos (Bom, Difícil, Bom, Bom) → +5, +10, +41, +148", () => {
    expect(walk([3, 2, 3, 3]).map((x) => x.days)).toEqual([5, 10, 41, 148]);
  });

  it("exemplo do documento: Contratação direta com esquecimento", () => {
    const w = walk([2, 1, 3, 2, 3, 3]);
    expect(w.map((x) => x.days)).toEqual([2, 1, 4, 6, 18, 50]);
    expect(w[3].d).toBeCloseTo(8.0, 1);
  });

  it("esquecer nunca aumenta a estabilidade; lembrar nunca diminui", () => {
    const base = { stability: 20, difficulty: 5 };
    expect(nextState(base, 20, 1).state.stability).toBeLessThanOrEqual(20);
    for (const g of [2, 3, 4] as Grade[])
      expect(nextState(base, 20, g).state.stability).toBeGreaterThanOrEqual(20);
  });

  it("revisar perto de esquecer rende mais que revisar fresco", () => {
    const base = { stability: 10, difficulty: 5 };
    const early = nextState(base, 2, 3).state.stability;
    const late = nextState(base, 15, 3).state.stability;
    expect(late).toBeGreaterThan(early);
  });

  it("tetos: máximo de dias e véspera da prova", () => {
    expect(scheduleDays(500, { target: 0.85, maxInterval: 180 })).toBe(180);
    expect(scheduleDays(500, { target: 0.85, maxInterval: 180, daysToExam: 20 })).toBe(19);
    expect(scheduleDays(0.1, { target: 0.85 })).toBe(1);
  });

  it("espalhar datas: ±5%, sempre igual para a mesma semente", () => {
    const a = scheduleDays(60, { target: 0.9, seed: "t1:2026-11-10" });
    expect(a).toBe(scheduleDays(60, { target: 0.9, seed: "t1:2026-11-10" }));
    expect(Math.abs(a - 60)).toBeLessThanOrEqual(3);
    expect(scheduleDays(3, { target: 0.9, seed: "x" })).toBe(3);
  });
});

describe("nota da revisão", () => {
  it("aproveitamento corrigido pelo chute", () => {
    expect(correctedScore(8, 10, 5)).toBeCloseTo(0.6, 6); // C/E 8 de 10
    expect(correctedScore(5, 8, 8 * 0.2)).toBeCloseTo(0.53, 2); // ME 5 de 8
    expect(correctedScore(2, 10, 5)).toBe(0);
  });

  it("questões decidem; vale a pior; Fácil precisa de confirmação", () => {
    const q = { total: 8, correct: 5, chanceSum: 1.6 };
    expect(finalGrade({ selfGrade: 1, questions: q })).toMatchObject({
      grade: 1,
      source: "both",
      questionGrade: 2,
    });
    expect(finalGrade({ questions: q })).toMatchObject({ grade: 2, source: "questions" });
    expect(finalGrade({ selfGrade: 3, questions: { total: 3, correct: 3, chanceSum: 0.6 } })).toMatchObject({
      grade: 3,
      source: "self",
    });
    expect(finalGrade({ selfGrade: 4, recent: [] })?.grade).toBe(3);
    expect(finalGrade({ selfGrade: 4, recent: [{ g: 3, t: 0, c: 0 }] })?.grade).toBe(4);
    expect(finalGrade({})).toBeNull();
    expect(finalGrade({ questions: q, practice: true })?.source).toBe("practice");
  });
});

describe("domínio", () => {
  const r = (g: number, t = 0, c = 0) => ({ g, t, c });
  it("níveis pela estabilidade, notas e acertos", () => {
    expect(levelOf({ state: "new", stability: null, difficulty: null, recent: [] })).toBe("novo");
    expect(levelOf({ state: "review", stability: 3, difficulty: 5, recent: [r(3)] })).toBe("fragil");
    expect(levelOf({ state: "review", stability: 12, difficulty: 5, recent: [r(3)] })).toBe("consolidando");
    expect(levelOf({ state: "review", stability: 40, difficulty: 5, recent: [r(3)] })).toBe("consolidado");
    expect(levelOf({ state: "review", stability: 120, difficulty: 5, recent: [r(3), r(4, 10, 9)] })).toBe(
      "dominado",
    );
    expect(levelOf({ state: "review", stability: 120, difficulty: 5, recent: [r(3), r(4, 10, 6)] })).toBe(
      "consolidado",
    );
    expect(levelOf({ state: "review", stability: 40, difficulty: 5, recent: [r(1), r(3), r(1)] })).toBe(
      "critico",
    );
    expect(levelOf({ state: "review", stability: 40, difficulty: 8.5, recent: [r(3)] })).toBe("critico");
  });
});

describe("fila do dia", () => {
  const today = "2026-11-20";
  const item = (id: string, disc: string, over: Partial<QueueItem> = {}): QueueItem => ({
    topicId: id,
    disciplineId: disc,
    dueOn: today,
    state: "review",
    stability: 5,
    lastReviewOn: "2026-11-12",
    incidence: "media",
    minutes: 8,
    ...over,
  });

  it("só o que venceu, por prioridade, até o tempo diário", () => {
    const q = buildQueue(
      [
        item("a", "adm", { lastReviewOn: "2026-11-01" }), // mais esquecido
        item("b", "adm"),
        item("c", "adm", { dueOn: "2026-11-25" }), // não venceu
        item("d", "adm", { incidence: "alta" }),
        item("e", "adm"),
      ],
      today,
      24,
    );
    expect(q.now.map((x) => x.topicId)).toEqual(["a", "d", "b"]);
    expect(q.later.map((x) => x.topicId)).toEqual(["e"]);
    expect(q.minutes).toBe(24);
  });

  it("nenhuma disciplina ocupa mais de 40% quando outras esperam", () => {
    const items = [
      item("a1", "adm", { lastReviewOn: "2026-10-01" }),
      item("a2", "adm", { lastReviewOn: "2026-10-02" }),
      item("a3", "adm", { lastReviewOn: "2026-10-03" }),
      item("p1", "port"),
      item("p2", "port"),
    ];
    const q = buildQueue(items, today, 40);
    const adm = q.now.filter((x) => x.disciplineId === "adm").length;
    expect(adm).toBeLessThanOrEqual(3);
    expect(q.now.some((x) => x.disciplineId === "port")).toBe(true);
    expect(q.minutes).toBeLessThanOrEqual(40);
  });

  it("sempre cabe pelo menos um tópico, mesmo maior que o tempo", () => {
    expect(buildQueue([item("a", "adm", { minutes: 50 })], today, 30).now).toHaveLength(1);
  });

  it("previsão: atrasados contam para hoje", () => {
    const f = forecast(
      [item("a", "x", { dueOn: "2026-11-10" }), item("b", "x", { dueOn: "2026-11-22" })],
      today,
      7,
    );
    expect(f[0]).toMatchObject({ count: 1, minutes: 8 });
    expect(f[2]).toMatchObject({ day: "2026-11-22", count: 1 });
  });
});

describe("metas e calibração", () => {
  it("reta final sobe a meta", () => {
    const s = { ...DEFAULT_SETTINGS, examDate: "2027-01-10" };
    expect(targetFor(s, "2026-11-10")).toBe(0.85);
    expect(targetFor(s, "2026-12-01")).toBe(0.9);
    expect(targetFor(s, "2027-02-01")).toBe(0.85);
  });

  it("encurta quando a retenção real fica abaixo da meta; alonga quando sobra", () => {
    const low = Array.from({ length: 40 }, (_, i) => (i < 30 ? 3 : 1)); // 75%
    expect(calibrate(1, low, 0.85)).toMatchObject({ factor: 0.9 });
    expect(calibrate(1, Array(40).fill(3), 0.85)).toMatchObject({ factor: 1.1 });
    expect(calibrate(1, Array(40).fill(3).fill(1, 0, 5), 0.85)).toBeNull(); // 87,5%: ok
    expect(calibrate(1, [3, 3], 0.85)).toBeNull(); // poucos dados
  });

  it("planReview usa a data real e a meta do dia", () => {
    const p = planReview({
      item: { stability: 3.17, difficulty: 5.3, lastReviewOn: "2026-11-11", topicId: "t" },
      grade: 3,
      reviewedOn: "2026-11-16",
      settings: DEFAULT_SETTINGS,
    });
    expect(p.elapsed).toBe(5);
    expect(p.rBefore).toBeCloseTo(0.85, 2);
    expect(p.dueOn > "2026-12-05").toBe(true);
  });
});
