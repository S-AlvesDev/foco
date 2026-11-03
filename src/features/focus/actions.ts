"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; message: string };

const MISSING = "Falta aplicar a atualização 0006 do banco no Supabase para salvar o objetivo.";

/** Salva o objetivo atual; texto vazio remove. */
export async function saveFocusAction(input: string): Promise<Result> {
  const user = await requireUser();
  const title = String(input ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (title.length > 80) return { ok: false, message: "Use até 80 caracteres." };

  const supabase = await createClient();
  const { error } = title
    ? await supabase
        .from("study_focus")
        .upsert({ user_id: user.id, title, updated_at: new Date().toISOString() })
    : await supabase.from("study_focus").delete().eq("user_id", user.id);
  if (error) {
    const missing = error.code === "42P01" || error.code === "PGRST205";
    return { ok: false, message: missing ? MISSING : dbErrorMessage(error) };
  }
  refresh();
  return { ok: true };
}
