"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getProfile, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { daysBetween } from "@/lib/dates";
import { localDateISO, parseDurationInput } from "@/lib/format";
import { uuid } from "@/features/subjects/schemas";

type Field = "title" | "target" | "dates" | "code" | "name";
export type JourneyResult = { ok: true } | { ok: false; message: string; field?: Field };
const fail = (message: string, field?: Field): JourneyResult => ({ ok: false, message, field });

const name = z.string().trim().max(60, "Use até 60 caracteres.");

export async function createCoupleAction(input: { name?: string }): Promise<JourneyResult> {
  await requireUser();
  const parsed = name.safeParse(input.name ?? "");
  if (!parsed.success) return fail(parsed.error.issues[0].message, "name");
  const supabase = await createClient();
  const { error } = await supabase.rpc("couple_create", { p_name: parsed.data || undefined });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true };
}

export async function joinCoupleAction(input: { code: string }): Promise<JourneyResult> {
  await requireUser();
  const code = input.code.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[0-9A-F]{8}$/.test(code))
    return fail("O código tem 8 letras e números. Confira e tente de novo.", "code");
  const supabase = await createClient();
  const { error } = await supabase.rpc("couple_join", { p_code: code });
  if (error) {
    if (error.code === "P0002") return fail("Convite inválido ou expirado. Peça um código novo.", "code");
    return fail(dbErrorMessage(error), "code");
  }
  refresh();
  return { ok: true };
}

export async function regenerateInviteAction(): Promise<JourneyResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("couple_regenerate_invite");
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true };
}

export async function leaveCoupleAction(): Promise<JourneyResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("couple_leave");
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true };
}

export async function renameCoupleAction(input: { id: string; name: string }): Promise<JourneyResult> {
  await requireUser();
  const parsed = name.min(1, "Dê um nome ao espaço.").safeParse(input.name);
  if (!parsed.success) return fail(parsed.error.issues[0].message, "name");
  if (!uuid.safeParse(input.id).success) return fail("Espaço inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("couples").update({ name: parsed.data }).eq("id", input.id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true };
}

const sharingSchema = z
  .object({
    share_study_time: z.boolean(),
    share_subject_breakdown: z.boolean(),
    share_goal_progress: z.boolean(),
  })
  .partial();

export async function updateSharingAction(patch: z.input<typeof sharingSchema>): Promise<JourneyResult> {
  const user = await requireUser();
  const parsed = sharingSchema.safeParse(patch);
  if (!parsed.success || Object.keys(parsed.data).length === 0) return fail("Configuração inválida.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shared_settings")
    .update(parsed.data)
    .eq("user_id", user.id)
    .select("user_id");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail("Você não participa de um espaço compartilhado.");
  refresh();
  return { ok: true };
}

const challengeSchema = z.object({
  id: uuid.optional(),
  kind: z.enum(["joint_goal", "weekly_challenge"]),
  title: z.string().trim().min(1, "Dê um nome.").max(120, "Use até 120 caracteres."),
  description: z.string().trim().max(500, "Use até 500 caracteres.").optional(),
  metric: z.enum(["minutes", "sessions", "study_days", "questions"]),
  scope: z.enum(["combined", "each"]),
  target: z.string(),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
});

export async function saveChallengeAction(input: z.input<typeof challengeSchema>): Promise<JourneyResult> {
  const profile = await getProfile();
  const parsed = challengeSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const key = issue?.path[0];
    return fail(
      issue?.message ?? "Dados inválidos.",
      key === "title" ? "title" : key === "startsOn" || key === "endsOn" ? "dates" : undefined,
    );
  }
  const v = parsed.data;
  const target =
    v.metric === "minutes"
      ? parseDurationInput(v.target)
      : /^\d+$/.test(v.target.trim())
        ? Number(v.target)
        : null;
  if (!target || target <= 0 || target > 1_000_000)
    return fail(
      v.metric === "minutes" ? "Use um tempo como 10h, 90 ou 1:30." : "Use um número inteiro.",
      "target",
    );
  if (v.endsOn < v.startsOn) return fail("O fim precisa ser depois do início.", "dates");
  if (daysBetween(v.startsOn, v.endsOn) > 366) return fail("Use um período de até um ano.", "dates");
  const today = localDateISO(profile.timezone, new Date());
  if (!v.id && v.endsOn < today)
    return fail("O período já terminou. Escolha datas a partir de hoje.", "dates");

  const supabase = await createClient();
  const { data: couple } = await supabase.from("couples").select("id").maybeSingle();
  if (!couple) return fail("Você não participa de um espaço compartilhado.");
  const row = {
    kind: v.kind,
    title: v.title,
    description: v.description || null,
    metric: v.metric,
    scope: v.scope,
    target,
    starts_on: v.startsOn,
    ends_on: v.endsOn,
  };
  const { error } = v.id
    ? await supabase.from("study_challenges").update(row).eq("id", v.id)
    : await supabase
        .from("study_challenges")
        .insert({ ...row, couple_id: couple.id, created_by: profile.id });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true };
}

export async function deleteChallengeAction(id: string): Promise<JourneyResult> {
  await requireUser();
  if (!uuid.safeParse(id).success) return fail("Desafio inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("study_challenges").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true };
}

export async function setAchievementSharedAction(id: string, shared: boolean): Promise<JourneyResult> {
  const user = await requireUser();
  if (!uuid.safeParse(id).success) return fail("Conquista inválida.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("achievements")
    .update({ is_shared: shared })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail("Conquista não encontrada.");
  refresh();
  return { ok: true };
}
