import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "@/features/questions/queries";
import type { Block, BlockKind, MarkColor, ReadStatus } from "./model";

export class LibraryNotInstalled extends Error {
  constructor() {
    super("LIBRARY_NOT_INSTALLED");
  }
}

export const LIBRARY_BUCKET = "library";

function check<T extends { error: { code?: string } | null }>(res: T): T {
  if (isMissingSchema(res.error)) throw new LibraryNotInstalled();
  if (res.error) throw res.error;
  return res;
}

/** Pode ler a biblioteca? (conta administradora ou parceiro no mesmo espaço da Jornada) */
export const canReadLibrary = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = check(await supabase.rpc("library_can_read"));
  return Boolean(data);
});

export type DisciplineSummary = {
  contestId: string;
  contestName: string;
  id: string;
  name: string;
  description: string | null;
  chapters: number;
  topics: number;
  done: number;
  readPercent: number;
  lastTopicId: string | null;
  lastReadAt: string | null;
};

export const getOverview = cache(async (): Promise<DisciplineSummary[]> => {
  const supabase = await createClient();
  const { data } = check(await supabase.rpc("library_overview"));
  return (data ?? []).map((r) => ({
    contestId: r.contest_id,
    contestName: r.contest_name,
    id: r.discipline_id,
    name: r.discipline_name,
    description: r.description,
    chapters: r.chapters,
    topics: r.topics,
    done: r.done,
    readPercent: r.read_percent,
    lastTopicId: r.last_topic_id,
    lastReadAt: r.last_read_at,
  }));
});

export type ContinueItem = {
  topicId: string;
  topicTitle: string;
  topicNumber: string | null;
  chapterTitle: string;
  disciplineId: string;
  disciplineName: string;
  percent: number;
  status: ReadStatus;
  lastBlockId: string | null;
  lastReadAt: string;
};

