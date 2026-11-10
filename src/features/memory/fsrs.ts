/**
 * Revisão espaçada adaptativa — modelo FSRS (dificuldade D, estabilidade S, recuperabilidade R).
 *
 * Funções puras: rodam no servidor e no aparelho (offline) com o mesmo resultado.
 * Fórmulas e parâmetros padrão do FSRS de 19 parâmetros; a calibração mensal ajusta só um fator
 * dos intervalos (interval_factor), a partir da retenção real medida nas suas revisões.
 */
import { addDays, daysBetween } from "@/lib/dates";

export const DEFAULT_W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11,
  0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
] as const;
type Weights = readonly number[];

const F = 19 / 81;
const C = -0.5;

export type Grade = 1 | 2 | 3 | 4;
export const GRADES: Grade[] = [1, 2, 3, 4];
export const GRADE_LABELS: Record<Grade, string> = { 1: "Esqueci", 2: "Difícil", 3: "Bom", 4: "Fácil" };
export const GRADE_HINTS: Record<Grade, string> = {
  1: "Não consegui lembrar o essencial",
  2: "Lembrei com esforço ou com lacunas",
  3: "Lembrei os pontos principais",
  4: "Lembrei tudo com folga",
};

export type MemState = { difficulty: number; stability: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Chance de lembrar depois de `elapsed` dias, com estabilidade `stability`. */
export function retrievability(elapsed: number, stability: number) {
  return Math.pow(1 + (F * Math.max(0, elapsed)) / stability, C);
}

/** Dias até a recuperabilidade cair até a meta (sem arredondar). */
export function rawInterval(stability: number, target: number, factor = 1) {
  return (stability / F) * (Math.pow(target, 1 / C) - 1) * factor;
}

function initDifficulty(g: Grade, w: Weights) {
  return clamp(w[4] - Math.exp(w[5] * (g - 1)) + 1, 1, 10);
}

function nextDifficulty(d: number, g: Grade, w: Weights) {
  const delta = -w[6] * (g - 3);
  const dp = d + delta * ((10 - d) / 9);
  return clamp(w[7] * initDifficulty(4, w) + (1 - w[7]) * dp, 1, 10);
}

function stabilityAfterSuccess(d: number, s: number, r: number, g: Grade, w: Weights) {
  const hard = g === 2 ? w[15] : 1;
  const easy = g === 4 ? w[16] : 1;
  return (
    s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp(w[10] * (1 - r)) - 1) * hard * easy)
  );
}

function stabilityAfterLapse(d: number, s: number, r: number, w: Weights) {
  const sf = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r));
  return Math.min(sf, s);
}

/**
 * Novo estado depois de uma revisão com nota `g`.
 * Sem estado anterior (primeira revisão, a D1), a nota define o ponto de partida.
 */
export function nextState(
  prev: MemState | null,
  elapsed: number,
  g: Grade,
  w: Weights = DEFAULT_W,
): { state: MemState; r: number | null } {
  if (!prev) return { state: { difficulty: initDifficulty(g, w), stability: w[g - 1] }, r: null };
  const r = retrievability(elapsed, prev.stability);
  const stability =
    g === 1
      ? stabilityAfterLapse(prev.difficulty, prev.stability, r, w)
      : stabilityAfterSuccess(prev.difficulty, prev.stability, r, g, w);
  return {
    state: { difficulty: nextDifficulty(prev.difficulty, g, w), stability: Math.max(0.01, stability) },
    r,
  };
}

/** Espalha datas próximas numa janela de ±5% (sempre igual para o mesmo tópico e dia). */
function fuzz(days: number, seed: string) {
  if (days < 7) return days;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const unit = ((h >>> 0) % 1000) / 999; // 0..1
  return days + Math.round((unit - 0.5) * 0.1 * days);
}

export type ScheduleOpts = {
  target: number;
  factor?: number;
  maxInterval?: number;
  /** Dias até a prova (a próxima revisão nunca passa da véspera). */
  daysToExam?: number | null;
  /** Para espalhar as datas (ex.: id do tópico + dia). Sem ele, não espalha. */
  seed?: string;
};

