"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { MARK_COLORS, READ_STATUS, type ReadStatus } from "./model";
import { MARK_COLUMNS, toMark, type Mark } from "./queries";
import type { LibraryPayload } from "@/features/pwa/outbox";

type Fail = { ok: false; message: string };

const ID = z.string().regex(/^[a-z0-9][a-z0-9_.-]{0,159}$/);
const anchor = z.object({
  blockId: ID,
  start: z.number().int().min(0),
  end: z.number().int().min(1),
  quote: z.string().min(1).max(5000),
});

const createSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.uuid().optional(),
    kind: z.literal("highlight"),
    topicId: ID,
    anchor,
    color: z.enum(MARK_COLORS),
    body: z.string().max(20000).optional(),
  }),
  z.object({
    id: z.uuid().optional(),
    kind: z.literal("note"),
    topicId: ID,
    anchor: anchor.optional(),
    body: z.string().trim().min(1, "Escreva a anotação.").max(20000),
  }),
  z.object({ id: z.uuid().optional(), kind: z.literal("favorite"), topicId: ID, anchor: anchor.optional() }),
]);
export type CreateMarkInput = z.input<typeof createSchema>;

/** Cria marcação, anotação ou favorito. O id pode vir do aparelho (reenvio offline não duplica). */
export async function createMarkAction(input: CreateMarkInput): Promise<{ ok: true; mark: Mark } | Fail> {
  await requireUser();
  const p = createSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Dados inválidos." };
  const v = p.data;
  if (v.anchor && v.anchor.end - v.anchor.start !== v.anchor.quote.length)
    return { ok: false, message: "Trecho inválido." };
  const supabase = await createClient();
  const row = {
    ...(v.id ? { id: v.id } : {}),
    kind: v.kind,
    topic_id: v.topicId,
    block_id: v.anchor?.blockId ?? null,
    start_offset: v.anchor?.start ?? null,
    end_offset: v.anchor?.end ?? null,
    quote: v.anchor?.quote ?? null,
    color: v.kind === "highlight" ? v.color : null,
    body: v.kind === "favorite" ? null : v.body?.trim() || null,
  };
  const { data, error } = await supabase
    .from("library_marks")
    .upsert(row, { onConflict: "id", ignoreDuplicates: false })
    .select(MARK_COLUMNS)
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Este tópico já está nos favoritos." };
    return { ok: false, message: dbErrorMessage(error) };
  }
  return { ok: true, mark: toMark(data) };
}

const updateSchema = z.object({
  id: z.uuid(),
  color: z.enum(MARK_COLORS).optional(),
  body: z.string().max(20000).nullable().optional(),
});

/** Troca a cor ou o texto. Anotação sem texto não existe: use excluir. */
export async function updateMarkAction(
  input: z.input<typeof updateSchema>,
): Promise<{ ok: true; mark: Mark } | Fail> {
  await requireUser();
  const p = updateSchema.safeParse(input);
  if (!p.success) return { ok: false, message: "Dados inválidos." };
  const patch: { color?: string; body?: string | null } = {};
  if (p.data.color) patch.color = p.data.color;
  if (p.data.body !== undefined) patch.body = p.data.body?.trim() || null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_marks")
    .update(patch)
    .eq("id", p.data.id)
    .select(MARK_COLUMNS)
    .maybeSingle();
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (!data) return { ok: false, message: "Item não encontrado." };
  return { ok: true, mark: toMark(data) };
}

export async function deleteMarkAction(id: string): Promise<{ ok: true } | Fail> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Item inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("library_marks").delete().eq("id", id);
  if (error) return { ok: false, message: dbErrorMessage(error) };
  return { ok: true };
}

/** Favorita ou desfavorita o tópico inteiro. */
export async function toggleTopicFavoriteAction(topicId: string, on: boolean): Promise<{ ok: true } | Fail> {
  await requireUser();
  if (!ID.safeParse(topicId).success) return { ok: false, message: "Tópico inválido." };
  const supabase = await createClient();
  if (on) {
    const { error } = await supabase.from("library_marks").insert({ kind: "favorite", topic_id: topicId });
    if (error && error.code !== "23505") return { ok: false, message: dbErrorMessage(error) };
  } else {
    const { error } = await supabase
      .from("library_marks")
      .delete()
      .eq("kind", "favorite")
      .eq("topic_id", topicId)
      .is("block_id", null);
    if (error) return { ok: false, message: dbErrorMessage(error) };
  }
  return { ok: true };
}

