import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PREFS, type Prefs } from "./kinds";

export type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  created_at: string;
  read_at: string | null;
};

/** null quando a migração 0008 ainda não foi aplicada. */
export async function countUnread(): Promise<number | null> {
  await requireUser();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return error ? null : (count ?? 0);
}

export async function listNotifications(limit = 100) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, url, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { items: (data ?? []) as NotificationRow[], available: !error, now: Date.now() };
}

export async function getPrefs(): Promise<{ prefs: Prefs; available: boolean }> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return { prefs: DEFAULT_PREFS, available: false };
  if (!data) return { prefs: DEFAULT_PREFS, available: true };
  const t = (v: string) => v.slice(0, 5);
  return {
    available: true,
    prefs: {
      ...DEFAULT_PREFS,
      ...data,
      reviews_time: t(data.reviews_time),
      study_reminder_time: t(data.study_reminder_time),
      evening_check_time: t(data.evening_check_time),
    },
  };
}
