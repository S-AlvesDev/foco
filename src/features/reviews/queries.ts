import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import { REVIEW_COLUMNS, type Review } from "./schedule";

/** Todas as revisões pendentes, da mais antiga para a mais distante. */
export async function listPendingReviews(subjectId?: string): Promise<Review[]> {
  const supabase = await createClient();
  let q = supabase
    .from("study_reviews")
    .select(REVIEW_COLUMNS)
    .eq("status", "pending")
    .order("due_date")
    .order("created_at")
    .limit(1000);
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Review[];
}

/** Revisões concluídas ou puladas, das mais recentes para as mais antigas. */
export async function listReviewHistory(subjectId?: string, limit = 100): Promise<Review[]> {
  const supabase = await createClient();
  let q = supabase
    .from("study_reviews")
    .select(REVIEW_COLUMNS)
    .neq("status", "pending")
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (subjectId) q = q.eq("subject_id", subjectId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function countReviews() {
  const supabase = await createClient();
  const [pending, done] = await Promise.all([
    supabase.from("study_reviews").select("id", { head: true, count: "exact" }).eq("status", "pending"),
    supabase.from("study_reviews").select("id", { head: true, count: "exact" }).neq("status", "pending"),
  ]);
  return { pending: pending.count ?? 0, history: done.count ?? 0 };
}

/** Para o painel: atrasadas + próximas 7 dias (limitado) e o total de atrasadas. */
export async function getUpcomingReviews(today: string, limit = 6) {
  const supabase = await createClient();
  const [list, overdue] = await Promise.all([
    supabase
      .from("study_reviews")
      .select(REVIEW_COLUMNS)
      .eq("status", "pending")
      .lte("due_date", addDays(today, 7))
      .order("due_date")
      .order("created_at")
      .limit(limit),
    supabase
      .from("study_reviews")
      .select("id", { head: true, count: "exact" })
      .eq("status", "pending")
      .lt("due_date", today),
  ]);
  if (list.error) throw list.error;
  return { reviews: (list.data ?? []) as Review[], overdue: overdue.count ?? 0 };
}
