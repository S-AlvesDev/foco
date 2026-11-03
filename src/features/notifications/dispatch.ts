import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import webpush from "web-push";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export type DispatchResult =
  { ok: true; sent: number; total: number } | { ok: false; status: number; error: string };

/** O push só funciona com as três variáveis configuradas na Vercel. */
export function pushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    (process.env.PUSH_DISPATCH_SECRET ?? "").length >= 32,
  );
}

/**
 * Envia os pushes pendentes. Usa só a chave pública do Supabase: as funções push_claim e
 * push_report conferem o segredo de envio no banco. A chave privada VAPID fica só no servidor.
 */
export async function dispatchPending(): Promise<DispatchResult> {
  const secret = process.env.PUSH_DISPATCH_SECRET ?? "";
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!pushConfigured() || !publicKey || !privateKey) {
    return { ok: false, status: 500, error: "Push não configurado (variáveis VAPID ou segredo ausentes)." };
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contato@missao-alpha.app",
    publicKey,
    privateKey,
  );

  const supabase = createSupabase<Database>(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: batch, error } = await supabase.rpc("push_claim", { p_secret: secret, p_limit: 50 });
  if (error) return { ok: false, status: 502, error: "O banco recusou o envio (confira configure_push)." };

  const results = await Promise.all(
    (batch ?? []).map(async (n) => {
      const payload = JSON.stringify({
        id: n.notification_id,
        title: n.title,
        body: n.body,
        url: n.url,
        tag: n.kind,
      });
      const ok: string[] = [];
      const gone: string[] = [];
      await Promise.all(
        n.subscriptions.map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload,
              { TTL: 60 * 60 * 6, urgency: "normal", timeout: 10_000 },
            );
            ok.push(s.id);
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) gone.push(s.id);
          }
        }),
      );
      return { id: n.notification_id, sent: ok.length > 0, ok, gone };
    }),
  );
  if (results.length) await supabase.rpc("push_report", { p_secret: secret, p_results: results });
  return { ok: true, sent: results.filter((r) => r.sent).length, total: results.length };
}