/** Próximo intervalo em dias inteiros (mínimo 1). */
export function scheduleDays(stability: number, o: ScheduleOpts) {
  let days = Math.max(1, Math.round(rawInterval(stability, o.target, o.factor ?? 1)));
  if (o.seed) days = Math.max(1, fuzz(days, o.seed));
  days = Math.min(days, o.maxInterval ?? 180);
  if (o.daysToExam != null && o.daysToExam >= 2) days = Math.min(days, o.daysToExam - 1);
  return Math.max(1, days);
}

/* ------------------------------------------------------------------ */
/* Nota da revisão                                                     */
/* ------------------------------------------------------------------ */

export const MIN_QUESTIONS = 5;

/** Chance de acertar no chute: Certo/Errado 50%; múltipla escolha 1 / nº de alternativas. */
export function guessChance(tipo: string, alternatives = 5) {
  return tipo === "certo_errado" ? 0.5 : 1 / Math.max(2, alternatives);
}

/** Aproveitamento descontando o chute: (acertos − chute) / (total − chute), entre 0 e 1. */
export function correctedScore(correct: number, total: number, chanceSum: number) {
  if (total <= 0 || total - chanceSum <= 0) return 0;
  return clamp((correct - chanceSum) / (total - chanceSum), 0, 1);
}

export function gradeFromScore(score: number): Grade {
  if (score < 0.5) return 1;
  if (score < 0.7) return 2;
  if (score < 0.9) return 3;
  return 4;
}

export type RecentReview = { g: number; t: number; c: number };
export type GradeSource = "self" | "questions" | "both" | "practice";

/**
 * Nota final: questões (5 ou mais) decidem; a autoavaliação é a reserva.
 * Com as duas, vale a pior. "Fácil" na autoavaliação só vale se a revisão anterior foi Bom ou Fácil.
 */
export function finalGrade(input: {
  selfGrade?: Grade | null;
  questions?: { total: number; correct: number; chanceSum: number } | null;
  recent?: RecentReview[];
  practice?: boolean;
}): { grade: Grade; source: GradeSource; questionGrade: Grade | null; selfGrade: Grade | null } | null {
  const q = input.questions;
  const questionGrade =
    q && q.total >= MIN_QUESTIONS ? gradeFromScore(correctedScore(q.correct, q.total, q.chanceSum)) : null;
  let self = input.selfGrade ?? null;
  if (self === 4) {
    const last = input.recent?.at(-1);
    if (!last || last.g < 3) self = 3;
  }
  if (questionGrade && self)
    return { grade: Math.min(questionGrade, self) as Grade, source: "both", questionGrade, selfGrade: self };
  if (questionGrade)
    return {
      grade: questionGrade,
      source: input.practice ? "practice" : "questions",
      questionGrade,
      selfGrade: null,
    };
  if (self) return { grade: self, source: "self", questionGrade: null, selfGrade: self };
  return null;
}

/* ------------------------------------------------------------------ */
/* Domínio                                                             */
/* ------------------------------------------------------------------ */

export type Level = "novo" | "fragil" | "consolidando" | "consolidado" | "dominado" | "critico";
export const LEVELS: Level[] = ["critico", "fragil", "consolidando", "consolidado", "dominado", "novo"];
export const LEVEL_LABELS: Record<Level, string> = {
  novo: "Aguardando 1ª revisão",
  fragil: "Frágil",
  consolidando: "Em consolidação",
  consolidado: "Consolidado",
  dominado: "Dominado",
  critico: "Ponto crítico",
};
export const LEVEL_HINTS: Record<Level, string> = {
  novo: "Concluído na Biblioteca; a primeira revisão é no dia seguinte.",
  fragil: "Memória recente: revisões curtas e frequentes.",
  consolidando: "Os intervalos já passam de uma semana.",
  consolidado: "Você lembra por mais de um mês sem revisar.",
  dominado: "Estável há meses e acertando: só manutenção.",
  critico:
    "Não está fixando. Mude a estratégia: divida o tópico, faça um esquema próprio ou uma bateria de questões.",
};

