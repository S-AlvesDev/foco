"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/form";
import { subjectSchema, uuid } from "./schemas";

type Result = { ok: true } | { ok: false; message: string };
const fail = (message: string): Result => ({ ok: false, message });

export type SubjectFormState = FormState<"name" | "color" | "description"> & { id?: string };

/** Cria (sem id) ou atualiza (com id) uma matéria. */
export async function saveSubjectAction(_: SubjectFormState, formData: FormData): Promise<SubjectFormState> {
  await requireUser();
  const raw = formValues(formData, ["id", "name", "color", "description"] as const);
  const values = { name: raw.name, color: raw.color, description: raw.description };
  const parsed = subjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values, at: Date.now() };
  }

  const { id, ...fields } = parsed.data;
  const supabase = await createClient();

  let savedId = id;
  let error;
  if (id) {
    const res = await supabase.from("subjects").update(fields).eq("id", id).select("id").maybeSingle();
    error = res.error;
    if (!error && !res.data)
      return { status: "error", message: "Matéria não encontrada.", values, at: Date.now() };
  } else {
    // Nova matéria vai para o fim da lista.
    const { data: last } = await supabase
      .from("subjects")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const res = await supabase
      .from("subjects")
      .insert({ ...fields, position: (last?.position ?? -1) + 1 })
      .select("id")
      .single();
    error = res.error;
    savedId = res.data?.id;
  }

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        fieldErrors: { name: "Você já tem uma matéria com esse nome." },
        values,
        at: Date.now(),
      };
    }
    return { status: "error", message: dbErrorMessage(error), values, at: Date.now() };
  }

  refresh();
  return { status: "success", id: savedId, at: Date.now() };
}

export async function setSubjectArchivedAction(id: string, archived: boolean): Promise<Result> {
  await requireUser();
  if (!uuid.safeParse(id).success) return fail("Matéria inválida.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!data) return fail("Matéria não encontrada.");
  refresh();
  return { ok: true };
}

export async function deleteSubjectAction(id: string): Promise<Result> {
  await requireUser();
  if (!uuid.safeParse(id).success) return fail("Matéria inválida.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("subjects").delete().eq("id", id).select("id").maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!data) return fail("Matéria não encontrada.");
  refresh();
  return { ok: true };
}

export async function reorderSubjectsAction(ids: string[]): Promise<Result> {
  await requireUser();
  const parsed = z.array(uuid).max(500).safeParse(ids);
  if (!parsed.success) return fail("Ordem inválida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_subjects", { p_ids: parsed.data });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true };
}

export type SubjectUsage = {
  sessions: number;
  seconds: number;
  notes: number;
  reviews: number;
  goals: number;
};

export async function getSubjectUsageAction(
  id: string,
): Promise<{ ok: true; usage: SubjectUsage } | { ok: false; message: string }> {
  await requireUser();
  if (!uuid.safeParse(id).success) return { ok: false, message: "Matéria inválida." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("subject_usage", { p_subject_id: id }).single();
  if (error || !data) return { ok: false, message: dbErrorMessage(error) };
  return { ok: true, usage: data };
}
