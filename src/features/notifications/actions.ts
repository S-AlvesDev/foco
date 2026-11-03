"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { dispatchPending } from "./dispatch";

type Result = { ok: true } | { ok: false; message: string };
const MISSING = "Falta aplicar a atualização 0008 do banco no Supabase para usar as notificações.";
const fail = (error: { code?: string; message?: string }): Result => ({
  ok: false,
  message:
    error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST202"
      ? MISSING
      : dbErrorMessage(error),
});
const id = z.string().uuid();

/** Marca uma (ou todas, sem id) como lida. */
export async function markReadAction(notificationId?: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (notificationId) {
    if (!id.safeParse(notificationId).success) return { ok: false, message: "Notificação inválida." };
    q = q.eq("id", notificationId);
  }
  const { error } = await q;
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function deleteNotificationAction(notificationId: string | "lidas"): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const q =
    notificationId === "lidas"
      ? supabase.from("notifications").delete().not("read_at", "is", null)
      : id.safeParse(notificationId).success
        ? supabase.from("notifications").delete().eq("id", notificationId)
        : null;
  if (!q) return { ok: false, message: "Notificação inválida." };
  const { error } = await q;
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.");
const prefsSchema = z
  .object({
    push_enabled: z.boolean(),
    cat_reviews: z.boolean(),
    cat_daily_goal: z.boolean(),
    cat_study_reminder: z.boolean(),
    cat_streak: z.boolean(),
    cat_goal_reached: z.boolean(),
    cat_system: z.boolean(),
    reviews_time: time,
    study_reminder_time: time,
    evening_check_time: time,
  })
  .partial();

export async function savePrefsAction(input: z.input<typeof prefsSchema>): Promise<Result> {
  const user = await requireUser();
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Valor inválido." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ user_id: user.id, ...parsed.data, updated_at: new Date().toISOString() });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

const subSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(10).max(100) }),
  userAgent: z.string().max(300).optional(),
});

/** Guarda a inscrição deste aparelho (o banco a associa a quem está conectado). */
export async function savePushSubscriptionAction(input: z.input<typeof subSchema>): Promise<Result> {
  await requireUser();
  const parsed = subSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Inscrição inválida. Tente ativar de novo." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("push_subscribe", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
    p_user_agent: parsed.data.userAgent ?? "",
  });
  if (error) return fail(error);
  return { ok: true };
}

export async function removePushSubscriptionAction(endpoint: string): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return fail(error);
  return { ok: true };
}

/** Cria uma notificação de teste e envia na hora para os aparelhos ativados. */
export async function sendTestNotificationAction(): Promise<Result> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("notify_test");
  if (error) return fail(error);
  const res = await dispatchPending();
  refresh();
  if (!res.ok) return { ok: false, message: res.error };
  return res.sent > 0
    ? { ok: true }
    : {
        ok: false,
        message: "Nenhum aparelho recebeu. Ative as notificações neste aparelho e tente de novo em 1 minuto.",
      };
}
