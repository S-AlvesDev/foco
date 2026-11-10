"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { addDays, daysBetween } from "@/lib/dates";
import { dbErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { isQuestionAdmin } from "@/features/questions/queries";
import {
  calibrate,
  finalGrade,
  gradeFromScore,
  correctedScore,
  levelOf,
  planReview,
  targetFor,
  type Grade,
  type Level,
  type RecentReview,
} from "./fsrs";
import { getMemorySettings, getReviewMaterial, memoryToday, type ReviewMaterial } from "./queries";

type Fail = { ok: false; message: string };
const ID = z.string().regex(/^[a-z0-9][a-z0-9_.-]{0,159}$/);
const ISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const grade = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const recordSchema = z.object({
  clientId: z.uuid(),
  topicId: ID,
  reviewedOn: ISO.optional(),
  selfGrade: grade.nullable().optional(),
  questions: z
    .object({
      total: z.number().int().min(0).max(200),
      correct: z.number().int().min(0).max(200),
      chanceSum: z.number().min(0).max(200),
    })
    .refine((q) => q.correct <= q.total)
    .nullable()
    .optional(),
  seconds: z.number().int().min(0).max(86400).nullable().optional(),
});
export type RecordInput = z.input<typeof recordSchema>;

export type RecordResult =
  | {
      ok: true;
      grade: Grade;
      source: string;
      questionGrade: Grade | null;
      dueOn: string;
      scheduledDays: number;
      level: Level;
      rBefore: number | null;
    }
  | Fail;

/** Grava uma revisão: calcula a nota, o novo estado e a próxima data (modelo FSRS). */
export async function recordReviewAction(raw: RecordInput): Promise<RecordResult> {
  await requireUser();
  return record(raw, {});
}

async function record(raw: RecordInput, opts: { forced?: Grade }): Promise<RecordResult> {
  const parsed = recordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Dados da revisão inválidos." };
  const input = parsed.data;
  const supabase = await createClient();
  const [today, settings, itemRes] = await Promise.all([
    memoryToday(),
    getMemorySettings(),
    supabase
      .from("memory_items")
      .select("topic_id, state, stability, difficulty, last_review_on, recent")
      .eq("topic_id", input.topicId)
      .maybeSingle(),
  ]);
  if (itemRes.error) return { ok: false, message: dbErrorMessage(itemRes.error) };
  const item = itemRes.data;
  if (!item) return { ok: false, message: "Este tópico ainda não está nas suas revisões." };
  const recent = (Array.isArray(item.recent) ? item.recent : []) as RecentReview[];
  const reviewedOn = input.reviewedOn && input.reviewedOn <= today ? input.reviewedOn : today;
  const g = opts.forced
    ? { grade: opts.forced, source: "practice" as const, questionGrade: opts.forced, selfGrade: null }
    : finalGrade({
        selfGrade: (input.selfGrade ?? null) as Grade | null,
        questions: input.questions ?? null,
        recent,
      });
  if (!g) return { ok: false, message: "Avalie a revisão ou responda pelo menos 5 questões." };
  const plan = planReview({
    item: {
      topicId: item.topic_id,
      stability: item.stability,
      difficulty: item.difficulty,
      lastReviewOn: item.last_review_on,
    },
    grade: g.grade,
    reviewedOn,
    settings,
  });
  const { data, error } = await supabase.rpc("memory_record", {
    p: {
      topic_id: input.topicId,
      client_id: input.clientId,
      reviewed_on: reviewedOn,
      grade: g.grade,
      source: g.source,
      self_grade: g.selfGrade,
      questions_total: input.questions?.total ?? 0,
      questions_correct: input.questions?.correct ?? 0,
      seconds: input.seconds ?? null,
      r_before: plan.rBefore,
      s_after: plan.state.stability,
      d_after: plan.state.difficulty,
      scheduled_days: plan.scheduledDays,
      target: plan.target,
    },
  });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  const row = (Array.isArray(data) ? data[0] : data) as {
    state: string;
    stability: number | null;
    difficulty: number | null;
    recent: unknown;
    due_on: string;
  } | null;
  await maybeCalibrate(today).catch(() => {});
  return {
    ok: true,
    grade: g.grade,
    source: g.source,
    questionGrade: g.questionGrade,
    dueOn: row?.due_on ?? plan.dueOn,
    scheduledDays: plan.scheduledDays,
    rBefore: plan.rBefore,
    level: row
      ? levelOf({
          state: row.state,
          stability: row.stability,
          difficulty: row.difficulty,
          recent: (Array.isArray(row.recent) ? row.recent : []) as RecentReview[],
        })
      : "fragil",
  };
}

/** Uma vez por mês: compara a retenção real dos últimos 30 dias com a meta e ajusta os intervalos. */
async function maybeCalibrate(today: string) {
  const settings = await getMemorySettings();
  if (settings.calibratedAt && daysBetween(settings.calibratedAt.slice(0, 10), today) < 30) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("memory_reviews")
    .select("grade")
    .gte("reviewed_on", addDays(today, -30));
  const res = calibrate(
    settings.intervalFactor,
    (data ?? []).map((r) => r.grade),
    targetFor(settings, today),
  );
  if ((data ?? []).length < 30) return;
  await supabase.from("memory_settings").upsert(
    {
      interval_factor: res?.factor ?? settings.intervalFactor,
      calibrated_at: new Date().toISOString(),
      target_retention: settings.targetRetention,
    },
    { onConflict: "user_id" },
  );
}

/** Material da revisão de um tópico: esquema, marcações e questões ligadas. */
export async function loadReviewMaterialAction(
  topicId: string,
): Promise<{ ok: true; material: ReviewMaterial } | Fail> {
  await requireUser();
  if (!ID.safeParse(topicId).success) return { ok: false, message: "Tópico inválido." };
  try {
    return { ok: true, material: await getReviewMaterial(topicId) };
  } catch (e) {
    return {
      ok: false,
      message: dbErrorMessage(e as { code?: string }) || "Não foi possível abrir a revisão.",
    };
  }
}

/** Adiar para amanhã, sem efeito em cascata (só muda a data deste tópico). */
export async function postponeReviewAction(topicId: string): Promise<{ ok: true; dueOn: string } | Fail> {
  await requireUser();
  if (!ID.safeParse(topicId).success) return { ok: false, message: "Tópico inválido." };
  const today = await memoryToday();
  const due = addDays(today, 1);
  const supabase = await createClient();
  const { error } = await supabase
    .from("memory_items")
    .update({ due_on: due })
    .eq("topic_id", topicId)
    .lte("due_on", today);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  refresh();
  return { ok: true, dueOn: due };
}

/** Incluir nas revisões um tópico concluído antes do sistema existir (ou tirado da lista). */
export async function startMemoryAction(topicId: string): Promise<{ ok: true } | Fail> {
  await requireUser();
  if (!ID.safeParse(topicId).success) return { ok: false, message: "Tópico inválido." };
  const today = await memoryToday();
  const supabase = await createClient();
  const { error } = await supabase
    .from("memory_items")
    .upsert(
      { topic_id: topicId, due_on: addDays(today, 1) },
      { onConflict: "user_id,topic_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, message: dbErrorMessage(error) };
  refresh();
  return { ok: true };
}

/** Tirar das revisões (o histórico continua guardado) ou voltar. */
export async function suspendMemoryAction(topicId: string, suspend: boolean): Promise<{ ok: true } | Fail> {
  await requireUser();
  if (!ID.safeParse(topicId).success) return { ok: false, message: "Tópico inválido." };
  const supabase = await createClient();
  const today = await memoryToday();
  const { data: it } = await supabase
    .from("memory_items")
    .select("reps")
    .eq("topic_id", topicId)
    .maybeSingle();
  const { error } = await supabase
    .from("memory_items")
    .update(
      suspend
        ? { state: "suspended" }
        : { state: it && it.reps > 0 ? "review" : "new", due_on: addDays(today, 1) },
    )
    .eq("topic_id", topicId);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  refresh();
  return { ok: true };
}

const settingsSchema = z.object({
  targetRetention: z.coerce.number().refine((v) => [0.8, 0.85, 0.9].includes(v), "Meta inválida."),
  dailyMinutes: z.coerce.number().int().min(5, "Mínimo de 5 minutos.").max(240, "Máximo de 240 minutos."),
  examDate: z.union([ISO, z.literal("")]).optional(),
});

export async function saveMemorySettingsAction(
  _prev: unknown,
  form: FormData,
): Promise<{ ok: true; message: string } | Fail> {
  await requireUser();
  const parsed = settingsSchema.safeParse({
    targetRetention: form.get("targetRetention"),
    dailyMinutes: form.get("dailyMinutes"),
    examDate: form.get("examDate") ?? "",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const today = await memoryToday();
  if (parsed.data.examDate && parsed.data.examDate < today)
    return { ok: false, message: "A data da prova já passou." };
  const supabase = await createClient();
  const { error } = await supabase.from("memory_settings").upsert(
    {
      target_retention: parsed.data.targetRetention,
      daily_minutes: parsed.data.dailyMinutes,
      exam_date: parsed.data.examDate || null,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, message: dbErrorMessage(error) };
  refresh();
  return { ok: true, message: "Ajustes salvos." };
}

/**
 * Questões resolvidas fora da revisão contam como revisão do tópico ligado:
 * 5 respostas no mesmo dia, ou 3 erros (nesse caso, nota no máximo Difícil).
 * Nunca atrapalha a resposta: qualquer falha é ignorada.
 */
export async function recordPracticeFromQuestion(questionId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("memory_practice_stats", { p_question: questionId });
    if (error || !data?.length) return;
    for (const s of data) {
      const enough = s.total >= 5;
      if (!enough && s.wrong < 3) continue;
      let g = gradeFromScore(correctedScore(s.correct, s.total, Number(s.chance_sum)));
      if (s.wrong >= 3) g = Math.min(g, 2) as Grade;
      await record(
        {
          clientId: crypto.randomUUID(),
          topicId: s.topic_id,
          questions: { total: s.total, correct: s.correct, chanceSum: Number(s.chance_sum) },
        },
        { forced: g },
      );
    }
  } catch {}
}

/* ------------------------------------------------------------------ */
/* Administração: peso no edital e ligação com as questões             */
/* ------------------------------------------------------------------ */

export type LinkOptions = {
  incidence: "alta" | "media" | "baixa";
  links: { disciplina: string; assunto: string }[];
  subjects: { disciplina: string; assunto: string; total: number }[];
};

export async function getLinkOptionsAction(topicId: string): Promise<({ ok: true } & LinkOptions) | Fail> {
  await requireUser();
  if (!(await isQuestionAdmin())) return { ok: false, message: "Só a conta administradora." };
  if (!ID.safeParse(topicId).success) return { ok: false, message: "Tópico inválido." };
  const supabase = await createClient();
  const [meta, links, subjects] = await Promise.all([
    supabase.from("library_topic_meta").select("incidence").eq("topic_id", topicId).maybeSingle(),
    supabase
      .from("library_topic_links")
      .select("disciplina, assunto")
      .eq("topic_id", topicId)
      .order("assunto"),
    supabase.rpc("question_subjects"),
  ]);
  const err = meta.error ?? links.error ?? subjects.error;
  if (err) return { ok: false, message: dbErrorMessage(err) };
  return {
    ok: true,
    incidence: (meta.data?.incidence as LinkOptions["incidence"]) ?? "media",
    links: links.data ?? [],
    subjects: (subjects.data ?? []).map((s) => ({ ...s, total: Number(s.total) })),
  };
}

const linksSchema = z.object({
  topicId: ID,
  incidence: z.enum(["alta", "media", "baixa"]),
  links: z
    .array(
      z.object({ disciplina: z.string().trim().min(1).max(120), assunto: z.string().trim().min(1).max(200) }),
    )
    .max(50),
});

export async function saveTopicLinksAction(input: z.input<typeof linksSchema>): Promise<{ ok: true } | Fail> {
  await requireUser();
  if (!(await isQuestionAdmin())) return { ok: false, message: "Só a conta administradora." };
  const parsed = linksSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };
  const { topicId, incidence, links } = parsed.data;
  const supabase = await createClient();
  const m = await supabase.from("library_topic_meta").upsert({ topic_id: topicId, incidence });
  if (m.error) return { ok: false, message: dbErrorMessage(m.error) };
  const del = await supabase.from("library_topic_links").delete().eq("topic_id", topicId);
  if (del.error) return { ok: false, message: dbErrorMessage(del.error) };
  if (links.length) {
    const ins = await supabase
      .from("library_topic_links")
      .insert(links.map((l) => ({ topic_id: topicId, disciplina: l.disciplina, assunto: l.assunto })));
    if (ins.error) return { ok: false, message: dbErrorMessage(ins.error) };
  }
  refresh();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Offline                                                             */
/* ------------------------------------------------------------------ */

type SyncResult = { ok: true } | { ok: false; permanent: boolean; message: string };

export async function syncOfflineMemoryAction(payload: RecordInput): Promise<SyncResult> {
  await requireUser();
  const r = await record(payload, {});
  if (r.ok) return { ok: true };
  // Revisão mais recente já registrada (ex.: feita em outro aparelho) ou dados inválidos: não adianta repetir.
  const permanent = /mais recente|inválid|ainda não está|Avalie/.test(r.message);
  return { ok: false, permanent, message: r.message };
}

const metaSchema = z
  .array(
    z.object({
      topicId: ID,
      incidence: z.enum(["alta", "media", "baixa"]).optional(),
      links: z
        .array(
          z.object({
            disciplina: z.string().trim().min(1).max(120),
            assunto: z.string().trim().min(1).max(200),
          }),
        )
        .max(50)
        .optional(),
    }),
  )
  .max(5000);

/** Importação da Biblioteca: grava peso e assuntos de questões dos tópicos que trouxeram esses campos. */
export async function importTopicMetaAction(
  entries: z.input<typeof metaSchema>,
): Promise<{ ok: true; topics: number } | Fail> {
  await requireUser();
  if (!(await isQuestionAdmin())) return { ok: false, message: "Só a conta administradora." };
  const parsed = metaSchema.safeParse(entries);
  if (!parsed.success) return { ok: false, message: "Dados de incidência/assuntos inválidos." };
  const supabase = await createClient();
  const withIncidence = parsed.data.filter((e) => e.incidence);
  if (withIncidence.length) {
    const r = await supabase
      .from("library_topic_meta")
      .upsert(withIncidence.map((e) => ({ topic_id: e.topicId, incidence: e.incidence! })));
    if (r.error) return { ok: false, message: dbErrorMessage(r.error) };
  }
  const withLinks = parsed.data.filter((e) => e.links);
  if (withLinks.length) {
    const del = await supabase
      .from("library_topic_links")
      .delete()
      .in(
        "topic_id",
        withLinks.map((e) => e.topicId),
      );
    if (del.error) return { ok: false, message: dbErrorMessage(del.error) };
    const rows = withLinks.flatMap((e) =>
      [...new Map(e.links!.map((l) => [`${l.disciplina}\u0000${l.assunto}`, l])).values()].map((l) => ({
        topic_id: e.topicId,
        disciplina: l.disciplina,
        assunto: l.assunto,
      })),
    );
    for (let i = 0; i < rows.length; i += 500) {
      const ins = await supabase.from("library_topic_links").insert(rows.slice(i, i + 500));
      if (ins.error) return { ok: false, message: dbErrorMessage(ins.error) };
    }
  }
  return { ok: true, topics: new Set([...withIncidence, ...withLinks].map((e) => e.topicId)).size };
}
