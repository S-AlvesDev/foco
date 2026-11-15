import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { localDateISO } from "@/lib/format";
import { isMissingSchema } from "@/features/questions/queries";
import { canReadLibrary } from "@/features/library/queries";
import { getAccessState } from "@/features/library/access";
import { getMemoryItems, MemoryNotInstalled } from "@/features/memory/queries";
import {
  planState,
  type Plan,
  type PlanState,
  type TopicInfo,
  type TopicMemory,
  type TopicProgress,
} from "./model";
import { PLANS, PLAN_COOKIE, getPlan } from "./plans";

export { PLANS, getPlan };

/**
 * Planos que a pessoa pode seguir: todos para quem tem acesso total à Biblioteca; para quem foi
 * permitida em concursos específicos, só os planos desses concursos.
 */
export const getAllowedPlans = cache(async (): Promise<Plan[]> => {
  const access = await getAccessState().catch(() => null);
  if (!access || access.full || !access.installed) return PLANS;
  return PLANS.filter((p) => p.contestId && access.allowed.has(p.contestId));
});

/** Plano escolhido neste aparelho (cookie); sem escolha, o primeiro permitido. `null` se nenhum. */
export const getActivePlanId = cache(async (): Promise<string | null> => {
  const allowed = await getAllowedPlans();
  const id = (await cookies()).get(PLAN_COOKIE)?.value;
  return allowed.find((p) => p.id === id)?.id ?? allowed[0]?.id ?? null;
});

export type PlanPage = PlanState & {
  plan: Plan;
  today: string;
  /** A tabela de marcações (migração 0013) ainda não foi criada. */
  marksMissing: boolean;
};

/** Estado do plano para a pessoa logada. `null` quando a Biblioteca não está disponível para ela. */
export const getPlanPage = cache(async (planId?: string): Promise<PlanPage | null> => {
  const id = planId ?? (await getActivePlanId());
  const plan = id ? (await getAllowedPlans()).find((p) => p.id === id) : undefined;
  if (!plan || !(await canReadLibrary())) return null;
  const profile = await getProfile();
  const tz = profile.timezone;
  const today = localDateISO(tz, new Date());
  const ids = [...new Set(plan.metas.flatMap((m) => (m.items ?? []).flatMap((i) => i.topics)))];

  const supabase = await createClient();
  // Tópicos do plano e os subtópicos deles (tópicos longos são divididos em subtópicos na Biblioteca).
  const quoted = ids.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
  const topicsRes = await supabase
    .from("library_topics")
    .select("id, number, title, discipline_id, parent_id, position")
    .or(`id.in.(${quoted}),parent_id.in.(${quoted})`)
    .is("archived_at", null);
  if (topicsRes.error) throw topicsRes.error;
  const allIds = [...new Set([...ids, ...(topicsRes.data ?? []).map((t) => t.id)])];
  const [progRes, marksRes] = await Promise.all([
    supabase
      .from("library_progress")
      .select("topic_id, status, percent, completed_at")
      .in("topic_id", allIds),
    supabase.from("study_plan_marks").select("meta, item, done_at").eq("plan_id", plan.id),
  ]);
  if (progRes.error) throw progRes.error;
  const marksMissing = isMissingSchema(marksRes.error);
  if (marksRes.error && !marksMissing) throw marksRes.error;

  const toLocal = (ts: string) => localDateISO(tz, new Date(ts));
  const topics = new Map<string, TopicInfo>(
    (topicsRes.data ?? []).map((t) => [
      t.id,
      {
        id: t.id,
        number: t.number,
        title: t.title,
        disciplineId: t.discipline_id,
        parentId: t.parent_id,
        position: t.position,
      },
    ]),
  );
  const progress = new Map<string, TopicProgress>(
    (progRes.data ?? []).map((p) => [
      p.topic_id,
      { status: p.status, percent: p.percent, completedAt: p.completed_at },
    ]),
  );
  const marks = new Map<string, string>(
    (marksRes.data ?? []).map((m) => [`${m.meta}:${m.item}`, toLocal(m.done_at)]),
  );

  let memory = new Map<string, TopicMemory>();
  try {
    memory = new Map(
      (await getMemoryItems()).map((i) => [i.topicId, { level: i.level, dueOn: i.dueOn, state: i.state }]),
    );
  } catch (e) {
    if (!(e instanceof MemoryNotInstalled)) throw e;
  }

  return {
    ...planState({ plan, topics, progress, memory, marks, today, toLocal }),
    plan,
    today,
    marksMissing,
  };
});

/** Plano ativo e as disciplinas da Biblioteca que ele usa (para a Biblioteca mostrar primeiro o que importa). */
export const getActivePlanScope = cache(
  async (): Promise<{ plan: Plan; disciplineIds: Set<string> } | null> => {
    const id = await getActivePlanId();
    const plan = id ? getPlan(id) : undefined;
    if (!plan) return null;
    const ids = [...new Set(plan.metas.flatMap((m) => (m.items ?? []).flatMap((i) => i.topics)))];
    if (!ids.length) return { plan, disciplineIds: new Set() };
    const supabase = await createClient();
    const { data, error } = await supabase.from("library_topics").select("discipline_id").in("id", ids);
    if (error) return { plan, disciplineIds: new Set() };
    return { plan, disciplineIds: new Set((data ?? []).map((t) => t.discipline_id)) };
  },
);