export type LevelInput = {
  state: string;
  stability: number | null;
  difficulty: number | null;
  recent: RecentReview[];
};

export function levelOf(it: LevelInput): Level {
  if (it.state !== "review" || it.stability == null) return "novo";
  const recent = it.recent.slice(-4);
  if (recent.filter((r) => r.g === 1).length >= 2 || (it.difficulty ?? 0) > 8) return "critico";
  if (it.stability < 7) return "fragil";
  if (it.stability < 30) return "consolidando";
  if (it.stability < 90) return "consolidado";
  const last2 = recent.slice(-2);
  const t = recent.reduce((s, r) => s + r.t, 0);
  const c = recent.reduce((s, r) => s + r.c, 0);
  const goodGrades = last2.length === 2 && last2.every((r) => r.g >= 3);
  const goodQuestions = t < MIN_QUESTIONS || c / t >= 0.8;
  return goodGrades && goodQuestions ? "dominado" : "consolidado";
}

/* ------------------------------------------------------------------ */
/* Metas, prioridade e fila do dia                                     */
/* ------------------------------------------------------------------ */

export const INCIDENCE_WEIGHT = { alta: 1.5, media: 1, baixa: 0.6 } as const;
export type Incidence = keyof typeof INCIDENCE_WEIGHT;
export const INCIDENCE_LABELS: Record<Incidence, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

export const FINAL_STRETCH_DAYS = 45;

export type MemorySettings = {
  targetRetention: number;
  finalRetention: number;
  dailyMinutes: number;
  examDate: string | null;
  maxInterval: number;
  intervalFactor: number;
  calibratedAt: string | null;
  params: number[] | null;
};

export const DEFAULT_SETTINGS: MemorySettings = {
  targetRetention: 0.85,
  finalRetention: 0.9,
  dailyMinutes: 30,
  examDate: null,
  maxInterval: 180,
  intervalFactor: 1,
  calibratedAt: null,
  params: null,
};

export function daysToExam(s: Pick<MemorySettings, "examDate">, today: string) {
  if (!s.examDate) return null;
  const d = daysBetween(today, s.examDate);
  return d >= 0 ? d : null;
}

/** Na reta final (até 45 dias antes da prova), a meta sobe. */
export function targetFor(s: MemorySettings, today: string) {
  const d = daysToExam(s, today);
  return d != null && d <= FINAL_STRETCH_DAYS
    ? Math.max(s.finalRetention, s.targetRetention)
    : s.targetRetention;
}

export function weights(s: Pick<MemorySettings, "params">): Weights {
  return s.params?.length === 19 ? s.params : DEFAULT_W;
}

export type ReviewPlan = {
  grade: Grade;
  state: MemState;
  rBefore: number | null;
  scheduledDays: number;
  dueOn: string;
  target: number;
  elapsed: number;
};

/** Calcula tudo o que uma revisão grava: novo estado, próxima data e a meta usada. */
export function planReview(input: {
  item: { stability: number | null; difficulty: number | null; lastReviewOn: string | null; topicId: string };
  grade: Grade;
  reviewedOn: string;
  settings: MemorySettings;
}): ReviewPlan {
  const { item, grade, reviewedOn, settings } = input;
  const prev =
    item.stability != null && item.difficulty != null && item.lastReviewOn
      ? { stability: item.stability, difficulty: item.difficulty }
      : null;
  const elapsed = prev && item.lastReviewOn ? Math.max(0, daysBetween(item.lastReviewOn, reviewedOn)) : 0;
  const { state, r } = nextState(prev, elapsed, grade, weights(settings));
  const target = targetFor(settings, reviewedOn);
  const scheduledDays = scheduleDays(state.stability, {
    target,
    factor: settings.intervalFactor,
    maxInterval: settings.maxInterval,
    daysToExam: daysToExam(settings, reviewedOn),
    seed: `${item.topicId}:${reviewedOn}`,
  });
  return {
    grade,
    state,
    rBefore: r,
    scheduledDays,
    dueOn: addDays(reviewedOn, scheduledDays),
    target,
    elapsed,
  };
}