export type ProgressResult = { ok: true; status: ReadStatus; percent: number } | Fail;

/** Registra leitura: % (só sobe), onde parou e, se escolhida, a situação. */
export async function touchProgressAction(
  topicId: string,
  input: { percent?: number; blockId?: string | null; status?: ReadStatus },
): Promise<ProgressResult> {
  await requireUser();
  if (!ID.safeParse(topicId).success) return { ok: false, message: "Tópico inválido." };
  if (input.status && !READ_STATUS.includes(input.status))
    return { ok: false, message: "Situação inválida." };
  const pct = input.percent === undefined ? undefined : Math.max(0, Math.min(100, Math.round(input.percent)));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("library_touch", {
    p_topic: topicId,
    p_percent: pct,
    p_block: input.blockId && ID.safeParse(input.blockId).success ? input.blockId : undefined,
    p_status: input.status,
  });
  if (error || !data) return { ok: false, message: dbErrorMessage(error) || "Não foi possível salvar." };
  const row = (Array.isArray(data) ? data[0] : data) as { status: string; percent: number };
  if (input.status) refresh();
  return { ok: true, status: row.status as ReadStatus, percent: row.percent };
}

/* ------------------------------------------------------------------ */
/* Administração                                                       */
/* ------------------------------------------------------------------ */

export type StructureResult =
  | {
      ok: true;
      chapters: number;
      topics: number;
      newChapters: number;
      newTopics: number;
      archivedTopics: number;
    }
  | Fail;

/** Passo 1 da importação (já validada no aparelho; o banco confere de novo). */
export async function importStructureAction(
  structure: unknown,
  mode: "disciplina" | "capitulos",
): Promise<StructureResult> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("library_import_structure", {
    p: structure as never,
    p_mode: mode === "capitulos" ? "chapters" : "discipline",
  });
  if (error) return { ok: false, message: error.message || dbErrorMessage(error) };
  const r = data as Record<string, number>;
  return {
    ok: true,
    chapters: r.chapters ?? 0,
    topics: r.topics ?? 0,
    newChapters: r.new_chapters ?? 0,
    newTopics: r.new_topics ?? 0,
    archivedTopics: r.archived_topics ?? 0,
  };
}

export type BlocksResult =
  | {
      ok: true;
      blocks: number;
      created: number;
      changed: number;
      unchanged: number;
      marksMoved: number;
      marksReview: number;
    }
  | Fail;

/** Passo 2: os blocos de um tópico (lista completa do tópico). */
export async function importBlocksAction(topicId: string, blocks: unknown[]): Promise<BlocksResult> {
  await requireUser();
  if (!ID.safeParse(topicId).success) return { ok: false, message: "Tópico inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("library_import_blocks", {
    p_topic: topicId,
    p_blocks: blocks as never,
  });
  if (error) return { ok: false, message: error.message || dbErrorMessage(error) };
  const r = data as Record<string, number>;
  return {
    ok: true,
    blocks: r.blocks ?? 0,
    created: r.new ?? 0,
    changed: r.changed ?? 0,
    unchanged: r.unchanged ?? 0,
    marksMoved: r.marks_moved ?? 0,
    marksReview: r.marks_review ?? 0,
  };
}

export async function finishImportAction(): Promise<void> {
  await requireUser();
  refresh();
}

