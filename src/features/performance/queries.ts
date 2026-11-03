import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Goal } from "@/features/goals/progress";
import type { BreakdownRow, DailyTotal, MonthlyTotal } from "./compute";

export async function getDailyTotals(from: string, to: string): Promise<DailyTotal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_daily_totals", { p_from: from, p_to: to }).order("day");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    day: r.day,
    seconds: Number(r.seconds),
    sessions: Number(r.sessions),
    questions: Number(r.questions),
    correct: Number(r.correct),
  }));
}

export async function getBreakdown(from: string, to: string): Promise<BreakdownRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_breakdown", { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    subject_id: r.subject_id,
    study_type: r.study_type,
    seconds: Number(r.seconds),
    sessions: Number(r.sessions),
    questions: Number(r.questions),
    correct: Number(r.correct),
  }));
}

export async function getMonthlyTotals(): Promise<MonthlyTotal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_monthly_totals").order("month");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    month: r.month,
    seconds: Number(r.seconds),
    sessions: Number(r.sessions),
    study_days: Number(r.study_days),
  }));
}

/** Metas ativas com o dia (no fuso do usuário) em que foram criadas. */
export async function getGoalsWithCreation(timezone: string): Promise<(Goal & { created_on: string })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_goals")
    .select("id, subject_id, period, metric, target, created_at")
    .eq("is_active", true);
  if (error) throw error;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return (data ?? []).map(({ created_at, ...g }) => ({ ...g, created_on: fmt.format(new Date(created_at)) }));
}
