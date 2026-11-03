"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import type { Json } from "@/lib/supabase/database.types";
import { uuid } from "@/features/subjects/schemas";

type Result = { ok: true } | { ok: false; message: string };
const fail = (message: string): Result => ({ ok: false, message });

export async function createNoteAction(input: {
  subjectId?: string | null;
  categoryId?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  await requireUser();
  const supabase = await createClient();
  // Limpa anotações que ficaram vazias e esquecidas (ex.: a página foi fechada antes de carregar).
  await supabase
    .from("study_notes")
    .delete()
    .eq("title", "")
    .eq("content_text", "")
    .is("topic", null)
    .lt("updated_at", new Date(Date.now() - 10 * 60_000).toISOString());
  const { data, error } = await supabase
    .from("study_notes")
    .insert({
      subject_id: input.subjectId && uuid.safeParse(input.subjectId).success ? input.subjectId : null,
      category_id: input.categoryId && uuid.safeParse(input.categoryId).success ? input.categoryId : null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: dbErrorMessage(error) };
  return { ok: true, id: data.id };
}

const patchSchema = z
  .object({
    title: z.string().max(200),
    topic: z
      .string()
      .max(200)
      .transform((v) => (v.trim() === "" ? null : v.trim())),
    subject_id: uuid.nullable(),
    category_id: uuid.nullable(),
    is_favorite: z.boolean(),
    content: z.custom<Json>((v) => typeof v === "object" && v !== null),
    content_text: z.string().max(200_000),
  })
  .partial();

export type NotePatch = z.input<typeof patchSchema>;

/** Autosave: aplica só os campos que mudaram. Não chama refresh (o editor já está atualizado). */
export async function updateNoteAction(id: string, patch: NotePatch): Promise<Result> {
  await requireUser();
  if (!uuid.safeParse(id).success) return fail("Anotação inválida.");
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  if (Object.keys(parsed.data).length === 0) return { ok: true };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_notes")
    .update(parsed.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23503") return fail("Matéria ou categoria não encontrada.");
    if (error.code === "23514") return fail("A anotação ficou grande demais para salvar.");
    return fail(dbErrorMessage(error));
  }
  if (!data) return fail("Anotação não encontrada. Ela pode ter sido excluída.");
  return { ok: true };
}

export async function setNoteTagsAction(id: string, labelIds: string[]): Promise<Result> {
  await requireUser();
  const parsed = z.object({ id: uuid, labelIds: z.array(uuid).max(30) }).safeParse({ id, labelIds });
  if (!parsed.success) return fail("Etiquetas inválidas.");
  const supabase = await createClient();
  const del = await supabase.from("study_note_tags").delete().eq("note_id", id);
  if (del.error) return fail(dbErrorMessage(del.error));
  if (labelIds.length) {
    const ins = await supabase
      .from("study_note_tags")
      .insert([...new Set(labelIds)].map((label_id) => ({ note_id: id, label_id })));
    if (ins.error) return fail(dbErrorMessage(ins.error));
  }
  return { ok: true };
}

export async function deleteNoteAction(id: string): Promise<Result> {
  await requireUser();
  if (!uuid.safeParse(id).success) return fail("Anotação inválida.");
  const supabase = await createClient();
  const { error } = await supabase.from("study_notes").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true };
}

/** Ao sair do editor: apaga a anotação se ela ficou totalmente vazia. */
export async function discardIfEmptyAction(id: string): Promise<void> {
  await requireUser();
  if (!uuid.safeParse(id).success) return;
  const supabase = await createClient();
  await supabase
    .from("study_notes")
    .delete()
    .eq("id", id)
    .eq("title", "")
    .eq("content_text", "")
    .is("topic", null);
}

// --- Categorias e etiquetas

const labelSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome.").max(40, "Use até 40 caracteres."),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  kind: z.enum(["category", "tag"]),
});

export async function createLabelAction(
  input: z.input<typeof labelSchema>,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  await requireUser();
  const parsed = labelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("note_labels")
    .select("position")
    .eq("kind", parsed.data.kind)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("note_labels")
    .insert({ ...parsed.data, position: (last?.position ?? -1) + 1 })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Já existe uma com esse nome." };
    return { ok: false, message: dbErrorMessage(error) };
  }
  refresh();
  return { ok: true, id: data.id };
}

export async function updateLabelAction(
  id: string,
  patch: { name?: string; color?: string },
): Promise<Result> {
  await requireUser();
  const parsed = labelSchema.pick({ name: true, color: true }).partial().safeParse(patch);
  if (!uuid.safeParse(id).success || !parsed.success) {
    return fail(
      parsed.success ? "Etiqueta inválida." : (parsed.error.issues[0]?.message ?? "Dados inválidos."),
    );
  }
  const supabase = await createClient();
  const { error } = await supabase.from("note_labels").update(parsed.data).eq("id", id);
  if (error) return fail(error.code === "23505" ? "Já existe uma com esse nome." : dbErrorMessage(error));
  refresh();
  return { ok: true };
}

export async function deleteLabelAction(id: string): Promise<Result> {
  await requireUser();
  if (!uuid.safeParse(id).success) return fail("Etiqueta inválida.");
  const supabase = await createClient();
  const { error } = await supabase.from("note_labels").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true };
}