export type QueueItem = {
  topicId: string;
  disciplineId: string;
  dueOn: string;
  state: string;
  stability: number | null;
  lastReviewOn: string | null;
  incidence: Incidence;
  minutes: number;
};

export type Ranked<T> = T & { r: number | null; overdue: number; priority: number };

/** Chance de lembrar hoje (itens novos: null). */
export function currentR(it: Pick<QueueItem, "stability" | "lastReviewOn">, today: string) {
  if (it.stability == null || !it.lastReviewOn) return null;
  return retrievability(Math.max(0, daysBetween(it.lastReviewOn, today)), it.stability);
}

/** prioridade = (1 − R hoje) × peso no edital × (1 + atraso / intervalo). */
export function priorityOf(it: QueueItem, today: string) {
  const r = currentR(it, today);
  const overdue = Math.max(0, daysBetween(it.dueOn, today));
  const interval = it.lastReviewOn ? Math.max(1, daysBetween(it.lastReviewOn, it.dueOn)) : 1;
  const risk = r == null ? 0.25 : 1 - r; // novo: perto de quem caiu para ~75%
  return { r, overdue, priority: risk * INCIDENCE_WEIGHT[it.incidence] * (1 + overdue / interval) };
}

/**
 * Fila do dia: só o que venceu, por prioridade, até o tempo diário. Nenhuma disciplina passa de 40%
 * do tempo enquanto houver outra vencida esperando. O que não coube fica para depois, na mesma ordem.
 */
export function buildQueue<T extends QueueItem>(items: T[], today: string, dailyMinutes: number) {
  const due = items
    .filter((i) => i.state !== "suspended" && i.dueOn <= today)
    .map((i) => ({ ...i, ...priorityOf(i, today) }))
    .sort((a, b) => b.priority - a.priority || a.dueOn.localeCompare(b.dueOn));
  const disciplines = new Set(due.map((d) => d.disciplineId));
  const cap = disciplines.size > 1 ? dailyMinutes * 0.4 : Infinity;
  const used = new Map<string, number>();
  const now: Ranked<T>[] = [];
  const later: Ranked<T>[] = [];
  let total = 0;
  for (const it of due) {
    const per = used.get(it.disciplineId) ?? 0;
    const fits = total + it.minutes <= dailyMinutes || now.length === 0;
    if (fits && per + it.minutes <= Math.max(cap, it.minutes)) {
      now.push(it);
      total += it.minutes;
      used.set(it.disciplineId, per + it.minutes);
    } else later.push(it);
  }
  // Sobrou tempo porque o limite por disciplina segurou itens? Completa com eles.
  for (const it of [...later]) {
    if (total + it.minutes > dailyMinutes) continue;
    now.push(it);
    later.splice(later.indexOf(it), 1);
    total += it.minutes;
  }
  return { now, later, minutes: total };
}

/** Minutos por dia nos próximos `days` dias (o que está atrasado conta para hoje). */
export function forecast(
  items: Pick<QueueItem, "dueOn" | "state" | "minutes">[],
  today: string,
  days: number,
) {
  const out = Array.from({ length: days }, (_, i) => ({ day: addDays(today, i), count: 0, minutes: 0 }));
  for (const it of items) {
    if (it.state === "suspended") continue;
    const i = Math.max(0, daysBetween(today, it.dueOn));
    if (i >= days) continue;
    out[i].count += 1;
    out[i].minutes += it.minutes;
  }
  return out;
}

export const DEFAULT_MINUTES = 8;

/** Calibração mensal: retenção real × meta. Devolve o novo fator, ou null se não há o que mudar. */
export function calibrate(factor: number, grades: number[], target: number) {
  if (grades.length < 30) return null;
  const real = grades.filter((g) => g > 1).length / grades.length;
  let next = factor;
  if (real < target - 0.05) next = factor * 0.9;
  else if (real >= 0.95 && target < 0.95) next = factor * 1.1;
  next = Math.round(clamp(next, 0.5, 2) * 100) / 100;
  return next === factor ? null : { factor: next, real };
}
