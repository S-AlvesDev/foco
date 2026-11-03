import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type SubjectStats = { seconds: number; sessions: number; lastDate: string | null };
export type SubjectWithStats = Tables<"subjects"> & SubjectStats;

const EMPTY: SubjectStats = { seconds: 0, sessions: 0, lastDate: null };

async function totalsBySubject() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_subject_totals");
  if (error) throw error;
  return new Map(
    (data ?? []).map((r) => [
      r.subject_id,
      { seconds: r.seconds, sessions: r.sessions, lastDate: r.last_date },
    ]),
  );
}

/** Todas as matérias do usuário (ativas e arquivadas), na ordem escolhida, com totais. */
export const listSubjects = cache(async (): Promise<SubjectWithStats[]> => {
  const supabase = await createClient();
  const [{ data, error }, totals] = await Promise.all([
    supabase
      .from("subjects")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    totalsBySubject(),
  ]);
  if (error) throw error;
  return (data ?? []).map((s) => ({ ...s, ...(totals.get(s.id) ?? EMPTY) }));
});

export async function getSubject(id: string): Promise<SubjectWithStats | null> {
  const subjects = await listSubjects();
  return subjects.find((s) => s.id === id) ?? null;
}

export type SubjectSession = Pick<
  Tables<"study_sessions">,
  "id" | "session_date" | "started_at" | "duration_seconds" | "study_type" | "topic" | "notes"
>;

export async function listSubjectSessions(subjectId: string, limit = 100): Promise<SubjectSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("id, session_date, started_at, duration_seconds, study_type, topic, notes")
    .eq("subject_id", subjectId)
    .order("session_date", { ascending: false })
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
