"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/form";
import { preferencesSchema, profileSchema, type PreferencesInput } from "./schemas";

export async function updateProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData, ["display_name"] as const);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values, at: Date.now() };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { status: "error", message: dbErrorMessage(error), values, at: Date.now() };

  refresh();
  return { status: "success", message: "Perfil salvo.", values: parsed.data, at: Date.now() };
}

/** Chamada direto do cliente quando uma preferência muda (salva na hora, sem botão). */
export async function updatePreferencesAction(
  input: PreferencesInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Valor inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { ok: false, message: dbErrorMessage(error) };

  refresh();
  return { ok: true };
}
