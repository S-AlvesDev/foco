import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Abre a notificação: marca como lida e leva para a tela correspondente. */
export async function GET(request: NextRequest, { params }: RouteContext<"/notificacoes/abrir/[id]">) {
  const { id } = await params;
  const back = new URL("/notificacoes", request.url);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(back);
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .select("url")
    .maybeSingle();
  const { data: row } = data
    ? { data }
    : await supabase.from("notifications").select("url").eq("id", id).maybeSingle();
  const url = row?.url;
  const safe = url && url.startsWith("/") && !url.startsWith("//") ? url : "/notificacoes";
  return NextResponse.redirect(new URL(safe, request.url));
}
