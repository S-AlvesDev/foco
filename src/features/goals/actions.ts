"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { parseDurationInput } from "@/lib/format";
import { uuid } from "@/features/subjects/schemas";

type Result = { ok: true } | { ok: false; message: string; field?: "target" };

const goalSchema = z.object({
  id: uuid.optional(),
  subjectId: uuid.nullable(),
  period: z.enum(["daily", "weekly", "monthly"]),
  metric: z.enum(["minutes", "sessions", "questions"]),
  /** Para horas: "2:00", "90", "1h30". Para os demais: número inteiro. */
  target: z.string().trim().min(1, "Informe o alvo."),
});

export async function saveGoalAction(input: z.input<typeof goalSchema>): Promise<Result> {
  await requireUser();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos.", field: "target" };
  const v = parsed.data;

  let target: number | null;
  if (v.metric === "minutes") {
    target = parseDurationInput(v.target);
    if (target === null) return { ok: false, message: "Não entendi. Use 2:00, 90 ou 1h30.", field: "target" };
  } else {
    target = /^\d+$/.test(v.target) ? Number(v.target) : null;
    if (target === null) return { ok: false, message: "Use um número inteiro.", field: "target" };
  }
  if (target < 1) return { ok: false, message: "O alvo precisa ser maior que zero.", field: "target" };
  const limits = {
    minutes: { daily: 1440, weekly: 10080, monthly: 44640 },
    sessions: 1000,
    questions: 100000,
  };
  const max = v.metric === "minutes" ? limits.minutes[v.period] : limits[v.metric];
  if (target > max) return { ok: false, message: "Alvo maior que o possível no período.", field: "target" };

  const supabase = await createClient();
  const row = { subject_id: v.subjectId, period: v.period, metric: v.metric, target, is_active: true };
  const { error } = v.id
    ? await supabase.from("study_goals").update(row).eq("id", v.id)
    : await supabase.from("study_goals").insert(row);
  if (error) {
    if (error.code === "23505")
      return { ok: false, message: "Você já tem uma meta igual. Edite a existente." };
    if (error.code === "23503") return { ok: false, message: "Matéria não encontrada." };
    return { ok: false, message: dbErrorMessage(error) };
  }
  refresh();
  return { ok: true };
}

export async function deleteGoalAction(id: string): Promise<Result> {
  await requireUser();
  if (!uuid.safeParse(id).success) return { ok: false, message: "Meta inválida." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("study_goals").delete().eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (!data) return { ok: false, message: "Meta não encontrada." };
  refresh();
  return { ok: true };
}