/** Exclui da biblioteca (arquiva). Marcações e anotações das pessoas ficam guardadas. */
export async function archiveLibraryItemAction(
  kind: "discipline" | "chapter" | "topic",
  id: string,
  restore = false,
): Promise<{ ok: true } | Fail> {
  await requireUser();
  if (!ID.safeParse(id).success) return { ok: false, message: "Item inválido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("library_archive", { p_kind: kind, p_id: id, p_restore: restore });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  refresh();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Fila offline                                                        */
/* ------------------------------------------------------------------ */

type SyncResult = { ok: true } | { ok: false; permanent: boolean; message: string };

/**
 * Reenvia algo feito sem internet. Vale o último que chegar (as operações são repetidas na ordem
 * em que foram feitas); excluir algo que já não existe conta como feito.
 */
export async function syncOfflineLibraryAction(payload: LibraryPayload): Promise<SyncResult> {
  await requireUser();
  const perm = (message: string): SyncResult => ({ ok: false, permanent: true, message });
  switch (payload?.op) {
    case "create": {
      const r = await createMarkAction(payload.input as CreateMarkInput);
      if (r.ok || r.message.includes("já está nos favoritos")) return { ok: true };
      return perm(r.message);
    }
    case "update": {
      const r = await updateMarkAction(payload.input as z.input<typeof updateSchema>);
      if (r.ok || r.message === "Item não encontrado.") return { ok: true };
      return perm(r.message);
    }
    case "delete": {
      const r = await deleteMarkAction(payload.id);
      return r.ok ? { ok: true } : perm(r.message);
    }
    case "progress": {
      const r = await touchProgressAction(payload.topicId, {
        percent: payload.percent,
        blockId: payload.blockId,
        status: payload.status as ReadStatus | undefined,
      });
      return r.ok ? { ok: true } : perm(r.message);
    }
    default:
      return perm("Registro inválido.");
  }
}

export type ImportPreview =
  | {
      ok: true;
      exists: boolean;
      existingTopics: number;
      newTopics: number;
      toArchive: { id: string; title: string }[];
      takenBlocks: { id: string; topicId: string }[];
      marksOnDiscipline: number;
    }
  | Fail;

/**
 * Compara o arquivo com o que já está no banco: o que é novo, o que seria arquivado
 * (modo disciplina) e blocos que já pertencem a outro tópico.
 */
export async function previewImportAction(input: {
  disciplineId: string;
  topicIds: string[];
  blocks: { id: string; topicId: string }[];
  mode: "disciplina" | "capitulos";
  chapterIds: string[];
}): Promise<ImportPreview> {
  await requireUser();
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_question_admin");
  if (!admin) return { ok: false, message: "Só a conta administradora pode importar materiais." };
  const [disc, topics, marks] = await Promise.all([
    supabase.from("library_disciplines").select("id").eq("id", input.disciplineId).maybeSingle(),
    supabase
      .from("library_topics")
      .select("id, title, chapter_id, archived_at")
      .eq("discipline_id", input.disciplineId),
    supabase
      .from("library_marks")
      .select("id, library_topics!inner(discipline_id)", { count: "exact", head: true })
      .eq("library_topics.discipline_id", input.disciplineId),
  ]);
  if (disc.error || topics.error) return { ok: false, message: dbErrorMessage(disc.error ?? topics.error) };
  const incoming = new Set(input.topicIds);
  const existing = (topics.data ?? []).filter((t) => !t.archived_at);
  const existingIds = new Set((topics.data ?? []).map((t) => t.id));
  const chapters = new Set(input.chapterIds);
  const toArchive = existing
    .filter((t) => !incoming.has(t.id) && (input.mode === "disciplina" || chapters.has(t.chapter_id)))
    .map((t) => ({ id: t.id, title: t.title }));
  // blocos do arquivo que já existem em outro tópico (o banco recusaria)
  const taken: { id: string; topicId: string }[] = [];
  const ids = input.blocks.map((b) => b.id);
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await supabase
      .from("library_blocks")
      .select("id, topic_id")
      .in("id", ids.slice(i, i + 300))
      .is("archived_at", null);
    const want = new Map(input.blocks.map((b) => [b.id, b.topicId]));
    for (const b of data ?? [])
      if (want.get(b.id) !== b.topic_id) taken.push({ id: b.id, topicId: b.topic_id });
  }
  return {
    ok: true,
    exists: Boolean(disc.data),
    existingTopics: input.topicIds.filter((id) => existingIds.has(id)).length,
    newTopics: input.topicIds.filter((id) => !existingIds.has(id)).length,
    toArchive,
    takenBlocks: taken.slice(0, 50),
    marksOnDiscipline: marks.count ?? 0,
  };
}
