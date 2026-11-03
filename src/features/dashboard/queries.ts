import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { StatRow } from "./aggregate";

/**
 * Linhas dia × matéria × tipo do usuário (o RLS e a função limitam ao próprio usuário).
 * Busca em páginas: o Supabase devolve no máximo 1000 linhas por requisição.
 */
export async function getStatRows(from: string, to: string): Promise<StatRow[]> {
  const supabase = await createClient();
  const PAGE = 1000;
  const out: StatRow[] = [];
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await supabase
      .rpc("my_study_stats", { p_from: from, p_to: to })
      .order("day")
      .order("subject_id")
      .order("study_type")
      .range(start, start + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) {
      out.push({
        day: r.day,
        subject_id: r.subject_id,
        study_type: r.study_type,
        seconds: Number(r.seconds),
        sessions: Number(r.sessions),
        questions: Number(r.questions),
      });
    }
    if (!data || data.length < PAGE) return out;
  }
}

export async function getStreak() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_streak").single();
  if (error) throw error;
  return { current: data?.current_streak ?? 0, best: data?.best_streak ?? 0 };
}

export async function getAllTimeTotals() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_subject_totals");
  if (error) throw error;
  return (data ?? []).reduce(
    (acc, r) => ({ seconds: acc.seconds + Number(r.seconds), sessions: acc.sessions + Number(r.sessions) }),
    { seconds: 0, sessions: 0 },
  );
}

export async function getRecentSessions(limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("id, subject_id, session_date, duration_seconds, study_type, topic, source")
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
