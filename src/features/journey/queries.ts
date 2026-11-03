import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Challenge, DailyRow } from "./model";

export type Sharing = {
  share_study_time: boolean;
  share_subject_breakdown: boolean;
  share_goal_progress: boolean;
};

export type Member = { id: string; name: string; avatarPath: string | null; sharing: Sharing };

export type CoupleState = {
  id: string;
  name: string;
  inviteCode: string | null;
  inviteExpiresAt: string | null;
  me: Member;
  partner: Member | null;
};

/** O espaço do usuário (ou null), com os dois membros e o que cada um compartilha. */
export async function getCouple(userId: string): Promise<CoupleState | null> {
  const supabase = await createClient();
  const { data: couple, error } = await supabase
    .from("couples")
    .select("id, name, invite_code, invite_expires_at")
    .maybeSingle();
  if (error) throw error;
  if (!couple) return null;
  const [members, settings] = await Promise.all([
    supabase
      .from("couple_members")
      .select("user_id, joined_at")
      .eq("couple_id", couple.id)
      .order("joined_at"),
    supabase
      .from("shared_settings")
      .select("user_id, share_study_time, share_subject_breakdown, share_goal_progress")
      .eq("couple_id", couple.id),
  ]);
  if (members.error) throw members.error;
  if (settings.error) throw settings.error;
  const ids = (members.data ?? []).map((m) => m.user_id);
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_path")
    .in("id", ids);
  if (pErr) throw pErr;
  const nameOf = (id: string) => profiles?.find((p) => p.id === id)?.display_name || "Sem nome";
  const avatarOf = (id: string) => profiles?.find((p) => p.id === id)?.avatar_path ?? null;
  const sharingOf = (id: string): Sharing => {
    const s = settings.data?.find((x) => x.user_id === id);
    return {
      share_study_time: s?.share_study_time ?? false,
      share_subject_breakdown: s?.share_subject_breakdown ?? false,
      share_goal_progress: s?.share_goal_progress ?? false,
    };
  };
  const partnerId = ids.find((id) => id !== userId) ?? null;
  return {
    id: couple.id,
    name: couple.name,
    inviteCode: couple.invite_code,
    inviteExpiresAt: couple.invite_expires_at,
    me: { id: userId, name: nameOf(userId), avatarPath: avatarOf(userId), sharing: sharingOf(userId) },
    partner: partnerId
      ? {
          id: partnerId,
          name: nameOf(partnerId),
          avatarPath: avatarOf(partnerId),
          sharing: sharingOf(partnerId),
        }
      : null,
  };
}

export async function getCoupleDaily(from: string, to: string): Promise<DailyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("couple_daily_totals", { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    user_id: r.user_id,
    day: r.day,
    seconds: Number(r.seconds),
    sessions: Number(r.sessions),
  }));
}

export async function getCoupleSubjects(from: string, to: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("couple_subject_totals", { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? [])
    .map((r) => ({ user_id: r.user_id, name: r.subject_name, color: r.color, seconds: Number(r.seconds) }))
    .sort((a, b) => b.seconds - a.seconds);
}

export async function getCoupleStreaks() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("couple_streaks");
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.user_id, { current: r.current_streak, best: r.best_streak }]));
}

export async function getCoupleGoals() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("couple_goal_progress");
  if (error) throw error;
  return (data ?? []).map((g) => ({ ...g, value: Number(g.value) }));
}

export type ChallengeWithProgress = Challenge & { values: Map<string, number> };

/** Desafios do espaço: ativos e futuros, e os encerrados há até 60 dias. */
export async function getChallenges(sinceISO: string): Promise<ChallengeWithProgress[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_challenges")
    .select("id, kind, title, description, metric, scope, target, starts_on, ends_on, created_by")
    .is("archived_at", null)
    .gte("ends_on", sinceISO)
    .order("ends_on")
    .order("created_at");
  if (error) throw error;
  return Promise.all(
    (data ?? []).map(async (c) => {
      const { data: prog } = await supabase.rpc("challenge_progress", { p_challenge_id: c.id });
      return { ...c, values: new Map((prog ?? []).map((p) => [p.user_id, Number(p.value)])) };
    }),
  );
}

export type Achievement = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  achieved_on: string;
  is_shared: boolean;
};

/** Atualiza as conquistas do usuário e devolve as dele e as compartilhadas pelo parceiro. */
export async function getAchievements(): Promise<Achievement[]> {
  const supabase = await createClient();
  await supabase.rpc("refresh_my_achievements");
  const { data, error } = await supabase
    .from("achievements")
    .select("id, user_id, kind, title, achieved_on, is_shared")
    .order("achieved_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
