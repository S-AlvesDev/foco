import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { localDateISO } from "@/lib/format";
import { isMissingSchema } from "@/features/questions/queries";
import { canReadLibrary } from "@/features/library/queries";
import { getMemoryItems, MemoryNotInstalled } from "@/features/memory/queries";
import {
  planState,
  type Plan,
  type PlanState,
  type TopicInfo,
  type TopicMemory,
  type TopicProgress,
} from "./model";
import { PRF_PLAN } from "./plan-prf";

export const PLANS: Plan[] = [PRF_PLAN];
export const getPlan = (id: string) => PLANS.find((p) => p.id === id) ?? null;

export type PlanPage = PlanState & {
  plan: Plan;
  today: string;
  /** A tabela de marcações (migração 0013) ainda não foi criada. */
  marksMissing: boolean;
};

/** Estado do plano para a pessoa logada. `null` quando a Biblioteca não está disponível para ela. */
export const getPlanPage = cache(async (planId = PRF_PLAN.id): Promise<PlanPage | null> => {
  const plan = getPlan(planId);
  if (!plan || !(await canReadLibrary())) return null;
  const profile = await getProfile();
  const tz = profile.timezone;
  const today = localDateISO(tz, new Date());
  const ids = [...new Set(plan.metas.flatMap((m) => (m.items ?? []).flatMap((i) => i.topics)))];

  const supabase = await createClient();
  const [topicsRes, progRes, marksRes] = await Promise.all([
    supabase
      .from("library_topics")
      .select("id, number, title, discipline_id")
      .in("id", ids)
      .is("archived_at", null),
    supabase.from("library_progress").select("topic_id, status, percent, completed_at").in("topic_id", ids),
    supabase.from("study_plan_marks").select("meta, item, done_at").eq("plan_id", plan.id),
  ]);
  if (topicsRes.error) throw topicsRes.error;
  if (progRes.error) throw progRes.error;
  const marksMissing = isMissingSchema(marksRes.error);
  if (marksRes.error && !marksMissing) throw marksRes.error;

  const toLocal = (ts: string) => localDateISO(tz, new Date(ts));
  const topics = new Map<string, TopicInfo>(
    (topicsRes.data ?? []).map((t) => [
      t.id,
      { id: t.id, number: t.number, title: t.title, disciplineId: t.discipline_id },
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
