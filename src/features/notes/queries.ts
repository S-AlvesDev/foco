import "server-only";
import { createClient } from "@/lib/supabase/server";
import { stripAccents } from "@/lib/format";
import type { Json, Tables } from "@/lib/supabase/database.types";

export type Label = Pick<Tables<"note_labels">, "id" | "name" | "color" | "kind" | "position">;

export type NoteListItem = {
  id: string;
  title: string;
  topic: string | null;
  snippet: string;
  is_favorite: boolean;
  subject_id: string | null;
  category_id: string | null;
  tagIds: string[];
  updated_at: string;
};

export type NoteFilters = {
  q?: string;
  subjectId?: string;
  categoryId?: string;
  tagId?: string;
  favorites?: boolean;
};

/** Anotações recém-criadas e ainda vazias não aparecem em listas (são descartadas ao sair do editor). */
export const NOT_EMPTY = "title.neq.,content_text.neq.,topic.not.is.null";

export async function listLabels(): Promise<Label[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("note_labels")
    .select("id, name, color, kind, position")
    .order("kind")
    .order("position")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listNotes(filters: NoteFilters = {}, limit = 300): Promise<NoteListItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("study_notes")
    .select(
      "id, title, topic, content_text, is_favorite, subject_id, category_id, updated_at, study_note_tags(label_id)",
    )
    .or(NOT_EMPTY)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (filters.q?.trim()) {
    q = q.textSearch("search", stripAccents(filters.q.trim()), { type: "websearch", config: "portuguese" });
  }
  if (filters.subjectId) q = q.eq("subject_id", filters.subjectId);
  if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
  if (filters.favorites) q = q.eq("is_favorite", true);
  const { data, error } = await q;
  if (error) throw error;
  let notes = (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    topic: n.topic,
    snippet: n.content_text
      .split(/\n+/)
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" · ")
      .slice(0, 220),
    is_favorite: n.is_favorite,
    subject_id: n.subject_id,
    category_id: n.category_id,
    tagIds: (n.study_note_tags ?? []).map((t) => t.label_id),
    updated_at: n.updated_at,
  }));
  if (filters.tagId) notes = notes.filter((n) => n.tagIds.includes(filters.tagId!));
  return notes;
}

export type Note = Omit<NoteListItem, "snippet"> & { content: Json; content_text: string };

export async function getNote(id: string): Promise<Note | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_notes")
    .select(
      "id, title, topic, content, content_text, is_favorite, subject_id, category_id, updated_at, study_note_tags(label_id)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { study_note_tags, ...rest } = data;
  return { ...rest, tagIds: (study_note_tags ?? []).map((t) => t.label_id) };
}
