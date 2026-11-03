"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";

type Result = { ok: true } | { ok: false; message: string };
const BUCKET = "avatars";

/** Depois do envio pelo navegador: aponta o perfil para a nova foto e apaga a anterior. */
export async function setAvatarAction(path: string): Promise<Result> {
  const user = await requireUser();
  if (!new RegExp(`^${user.id}/[A-Za-z0-9-]+\\.(webp|jpg|png)$`).test(path)) {
    return { ok: false, message: "Arquivo inválido." };
  }
  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (before?.avatar_path && before.avatar_path !== path) {
    await supabase.storage.from(BUCKET).remove([before.avatar_path]);
  }
  refresh();
  return { ok: true };
}

export async function removeAvatarAction(): Promise<Result> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  const { error } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (before?.avatar_path) await supabase.storage.from(BUCKET).remove([before.avatar_path]);
  refresh();
  return { ok: true };
}