/** Último tópico lido (para "Continuar estudando"). */
export const getContinue = cache(async (): Promise<ContinueItem | null> => {
  const supabase = await createClient();
  const { data } = check(
    await supabase
      .from("library_progress")
      .select(
        "topic_id, percent, status, last_block_id, last_read_at, library_topics!inner(title, number, archived_at, library_chapters!inner(title), library_disciplines!inner(id, name, archived_at))",
      )
      .is("library_topics.archived_at", null)
      .is("library_topics.library_disciplines.archived_at", null)
      .order("last_read_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  if (!data) return null;
  const t = data.library_topics;
  return {
    topicId: data.topic_id,
    topicTitle: t.title,
    topicNumber: t.number,
    chapterTitle: t.library_chapters.title,
    disciplineId: t.library_disciplines.id,
    disciplineName: t.library_disciplines.name,
    percent: data.percent,
    status: data.status as ReadStatus,
    lastBlockId: data.last_block_id,
    lastReadAt: data.last_read_at,
  };
});

export type TocTopic = {
  id: string;
  number: string | null;
  title: string;
  parentId: string | null;
  depth: number;
  position: number;
  chapterId: string;
  blockCount: number;
  status: ReadStatus;
  percent: number;
  lastReadAt: string | null;
  favorite: boolean;
};
export type TocChapter = { id: string; number: string | null; title: string; topics: TocTopic[] };
export type DisciplineTree = {
  id: string;
  name: string;
  description: string | null;
  contestId: string;
  contestName: string;
  chapters: TocChapter[];
  topics: TocTopic[]; // ordem linear de leitura
};

/** Disciplina com capítulos, tópicos (sem conteúdo) e o progresso/favoritos da pessoa. */
export const getDiscipline = cache(async (id: string): Promise<DisciplineTree | null> => {
  const supabase = await createClient();
  const [disc, chapters, topics, progress, favs] = await Promise.all([
    supabase
      .from("library_disciplines")
      .select("id, name, description, contest_id, library_contests(name)")
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("library_chapters")
      .select("id, number, title, position")
      .eq("discipline_id", id)
      .is("archived_at", null)
      .order("position"),
    supabase
      .from("library_topics")
      .select("id, number, title, parent_id, position, chapter_id, block_count")
      .eq("discipline_id", id)
      .is("archived_at", null)
      .order("position"),
    supabase
      .from("library_progress")
      .select("topic_id, status, percent, last_read_at, library_topics!inner(discipline_id)")
      .eq("library_topics.discipline_id", id),
    supabase
      .from("library_marks")
      .select("topic_id, library_topics!inner(discipline_id)")
      .eq("kind", "favorite")
      .is("block_id", null)
      .eq("library_topics.discipline_id", id),
  ]);
  check(disc);
  if (!disc.data) return null;
  for (const r of [chapters, topics, progress, favs]) check(r);
  const prog = new Map((progress.data ?? []).map((p) => [p.topic_id, p]));
  const fav = new Set((favs.data ?? []).map((f) => f.topic_id));
  const depthOf = new Map<string, number>();
  const list: TocTopic[] = (topics.data ?? []).map((t) => {
    const depth = t.parent_id ? (depthOf.get(t.parent_id) ?? 0) + 1 : 0;
    depthOf.set(t.id, depth);
    const p = prog.get(t.id);
    return {
      id: t.id,
      number: t.number,
      title: t.title,
      parentId: t.parent_id,
      depth,
      position: t.position,
      chapterId: t.chapter_id,
      blockCount: t.block_count,
      status: (p?.status as ReadStatus) ?? "not_started",
      percent: p?.percent ?? 0,
      lastReadAt: p?.last_read_at ?? null,
      favorite: fav.has(t.id),
    };
  });
  const byChapter = new Map<string, TocTopic[]>();
  for (const t of list) byChapter.set(t.chapterId, [...(byChapter.get(t.chapterId) ?? []), t]);
  return {
    id: disc.data.id,
    name: disc.data.name,
    description: disc.data.description,
    contestId: disc.data.contest_id,
    contestName: disc.data.library_contests?.name ?? "",
    chapters: (chapters.data ?? [])
      .map((c) => ({ id: c.id, number: c.number, title: c.title, topics: byChapter.get(c.id) ?? [] }))
      .filter((c) => c.topics.length),
    topics: list,
  };
});

export type SourceRef = { fonte: string; pagina?: number | string; secao?: string };
export type ReaderBlock = Block & { sources: SourceRef[] };
export type Mark = {
  id: string;
  kind: "highlight" | "note" | "favorite";
  topicId: string;
  blockId: string | null;
  start: number | null;
  end: number | null;
  quote: string | null;
  color: MarkColor | null;
  body: string | null;
  status: "ok" | "review";
  createdAt: string;
  updatedAt: string;
};
export type TopicPage = {
  discipline: DisciplineTree;
  topic: TocTopic;
  chapter: TocChapter;
  blocks: ReaderBlock[];
  sources: Record<string, { file: string; title: string | null }>;
  images: Record<string, string>;
  marks: Mark[];
  progress: {
    status: ReadStatus;
    percent: number;
    lastBlockId: string | null;
    lastReadAt: string | null;
  } | null;
  index: number;
};

export const MARK_COLUMNS =
  "id, kind, topic_id, block_id, start_offset, end_offset, quote, color, body, status, created_at, updated_at";
type MarkRow = {
  id: string;
  kind: string;
  topic_id: string;
  block_id: string | null;
  start_offset: number | null;
  end_offset: number | null;
  quote: string | null;
  color: string | null;
  body: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};
export function toMark(r: MarkRow): Mark {
  return {
    id: r.id,
    kind: r.kind as Mark["kind"],
    topicId: r.topic_id,
    blockId: r.block_id,
    start: r.start_offset,
    end: r.end_offset,
    quote: r.quote,
    color: r.color as MarkColor | null,
    body: r.body,
    status: r.status as Mark["status"],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Um tópico com o conteúdo (só ele: o resto da disciplina vem sem os blocos). */
export async function getTopicPage(disciplineId: string, topicId: string): Promise<TopicPage | null> {
  const discipline = await getDiscipline(disciplineId);
  if (!discipline) return null;
  const index = discipline.topics.findIndex((t) => t.id === topicId);
  if (index === -1) return null;
  const topic = discipline.topics[index];
  const chapter = discipline.chapters.find((c) => c.id === topic.chapterId)!;
  const supabase = await createClient();
  const [blocks, marks, progress, sources] = await Promise.all([
    supabase
      .from("library_blocks")
      .select("id, kind, data, sources")
      .eq("topic_id", topicId)
      .is("archived_at", null)
      .order("position"),
    supabase.from("library_marks").select(MARK_COLUMNS).eq("topic_id", topicId).order("created_at"),
    supabase
      .from("library_progress")
      .select("status, percent, last_block_id, last_read_at")
      .eq("topic_id", topicId)
      .maybeSingle(),
    supabase.from("library_sources").select("id, file_name, title").eq("discipline_id", disciplineId),
  ]);
  for (const r of [blocks, marks, progress, sources]) check(r);
  const list: ReaderBlock[] = (blocks.data ?? []).map(
    (b) =>
      ({
        id: b.id,
        kind: b.kind as BlockKind,
        data: b.data,
        sources: (b.sources as SourceRef[]) ?? [],
      }) as ReaderBlock,
  );
  const files = list.flatMap((b) =>
    b.kind === "imagem" && b.data.arquivo ? [`${disciplineId}/${b.data.arquivo}`] : [],
  );
  const images: Record<string, string> = {};
  if (files.length) {
    const { data } = await supabase.storage.from(LIBRARY_BUCKET).createSignedUrls(files, 60 * 60 * 24);
    for (const f of data ?? [])
      if (f.signedUrl && f.path) images[f.path.slice(disciplineId.length + 1)] = f.signedUrl;
  }
  const p = progress.data;
  return {
    discipline,
    topic,
    chapter,
    blocks: list,
    sources: Object.fromEntries(
      (sources.data ?? []).map((s) => [s.id, { file: s.file_name, title: s.title }]),
    ),
    images,
    marks: (marks.data ?? []).map(toMark),
    progress: p
      ? {
          status: p.status as ReadStatus,
          percent: p.percent,
          lastBlockId: p.last_block_id,
          lastReadAt: p.last_read_at,
        }
      : null,
    index,
  };
}

export type MarkWithPlace = Mark & {
  topicTitle: string;
  topicNumber: string | null;
  disciplineId: string;
  disciplineName: string;
  chapterTitle: string;
};

/** Marcações, anotações e favoritos da pessoa, com onde estão. Filtros opcionais. */
export async function listMarks(opts: {
  kind?: Mark["kind"] | "excerpts";
  disciplineId?: string;
  color?: MarkColor;
  q?: string;
  limit?: number;
}): Promise<MarkWithPlace[]> {
  const supabase = await createClient();
  let query = supabase
    .from("library_marks")
    .select(
      `${MARK_COLUMNS}, library_topics!inner(title, number, discipline_id, archived_at, library_chapters!inner(title), library_disciplines!inner(name))`,
    )
    .order("updated_at", { ascending: false })
    .limit(opts.limit ?? 300);
  if (opts.kind === "excerpts") query = query.not("block_id", "is", null);
  else if (opts.kind) query = query.eq("kind", opts.kind);
  if (opts.disciplineId) query = query.eq("library_topics.discipline_id", opts.disciplineId);
  if (opts.color) query = query.eq("color", opts.color);
  const q = opts.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,()\\]/g, " ");
    query = query.or(`body.ilike.%${safe}%,quote.ilike.%${safe}%`);
  }
  const { data } = check(await query);
  return (data ?? []).map((r) => ({
    ...toMark(r),
    topicTitle: r.library_topics.title,
    topicNumber: r.library_topics.number,
    disciplineId: r.library_topics.discipline_id,
    disciplineName: r.library_topics.library_disciplines.name,
    chapterTitle: r.library_topics.library_chapters.title,
  }));
}

export type SearchHit = {
  kind: "topic" | "block";
  disciplineId: string;
  disciplineName: string;
  chapterTitle: string;
  topicId: string;
  topicTitle: string;
  blockId: string | null;
  text: string | null;
};

export async function searchLibrary(q: string, disciplineId?: string): Promise<SearchHit[]> {
  const supabase = await createClient();
  const { data } = check(
    await supabase.rpc("library_search", { p_query: q, p_discipline: disciplineId, p_limit: 40 }),
  );
  return (data ?? []).map((r) => ({
    kind: r.kind as SearchHit["kind"],
    disciplineId: r.discipline_id,
    disciplineName: r.discipline_name,
    chapterTitle: r.chapter_title,
    topicId: r.topic_id,
    topicTitle: r.topic_title,
    blockId: r.block_id,
    text: r.block_text,
  }));
}

/**
 * Tópicos cujo título bate com algum dos assuntos (revisões → material), sem diferenciar maiúsculas.
 * Aceita também "1.2 Título" (o assunto que o leitor coloca no cronômetro).
 */
export async function findTopicsByTitle(subjects: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const strip = (v: string) => v.trim().replace(/^\d+(?:\.\d+)*\.?\s+/, "");
  const clean = [...new Set(subjects.map((t) => t.trim()).filter(Boolean))].slice(0, 80);
  const titles = [...new Set(clean.flatMap((t) => [t, strip(t)]))].filter((t) => t.length >= 2);
  if (!titles.length) return out;
  const supabase = await createClient();
  const quoted = titles.map(
    (t) =>
      `title.ilike."${t
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/[%_]/g, (c) => "\\\\" + c)}"`,
  ); // \\% chega como \% ao LIKE
  const { data, error } = await supabase
    .from("library_topics")
    .select("id, title, number, discipline_id")
    .is("archived_at", null)
    .or(quoted.join(","))
    .limit(300);
  if (error) return out; // biblioteca não instalada ou sem acesso: só não mostra o link
  const lower = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();
  for (const subject of clean) {
    const s1 = lower(subject);
    const s2 = lower(strip(subject));
    const hit =
      (data ?? []).find((t) => t.number && lower(`${t.number} ${t.title}`) === s1) ??
      (data ?? []).find((t) => lower(t.title) === s1 || lower(t.title) === s2);
    if (hit)
      out.set(subject, `/biblioteca/${encodeURIComponent(hit.discipline_id)}/${encodeURIComponent(hit.id)}`);
  }
  return out;
}
