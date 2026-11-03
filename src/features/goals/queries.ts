import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getStatRows } from "@/features/dashboard/queries";
import type { StatRow } from "@/features/dashboard/aggregate";
import { goalProgress, goalsRangeStart, sortGoals, type Goal, type GoalProgress } from "./progress";

export async function listGoals(): Promise<Goal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_goals")
    .select("id, subject_id, period, metric, target")
    .eq("is_active", true);
  if (error) throw error;
  return data ?? [];
}

/**
 * Metas ativas com o progresso da janela atual.
 * Aceita linhas já carregadas (ex.: pelo painel) para evitar outra consulta.
 */
export async function getGoalsProgress(opts: {
  today: string;
  weekStartsOn: number;
  subjectOrder: string[];
  rows?: StatRow[];
}): Promise<GoalProgress[]> {
  const { today, weekStartsOn } = opts;
  const goals = await listGoals();
  if (goals.length === 0) return [];
  const rows = opts.rows ?? (await getStatRows(goalsRangeStart(today, weekStartsOn), today));
  return sortGoals(
    goals.map((g) => goalProgress(g, rows, today, weekStartsOn)),
    opts.subjectOrder,
  );
}
