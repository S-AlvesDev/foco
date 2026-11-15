import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/features/questions/queries";

export type AccessStatus = "none" | "pending" | "approved" | "denied";

export type ContestAccess = {
  id: string;
  name: string;
  status: AccessStatus;
  message: string | null;
  requestedAt: string | null;
};

export type AccessState = {
  /** A migração 0014 (pedidos de acesso) já foi rodada no Supabase. */
  installed: boolean;
  /** Acesso a tudo: conta administradora ou quem está no mesmo espaço da Nossa Jornada. */
  full: boolean;
  /** Concursos e a situação do pedido da pessoa em cada um (vazio quando `full`). */
  contests: ContestAccess[];
  /** Concursos que a pessoa pode ler (todos quando `full`). */
  allowed: Set<string>;
};

/** O que a pessoa logada pode ler na Biblioteca e a situação dos pedidos dela. */
export const getAccessState = cache(async (): Promise<AccessState> => {
  const supabase = await createClient();
  const fullRes = await supabase.rpc("library_full_access");
  if (isMissingSchema(fullRes.error)) {
    // Sem a migração 0014: vale a regra antiga (só administradora e parceiro).
    const old = await supabase.rpc("library_can_read");
    return { installed: false, full: Boolean(old.data), contests: [], allowed: new Set() };
  }
  if (fullRes.error) throw fullRes.error;
  const full = Boolean(fullRes.data);

  const [contestsRes, mineRes] = await Promise.all([
    supabase
      .from("library_contests")
      .select("id, name")
      .is("archived_at", null)
      .order("position")
      .order("name"),
    full
      ? Promise.resolve({ data: [], error: null })
      : supabase.from("library_access").select("contest_id, status, message, requested_at"),
  ]);
  if (contestsRes.error) throw contestsRes.error;
  if (mineRes.error) throw mineRes.error;
  const contestsAll = contestsRes.data ?? [];
  if (full) return { installed: true, full, contests: [], allowed: new Set(contestsAll.map((c) => c.id)) };

  const mine = new Map((mineRes.data ?? []).map((r) => [r.contest_id, r]));
  const contests: ContestAccess[] = contestsAll.map((c) => {
    const r = mine.get(c.id);
    return {
      id: c.id,
      name: c.name,
      status: (r?.status as AccessStatus | undefined) ?? "none",
      message: r?.message ?? null,
      requestedAt: r?.requested_at ?? null,
    };
  });
  return {
    installed: true,
    full,
    contests,
    allowed: new Set(contests.filter((c) => c.status === "approved").map((c) => c.id)),
  };
});

export type AccessRequest = {
  userId: string;
  name: string;
  email: string;
  contestId: string;
  contestName: string;
  status: Exclude<AccessStatus, "none">;
  message: string | null;
  requestedAt: string;
  decidedAt: string | null;
};

/** Todos os pedidos (só a conta administradora). `null` quando a migração 0014 ainda não foi rodada. */
export async function getAccessRequests(): Promise<AccessRequest[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("library_access_requests");
  if (isMissingSchema(error)) return null;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    userId: r.user_id,
    name: r.display_name?.trim() || r.email?.split("@")[0] || "Sem nome",
    email: r.email ?? "",
    contestId: r.contest_id,
    contestName: r.contest_name,
    status: r.status as AccessRequest["status"],
    message: r.message,
    requestedAt: r.requested_at,
    decidedAt: r.decided_at,
  }));
}

/** Quantos pedidos estão aguardando (para o aviso da conta administradora). */
export const countPendingRequests = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("library_access")
    .select("user_id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
});
