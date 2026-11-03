import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type StudyFocus = { title: string | null; available: boolean };

/** Objetivo atual. `available` é falso enquanto a migração 0006 não foi aplicada. */
export const getStudyFocus = cache(async (): Promise<StudyFocus> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_focus")
    .select("title")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return { title: null, available: false };
  return { title: data?.title ?? null, available: true };
});
