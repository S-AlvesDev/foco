import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Dose surpresa do Café com Lei: sorteia um tópico de lei seca da Biblioteca.
 * Sem limite de dias; dá preferência ao que a pessoa ainda não concluiu.
 */
export const LEI_SECA_POOL = [
  "prf-vade-mecum",
  "pmpe-estatuto",
  "pmpe-crimes-ambientais",
  "pmpe-direito-constitucional",
  "pmpe-direitos-humanos-legislacao",
];

/** Na disciplina de DH da PMPE, só entram os capítulos de leis (ECA em diante). */
const LAW_CHAPTERS_DH = /^pmpe-dh\.c0[3-7]\./;

export type LeiSecaPick = { disciplineId: string; topicId: string };

export async function pickLeiSeca(random: () => number = Math.random): Promise<LeiSecaPick | null> {
  const supabase = await createClient();
  const [topics, progress] = await Promise.all([
    supabase
      .from("library_topics")
      .select("id, discipline_id, block_count")
      .in("discipline_id", LEI_SECA_POOL)
      .is("archived_at", null)
      .gt("block_count", 0),
    supabase.from("library_progress").select("topic_id, status").eq("status", "done"),
  ]);
  if (topics.error || !topics.data?.length) return null;
  const done = new Set((progress.data ?? []).map((p) => p.topic_id));
  const pool = topics.data.filter(
    (t) => t.discipline_id !== "pmpe-direitos-humanos-legislacao" || LAW_CHAPTERS_DH.test(t.id),
  );
  if (!pool.length) return null;
  const fresh = pool.filter((t) => !done.has(t.id));
  const from = fresh.length ? fresh : pool;
  const t = from[Math.floor(random() * from.length)];
  return { disciplineId: t.discipline_id, topicId: t.id };
}
