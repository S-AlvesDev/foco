import "server-only";
import { cache } from "react";
import { getProfile } from "@/lib/auth";
import { addDays, addMonths, daysBetween, monthStartOf } from "@/lib/dates";
import { localDateISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/features/questions/queries";
import type { PublicQuestion } from "@/features/questions/queries";
import {
  buildQueue,
  currentR,
  DEFAULT_MINUTES,
  DEFAULT_SETTINGS,
  forecast,
  INCIDENCE_WEIGHT,
  levelOf,
  targetFor,
  type Incidence,
  type Level,
  type MemorySettings,
  type QueueItem,
  type RecentReview,
} from "./fsrs";

export class MemoryNotInstalled extends Error {
  constructor() {
    super("MEMORY_NOT_INSTALLED");
  }
}

function check<T extends { error: { code?: string; message?: string } | null }>(res: T): T {
  if (isMissingSchema(res.error)) throw new MemoryNotInstalled();
  if (res.error) throw res.error;
  return res;
}

export const memoryToday = cache(async () => {
  const profile = await getProfile();
  return localDateISO(profile.timezone, new Date());
});

export const getMemorySettings = cache(async (): Promise<MemorySettings> => {
  const supabase = await createClient();
  const { data } = check(await supabase.from("memory_settings").select("*").maybeSingle());
  if (!data) return DEFAULT_SETTINGS;
  return {
    targetRetention: Number(data.target_retention),
    finalRetention: Number(data.final_retention),
    dailyMinutes: data.daily_minutes,
    examDate: data.exam_date,
    maxInterval: data.max_interval,
    intervalFactor: Number(data.interval_factor),
    calibratedAt: data.calibrated_at,
    params: Array.isArray(data.params) ? (data.params as number[]) : null,
  };
});

export type MemoryItem = QueueItem & {
  topicNumber: string | null;
  topicTitle: string;
  disciplineName: string;
  difficulty: number | null;
  reps: number;
  lapses: number;
  recent: RecentReview[];
  contentChanged: boolean;
  level: Level;
  hasQuestions: boolean;
};

const ITEM_COLUMNS =
  "topic_id, state, difficulty, stability, last_review_on, due_on, reps, lapses, recent, content_changed_at, library_topics!inner(id, number, title, discipline_id, archived_at, library_disciplines!inner(name, archived_at))";

/** Todos os itens de memória da pessoa (só de tópicos visíveis e não arquivados). */
export const getMemoryItems = cache(async (): Promise<MemoryItem[]> => {
  const supabase = await createClient();
  const [items, meta, links, times] = await Promise.all([
    supabase.from("memory_items").select(ITEM_COLUMNS).is("library_topics.archived_at", null),
    supabase.from("library_topic_meta").select("topic_id, incidence"),
    supabase.from("library_topic_links").select("topic_id"),
    supabase.from("memory_reviews").select("topic_id, seconds").not("seconds", "is", null).limit(5000),
  ]);
  for (const r of [items, meta, links, times]) check(r);
  const incidence = new Map((meta.data ?? []).map((m) => [m.topic_id, m.incidence as Incidence]));
  const linked = new Set((links.data ?? []).map((l) => l.topic_id));
  const secs = new Map<string, number[]>();
  for (const t of times.data ?? []) secs.set(t.topic_id, [...(secs.get(t.topic_id) ?? []), t.seconds ?? 0]);
  const all = [...secs.values()].flat();
  const globalMin = all.length ? avg(all) / 60 : DEFAULT_MINUTES;
  return (items.data ?? [])
    .filter((r) => !r.library_topics.library_disciplines.archived_at)
    .map((r) => {
      const own = secs.get(r.topic_id);
      const recent = (Array.isArray(r.recent) ? r.recent : []) as RecentReview[];
      const base = {
        topicId: r.topic_id,
        disciplineId: r.library_topics.discipline_id,
        dueOn: r.due_on,
        state: r.state,
        stability: r.stability,
        lastReviewOn: r.last_review_on,
        incidence: incidence.get(r.topic_id) ?? "media",
        minutes: clampMinutes(own?.length ? avg(own) / 60 : globalMin),
      };
      return {
        ...base,
        topicNumber: r.library_topics.number,
        topicTitle: r.library_topics.title,
        disciplineName: r.library_topics.library_disciplines.name,
        difficulty: r.difficulty,
        reps: r.reps,
        lapses: r.lapses,
        recent,
        contentChanged: Boolean(r.content_changed_at),
        level: levelOf({ state: r.state, stability: r.stability, difficulty: r.difficulty, recent }),
        hasQuestions: linked.has(r.topic_id),
      };
    });
});

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const clampMinutes = (m: number) => Math.min(40, Math.max(3, Math.round(m)));

export type Queue = {
  today: string;
  settings: MemorySettings;
  target: number;
  now: (MemoryItem & { r: number | null; overdue: number; priority: number })[];
  later: (MemoryItem & { r: number | null; overdue: number; priority: number })[];
  minutes: number;
  total: number;
  forecast: { day: string; count: number; minutes: number }[];
  overloadFrom: string | null;
  attention: AttentionItem[];
};

export type AttentionItem = {
  disciplineId: string;
  name: string;
  avgR: number;
  critical: number;
  realRetention: number | null;
  reason: string;
};

/** Fila de hoje, previsão de 30 dias e disciplinas que pedem atenção. */
export async function getQueue(): Promise<Queue> {
  const [today, settings, items] = await Promise.all([memoryToday(), getMemorySettings(), getMemoryItems()]);
  const q = buildQueue(items, today, settings.dailyMinutes);
  const fc = forecast(items, today, 30);
  // Sobrecarga: algum dia dos próximos 14 passa do tempo diário (sem contar hoje, que já tem fila).
  const over = fc.slice(1, 14).find((d) => d.minutes > settings.dailyMinutes);
  return {
    today,
    settings,
    target: targetFor(settings, today),
    now: q.now,
    later: q.later,
    minutes: q.minutes,
    total: items.length,
    forecast: fc,
    overloadFrom: over?.day ?? null,
    attention: await getAttention(items, today),
  };
}

async function getAttention(items: MemoryItem[], today: string): Promise<AttentionItem[]> {
  const supabase = await createClient();
  const { data } = check(
    await supabase
      .from("memory_reviews")
      .select("grade, library_topics!inner(discipline_id)")
      .gte("reviewed_on", addDays(today, -90)),
  );
  const real = new Map<string, { n: number; ok: number }>();
  for (const r of data ?? []) {
    const d = r.library_topics.discipline_id;
    const cur = real.get(d) ?? { n: 0, ok: 0 };
    cur.n += 1;
    if (r.grade > 1) cur.ok += 1;
    real.set(d, cur);
  }
  const by = new Map<string, MemoryItem[]>();
  for (const it of items)
    if (it.state === "review") by.set(it.disciplineId, [...(by.get(it.disciplineId) ?? []), it]);
  const out: (AttentionItem & { score: number })[] = [];
  for (const [id, list] of by) {
    let wsum = 0;
    let rsum = 0;
    for (const it of list) {
      const w = INCIDENCE_WEIGHT[it.incidence];
      wsum += w;
      rsum += w * (currentR(it, today) ?? 1);
    }
    const avgR = wsum ? rsum / wsum : 1;
    const critical = list.filter((i) => i.level === "critico").length;
    const rr = real.get(id);
    const realRetention = rr && rr.n >= 10 ? rr.ok / rr.n : null;
    const reasons = [
      avgR < 0.85 ? `retenção prevista ${Math.round(avgR * 100)}%` : null,
      realRetention != null && realRetention < 0.8
        ? `retenção real ${Math.round(realRetention * 100)}%`
        : null,
      critical ? `${critical} ${critical === 1 ? "ponto crítico" : "pontos críticos"}` : null,
    ].filter(Boolean) as string[];
    if (!reasons.length) continue;
    out.push({
      disciplineId: id,
      name: list[0].disciplineName,
      avgR,
      critical,
      realRetention,
      reason: reasons.join(" · "),
      score: 1 - avgR + critical * 0.05 + (realRetention != null ? Math.max(0, 0.85 - realRetention) : 0),
    });
  }
  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((a) => ({
      disciplineId: a.disciplineId,
      name: a.name,
      avgR: a.avgR,
      critical: a.critical,
      realRetention: a.realRetention,
      reason: a.reason,
    }));
}

/** Estado de um tópico para o leitor (null = não está nas revisões). */
export async function getTopicMemory(topicId: string) {
  try {
    const items = await getMemoryItems();
    const it = items.find((i) => i.topicId === topicId);
    return it ? { level: it.level, dueOn: it.dueOn, state: it.state, today: await memoryToday() } : null;
  } catch (e) {
    if (e instanceof MemoryNotInstalled) return null;
    throw e;
  }
}

/** Nível de cada tópico de uma disciplina (para o índice). */
export async function getDisciplineLevels(disciplineId: string): Promise<Record<string, Level>> {
  try {
    const items = await getMemoryItems();
    return Object.fromEntries(
      items.filter((i) => i.disciplineId === disciplineId).map((i) => [i.topicId, i.level]),
    );
  } catch (e) {
    if (e instanceof MemoryNotInstalled) return {};
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Material do modo revisão                                            */
/* ------------------------------------------------------------------ */

export type ReviewQuestion = PublicQuestion & { choices: number };
export type ReviewMaterial = {
  topicId: string;
  outline: { depth: number; text: string }[];
  marks: { kind: "highlight" | "note"; color: string | null; quote: string | null; body: string | null }[];
  questions: ReviewQuestion[];
};

export async function getReviewMaterial(topicId: string): Promise<ReviewMaterial> {
  const supabase = await createClient();
  const [topic, subs, heads, marks, qids] = await Promise.all([
    supabase.from("library_topics").select("id, title").eq("id", topicId).maybeSingle(),
    supabase
      .from("library_topics")
      .select("id, title, number")
      .eq("parent_id", topicId)
      .is("archived_at", null)
      .order("position"),
    supabase
      .from("library_blocks")
      .select("topic_id, kind, data, position")
      .eq("topic_id", topicId)
      .eq("kind", "titulo")
      .is("archived_at", null)
      .order("position"),
    supabase
      .from("library_marks")
      .select("kind, color, quote, body, block_id")
      .eq("topic_id", topicId)
      .in("kind", ["highlight", "note"])
      .order("created_at"),
    supabase.rpc("memory_topic_questions", { p_topic: topicId, p_limit: 8 }),
  ]);
  for (const r of [topic, subs, heads, marks, qids]) check(r);
  const outline: ReviewMaterial["outline"] = [];
  for (const h of heads.data ?? []) {
    const d = h.data as { texto?: string; nivel?: number };
    if (d.texto) outline.push({ depth: Math.max(0, (d.nivel ?? 3) - 3), text: stripMarkup(d.texto) });
  }
  for (const s of subs.data ?? [])
    outline.push({ depth: 0, text: [s.number, s.title].filter(Boolean).join(" ") });

  const ids = (qids.data ?? []).map((q) => q.id);
  const choices = new Map((qids.data ?? []).map((q) => [q.id, q.choices]));
  let questions: ReviewQuestion[] = [];
  if (ids.length) {
    const { data } = check(
      await supabase
        .from("questions")
        .select(
          "id, area, concurso, cargo, disciplina, assunto, subassunto, banca_referencia, tipo, dificuldade, enunciado, alternativas, origem",
        )
        .in("id", ids),
    );
    const byId = new Map((data ?? []).map((q) => [q.id, q]));
    questions = ids.flatMap((id) => {
      const q = byId.get(id);
      if (!q) return [];
      return [
        {
          ...q,
          banca: q.banca_referencia,
          tipo: q.tipo as PublicQuestion["tipo"],
          alternativas: (q.alternativas as Record<string, string> | null) ?? null,
          choices: choices.get(id) ?? 2,
        },
      ];
    });
  }
  return {
    topicId,
    outline,
    marks: (marks.data ?? []).map((m) => ({
      kind: m.kind as "highlight" | "note",
      color: m.color,
      quote: m.quote,
      body: m.body,
    })),
    questions,
  };
}

const stripMarkup = (s: string) => s.replace(/\\([$*])/g, "$1").replace(/\*\*?([^*]+)\*\*?/g, "$1");

/* ------------------------------------------------------------------ */
/* Estatísticas                                                        */
/* ------------------------------------------------------------------ */

export type MonthStat = {
  month: string;
  reviews: number;
  retained: number;
  real: number | null;
  target: number | null;
};
export type HistoryRow = {
  id: string;
  topicId: string;
  disciplineId: string;
  topicTitle: string;
  topicNumber: string | null;
  disciplineName: string;
  reviewedOn: string;
  grade: number;
  source: string;
  questionsTotal: number;
  questionsCorrect: number;
  scheduledDays: number;
  minutes: number | null;
};

export async function getMemoryStats(months = 6) {
  const [today, items] = await Promise.all([memoryToday(), getMemoryItems()]);
  const from = addMonths(monthStartOf(today), -(months - 1));
  const supabase = await createClient();
  const { data } = check(
    await supabase
      .from("memory_reviews")
      .select(
        "id, topic_id, reviewed_on, grade, source, questions_total, questions_correct, scheduled_days, seconds, target, library_topics!inner(number, title, discipline_id, library_disciplines!inner(name))",
      )
      .gte("reviewed_on", from)
      .order("reviewed_on", { ascending: false })
      .order("reviewed_at", { ascending: false })
      .limit(5000),
  );
  const rows = data ?? [];
  const monthsList = Array.from({ length: months }, (_, i) => addMonths(from, i));
  const stats: MonthStat[] = monthsList.map((m) => {
    const inMonth = rows.filter((r) => r.reviewed_on.slice(0, 7) === m.slice(0, 7));
    const retained = inMonth.filter((r) => r.grade > 1).length;
    const targets = inMonth.map((r) => r.target).filter((t): t is number => t != null);
    return {
      month: m,
      reviews: inMonth.length,
      retained,
      real: inMonth.length ? retained / inMonth.length : null,
      target: targets.length ? avg(targets) : null,
    };
  });
  const levels = Object.fromEntries(
    (["critico", "fragil", "consolidando", "consolidado", "dominado", "novo"] as Level[]).map((l) => [
      l,
      items.filter((i) => i.level === l).length,
    ]),
  ) as Record<Level, number>;
  const history: HistoryRow[] = rows.slice(0, 60).map((r) => ({
    id: r.id,
    topicId: r.topic_id,
    disciplineId: r.library_topics.discipline_id,
    topicTitle: r.library_topics.title,
    topicNumber: r.library_topics.number,
    disciplineName: r.library_topics.library_disciplines.name,
    reviewedOn: r.reviewed_on,
    grade: r.grade,
    source: r.source,
    questionsTotal: r.questions_total,
    questionsCorrect: r.questions_correct,
    scheduledDays: r.scheduled_days,
    minutes: r.seconds != null ? Math.max(1, Math.round(r.seconds / 60)) : null,
  }));
  const last30 = rows.filter((r) => daysBetween(r.reviewed_on, today) < 30);
  return {
    today,
    months: stats,
    levels,
    history,
    totalItems: items.length,
    withoutQuestions: items.filter((i) => !i.hasQuestions).length,
    last30: { reviews: last30.length, retained: last30.filter((r) => r.grade > 1).length },
  };
}

/** Histórico de um tópico (linha do tempo no leitor/modo revisão). */
export async function getTopicHistory(topicId: string) {
  const supabase = await createClient();
  const { data } = check(
    await supabase
      .from("memory_reviews")
      .select("reviewed_on, grade, source, questions_total, questions_correct, scheduled_days")
      .eq("topic_id", topicId)
      .order("reviewed_at", { ascending: false })
      .limit(20),
  );
  return data ?? [];
}
