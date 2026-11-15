"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { isMissingSchema } from "@/features/questions/queries";
import { PLANS } from "@/features/plan/plans";

type Result = { ok: true } | { ok: false; message: string };

const CONTEST = z.string().regex(/^[a-z0-9][a-z0-9_.-]{0,59}$/);
const NOT_INSTALLED = "Falta rodar a migração 0014_library_access.sql no Supabase.";

/** Pede acesso às apostilas (e ao plano) de um concurso. */
export async function requestAccessAction(contestId: string, message?: string): Promise<Result> {
  await requireUser();
  if (!CONTEST.safeParse(contestId).success) return { ok: false, message: "Concurso inválido." };
  const msg = (message ?? "").trim();
  if (msg.length > 300) return { ok: false, message: "A mensagem pode ter até 300 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("library_request_access", {
    p_contest: contestId,
    p_message: msg || undefined,
  });
  if (error) return { ok: false, message: isMissingSchema(error) ? NOT_INSTALLED : dbErrorMessage(error) };
  refresh();
  return { ok: true };
}

/** Cancela um pedido que ainda está aguardando. */
export async function cancelAccessRequestAction(contestId: string): Promise<Result> {
  await requireUser();
  if (!CONTEST.safeParse(contestId).success) return { ok: false, message: "Concurso inválido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("library_cancel_request", { p_contest: contestId });
  if (error) return { ok: false, message: isMissingSchema(error) ? NOT_INSTALLED : dbErrorMessage(error) };
  refresh();
  return { ok: true };
}

const decision = z.object({
  userId: z.uuid(),
  contestId: CONTEST,
  status: z.enum(["approved", "denied"]),
});

/**
 * Conta administradora: permite ou nega (negar um acesso já permitido o encerra). Ao permitir,
 * libera também as disciplinas de outros concursos que o plano de metas daquele concurso usa.
 */
export async function decideAccessAction(input: z.input<typeof decision>): Promise<Result> {
  await requireUser();
  const parsed = decision.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Pedido inválido." };
  const { userId, contestId, status } = parsed.data;
  const supabase = await createClient();

  let extra: string[] = [];
  if (status === "approved") {
    const ids = [
      ...new Set(
        PLANS.filter((p) => p.contestId === contestId).flatMap((p) =>
          p.metas.flatMap((m) => (m.items ?? []).flatMap((i) => i.topics)),
        ),
      ),
    ];
    if (ids.length) {
      const { data, error } = await supabase
        .from("library_topics")
        .select("discipline_id, library_disciplines!inner(contest_id)")
        .in("id", ids);
      if (error) return { ok: false, message: dbErrorMessage(error) };
      extra = [
        ...new Set(
          (data ?? [])
            .filter((t) => t.library_disciplines.contest_id !== contestId)
            .map((t) => t.discipline_id),
        ),
      ];
    }
  }

  const { error } = await supabase.rpc("library_decide_access", {
    p_user: userId,
    p_contest: contestId,
    p_status: status,
    p_extra: extra,
  });
  if (error) return { ok: false, message: isMissingSchema(error) ? NOT_INSTALLED : dbErrorMessage(error) };
  refresh();
  return { ok: true };
}
