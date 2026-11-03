"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { addDays, daysBetween } from "@/lib/dates";
import { localDateISO } from "@/lib/format";
import { uuid } from "@/features/subjects/schemas";

type Field = "subject" | "topic" | "dates";
export type ReviewResult = { ok: true } | { ok: false; message: string; field?: Field };
const fail = (message: string, field?: Field): ReviewResult => ({ ok: false, message, field });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const topic = z.string().trim().min(1, "Diga o assunto que vai revisar.").max(200, "Use até 200 caracteres.");

async function today() {
  const profile = await getProfile();
  return localDateISO(profile.timezone, new Date());
}

function firstIssue(err: z.ZodError): ReviewResult {
  const issue = err.issues[0];
  const key = issue?.path[0];
  const field: Field | undefined =
    key === "subjectId" ? "subject" : key === "topic" ? "topic" : key === "dates" ? "dates" : undefined;
  return fail(issue?.message ?? "Dados inválidos.", field);
}

const createSchema = z.object({
  subjectId: uuid.refine(Boolean, "Escolha a matéria."),
  topic,
  dates: z.array(isoDate).min(1, "Escolha quando revisar.").max(10),
  noteId: uuid.nullish(),
  sessionId: uuid.nullish(),
});

/** Agenda uma ou mais revisões do mesmo assunto (ex.: amanhã, em 7 e em 30 dias). */
export async function createReviewsAction(input: z.input<typeof createSchema>): Promise<ReviewResult> {
  if (!input.subjectId) return fail("Escolha a matéria.", "subject");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const t = await today();
  const dates = [...new Set(parsed.data.dates)].sort();
  if (dates[0] < t) return fail("A data da revisão não pode estar no passado.", "dates");
  if (dates[dates.length - 1] > addDays(t, 3650)) return fail("Escolha uma data mais próxima.", "dates");

  const supabase = await createClient();
  const { error } = await supabase.from("study_reviews").insert(
    dates.map((d) => ({
      subject_id: parsed.data.subjectId,
      topic: parsed.data.topic,
      note_id: parsed.data.noteId ?? null,
      session_id: parsed.data.sessionId ?? null,
      due_date: d,
      interval_days: daysBetween(t, d) > 0 ? daysBetween(t, d) : null,
    })),
  );
  if (error) {
    if (error.code === "23503") return fail("Matéria não encontrada.", "subject");
    return fail(dbErrorMessage(error));
  }
  refresh();
  return { ok: true };
}

const updateSchema = z.object({
  id: uuid,
  subjectId: uuid,
  topic,
  dueDate: isoDate,
});

export async function updateReviewAction(input: z.input<typeof updateSchema>): Promise<ReviewResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_reviews")
    .update({
      subject_id: parsed.data.subjectId,
      topic: parsed.data.topic,
      due_date: parsed.data.dueDate,
    })
    .eq("id", parsed.data.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23503") return fail("Matéria não encontrada.", "subject");
    return fail(dbErrorMessage(error));
  }
  if (!data) return fail("Revisão não encontrada ou já concluída.");
  refresh();
  return { ok: true };
}

const completeSchema = z.object({
  id: uuid,
  comment: z.string().max(2000, "Use até 2.000 caracteres.").optional(),
  nextDue: isoDate.nullable(),
  skip: z.boolean().optional(),
});

export async function completeReviewAction(input: z.input<typeof completeSchema>): Promise<ReviewResult> {
  const parsed = completeSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_complete", {
    p_id: parsed.data.id,
    p_comment: parsed.data.comment ?? undefined,
    p_next_due: parsed.data.nextDue ?? undefined,
    p_skip: parsed.data.skip ?? false,
  });
  if (error)
    return fail(
      error.code?.startsWith("P0") || error.code === "22023" ? error.message : dbErrorMessage(error),
    );
  refresh();
  return { ok: true };
}

export async function reopenReviewAction(id: string): Promise<ReviewResult> {
  if (!uuid.safeParse(id).success) return fail("Revisão inválida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_reopen", { p_id: id });
  if (error) return fail(error.code?.startsWith("P0") ? error.message : dbErrorMessage(error));
  refresh();
  return { ok: true };
}

export async function deleteReviewAction(id: string): Promise<ReviewResult> {
  if (!uuid.safeParse(id).success) return fail("Revisão inválida.");
  const supabase = await createClient();
  const { error } = await supabase.from("study_reviews").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true };
}
