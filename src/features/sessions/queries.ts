import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type SessionRow = Pick<
  Tables<"study_sessions">,
  | "id"
  | "subject_id"
  | "session_date"
  | "started_at"
  | "ended_at"
  | "duration_seconds"
  | "study_type"
  | "topic"
  | "notes"
  | "questions_answered"
  | "questions_correct"
  | "source"
>;

const COLUMNS =
  "id, subject_id, session_date, started_at, ended_at, duration_seconds, study_type, topic, notes, questions_answered, questions_correct, source";

/** Sessões entre duas datas locais (inclusive), da mais recente para a mais antiga. */
export async function listSessions({
  from,
  to,
  subjectId,
}: {
  from: string;
  to: string;
  subjectId?: string;
}): Promise<SessionRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("study_sessions")
    .select(COLUMNS)
    .gte("session_date", from)
    .lte("session_date", to)
    .order("session_date", { ascending: false })
    .order("started_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(2000);
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function hasOlderSessions(before: string, subjectId?: string) {
  const supabase = await createClient();
  let q = supabase
    .from("study_sessions")
    .select("id", { head: true, count: "exact" })
    .lt("session_date", before);
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { count, error } = await q;
  if (error) throw error;
  return (count ?? 0) > 0;
}
