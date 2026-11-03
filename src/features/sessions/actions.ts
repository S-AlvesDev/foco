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

/**
 * Envia uma sessão registrada sem internet. O id vem do aparelho:
 * reenviar a mesma sessão não cria outra (chave primária).
 */
export async function syncOfflineSessionAction(item: {
  id: string;
  createdAt: number;
  payload: Record<string, string>;
}): Promise<{ ok: true } | { ok: false; permanent: boolean; message: string }> {
  const profile = await getProfile();
  if (!uuid.safeParse(item.id).success) return { ok: false, permanent: true, message: "Registro inválido." };
  const raw: Record<string, string> = Object.fromEntries(
    SESSION_FIELDS.map((f) => [f, f === "id" ? "" : String(item.payload[f] ?? "")]),
  );
  const parsed = sessionFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, permanent: true, message: "Sessão com dados inválidos." };
  const resolved = resolveSession(parsed.data, profile.timezone, new Date(item.createdAt));
  if (!resolved.ok) return { ok: false, permanent: true, message: "Sessão com dados inválidos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("study_sessions")
    .insert({ ...resolved.data, id: item.id, source: "manual" });
  if (error && error.code !== "23505") {
    const permanent = error.code === "23503" || error.code === "23514";
    return {
      ok: false,
      permanent,
      message: error.code === "23503" ? "A matéria dessa sessão foi excluída." : dbErrorMessage(error),
    };
  }
  refresh();
  return { ok: true };
}
