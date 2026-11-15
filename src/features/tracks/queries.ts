import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { localDateISO } from "@/lib/format";
import { isMissingSchema } from "@/features/questions/queries";

/**
 * Progresso das trilhas próprias (Café com Lei, Desafio 7 dias), guardado em study_plan_marks
 * com um plan_id por trilha. `meta` é o dia; `item` é a tarefa do dia (0 quando o dia é um item só).
 */
export type TrackMarks = {
  /** A tabela (migração 0013) ainda não existe. */
  missing: boolean;
  today: string;
  /** "meta:item" → dia local (AAAA-MM-DD) em que foi marcado. */
  marks: Map<string, string>;
};

export const getTrackMarks = cache(async (trackId: string): Promise<TrackMarks> => {
  const [profile, supabase] = await Promise.all([getProfile(), createClient()]);
  const tz = profile.timezone;
  const today = localDateISO(tz, new Date());
  const { data, error } = await supabase
    .from("study_plan_marks")
    .select("meta, item, done_at")
    .eq("plan_id", trackId);
  if (isMissingSchema(error)) return { missing: true, today, marks: new Map() };
  if (error) throw error;
  return {
    missing: false,
    today,
    marks: new Map((data ?? []).map((m) => [`${m.meta}:${m.item}`, localDateISO(tz, new Date(m.done_at))])),
  };
});

/** Dias seguidos com pelo menos uma marca, terminando hoje ou ontem. */
export function streakOf(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  const shift = (iso: string, n: number) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  let cur = set.has(today) ? today : shift(today, -1);
  let n = 0;
  while (set.has(cur)) {
    n++;
    cur = shift(cur, -1);
  }
  return n;
}
