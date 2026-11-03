import { timingSafeEqual } from "node:crypto";
import { dispatchPending } from "@/features/notifications/dispatch";

/** Chamada pelo agendador do Supabase (pg_cron + pg_net) a cada 5 minutos. */
export const maxDuration = 30;

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(request: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET ?? "";
  const given = request.headers.get("x-dispatch-secret") ?? "";
  if (secret.length < 32 || !sameSecret(given, secret)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  const res = await dispatchPending();
  return res.ok
    ? Response.json({ sent: res.sent, total: res.total })
    : Response.json({ error: res.error }, { status: res.status });
}
