"use server";

import { refresh } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/form";
import { uuid } from "@/features/subjects/schemas";
import { SESSION_FIELDS, resolveSession, sessionFormSchema, type SessionField } from "./schemas";

export type SessionFormState = FormState<SessionField>;

/** Cria (sem id) ou atualiza uma sessão registrada à mão. */
export async function saveSessionAction(_: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const profile = await getProfile();
  const raw = formValues(formData, SESSION_FIELDS);
  const values = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== "id")) as Partial<
    Record<SessionField, string>
  >;
  const parsed = sessionFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values, at: Date.now() };
  }
  const resolved = resolveSession(parsed.data, profile.timezone, new Date());
  if (!resolved.ok) return { status: "error", fieldErrors: resolved.errors, values, at: Date.now() };

  const supabase = await createClient();
  const id = parsed.data.id;
  const { data, error } = id
    ? await supabase.from("study_sessions").update(resolved.data).eq("id", id).select("id").maybeSingle()
    : await supabase
        .from("study_sessions")
        .insert({ ...resolved.data, source: "manual" })
        .select("id")
        .single();

  if (error) {
    // FK composta: a matéria não é deste usuário (ou foi excluída).
    if (error.code === "23503") {
      return {
        status: "error",
        fieldErrors: { subject_id: "Matéria não encontrada." },
        values,
        at: Date.now(),
      };
    }
    return { status: "error", message: dbErrorMessage(error), values, at: Date.now() };
  }
  if (!data) return { status: "error", message: "Sessão não encontrada.", values, at: Date.now() };

  refresh();
  return { status: "success", at: Date.now() };
}

export async function deleteSessionAction(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await getProfile();
  if (!uuid.safeParse(id).success) return { ok: false, message: "Sessão inválida." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (!data) return { ok: false, message: "Sessão não encontrada." };
  refresh();
  return { ok: true };
}
