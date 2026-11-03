"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { uuid } from "@/features/subjects/schemas";
import { TIMER_COLUMNS, type Timer, type TimerResult } from "./types";

async function done(timer: Timer | null, finished = false): Promise<TimerResult> {
  if (finished) refresh();
  return { ok: true, timer, serverNow: Date.now() };
}

const startSchema = z.object({
  subjectId: uuid,
  topic: z.string().trim().max(200).optional(),
  studyType: z.enum(["theory", "questions", "review", "mock_exam", "reading"]).default("theory"),
});

export async function startTimerAction(input: z.input<typeof startSchema>): Promise<TimerResult> {
  await getProfile();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Escolha a matéria." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("timer_start", {
      p_subject_id: parsed.data.subjectId,
      p_topic: parsed.data.topic ?? "",
      p_study_type: parsed.data.studyType,
    })
    .select(TIMER_COLUMNS)
    .single();
  if (error) return { ok: false, message: error.code === "P0001" ? error.message : dbErrorMessage(error) };
  return done(data);
}

export async function pauseTimerAction(): Promise<TimerResult> {
  await getProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("timer_pause").select(TIMER_COLUMNS).single();
  if (error) return { ok: false, message: dbErrorMessage(error) };
  return done(data);
}

export async function resumeTimerAction(): Promise<TimerResult> {
  await getProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("timer_resume").select(TIMER_COLUMNS).single();
  if (error) return { ok: false, message: dbErrorMessage(error) };
  return done(data);
}

const finishSchema = z.object({
  topic: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(5000).optional(),
  questionsAnswered: z.number().int().min(0).max(10000).nullable().optional(),
  questionsCorrect: z.number().int().min(0).max(10000).nullable().optional(),
  /** Só para reduzir (esqueceu ligado). */
  durationSeconds: z.number().int().min(60).max(86400).nullable().optional(),
});

export async function finishTimerAction(input: z.input<typeof finishSchema>): Promise<TimerResult> {
  await getProfile();
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };
  const v = parsed.data;
  if (
    v.questionsCorrect != null &&
    (v.questionsAnswered == null || v.questionsCorrect > v.questionsAnswered)
  ) {
    return { ok: false, message: "Acertos não podem passar do total de questões." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("timer_finish", {
    p_topic: v.topic ?? "",
    p_notes: v.notes ?? "",
    p_questions_answered: v.questionsAnswered ?? undefined,
    p_questions_correct: v.questionsCorrect ?? undefined,
    p_duration_seconds: v.durationSeconds ?? undefined,
  });
  if (error) {
    // Outra aba já finalizou: não há o que salvar de novo.
    if (error.code === "P0002") return done(null, true);
    return { ok: false, message: dbErrorMessage(error) };
  }
  return done(null, true);
}

export async function discardTimerAction(): Promise<TimerResult> {
  await getProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("timer_discard");
  if (error) return { ok: false, message: dbErrorMessage(error) };
  return done(null);
}
