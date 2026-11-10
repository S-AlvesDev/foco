"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { importItemSchema, REPORT_CATEGORIES } from "./model";
import { getCommunity, getSolution, type Community, type Solution } from "./queries";
import { recordPracticeFromQuestion } from "@/features/memory/actions";

type Fail = { ok: false; message: string };

const questionId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/);

export type AnswerResult = { ok: true; correct: boolean; solution: Solution; community: Community } | Fail;

/** Registra a resposta; o banco confere com o gabarito. Devolve a solução completa. */
export async function answerQuestionAction(
  id: string,
  answer: string,
  opts: { inReview?: boolean } = {},
): Promise<AnswerResult> {
  await requireUser();
  if (!questionId.safeParse(id).success || !/^[A-E]$/.test(answer))
    return { ok: false, message: "Resposta inválida." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_attempts")
    .insert({ question_id: id, answer })
    .select("is_correct")
    .single();
  if (error) return { ok: false, message: dbErrorMessage(error) };
  // Fora do modo revisão, questões de um tópico em revisão contam como revisão dele.
  if (!opts.inReview) await recordPracticeFromQuestion(id);
  const [solution, community] = await Promise.all([getSolution(id), getCommunity(id)]);
  if (!solution) return { ok: false, message: "Questão não encontrada." };
  return { ok: true, correct: data.is_correct, solution, community };
}

/** Discursiva: mostra a resposta esperada sem registrar nada (a pessoa ainda vai se avaliar). */
export async function revealDiscursiveAction(
  id: string,
): Promise<{ ok: true; solution: Solution; community: Community } | Fail> {
  await requireUser();
  if (!questionId.safeParse(id).success) return { ok: false, message: "Questão inválida." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("questions").select("tipo").eq("id", id).maybeSingle();
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (data?.tipo !== "discursiva")
    return { ok: false, message: "Só questões discursivas mostram a resposta antes." };
  const [solution, community] = await Promise.all([getSolution(id), getCommunity(id)]);
  if (!solution) return { ok: false, message: "Questão não encontrada." };
  return { ok: true, solution, community };
}

/** Discursiva: registra a autoavaliação (C = acertei, E = errei) e o texto escrito. */
export async function gradeDiscursiveAction(
  id: string,
  correct: boolean,
  response: string,
): Promise<AnswerResult> {
  await requireUser();
  if (!questionId.safeParse(id).success) return { ok: false, message: "Questão inválida." };
  const text = response.trim();
  if (text.length > 10000) return { ok: false, message: "Resposta com mais de 10.000 caracteres." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_attempts")
    .insert({ question_id: id, answer: correct ? "C" : "E", response: text || null })
    .select("is_correct")
    .single();
  if (error) return { ok: false, message: dbErrorMessage(error) };
  const [solution, community] = await Promise.all([getSolution(id), getCommunity(id)]);
  if (!solution) return { ok: false, message: "Questão não encontrada." };
  return { ok: true, correct: data.is_correct, solution, community };
}

export async function setFavoriteAction(id: string, favorite: boolean): Promise<{ ok: true } | Fail> {
  const user = await requireUser();
  if (!questionId.safeParse(id).success) return { ok: false, message: "Questão inválida." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("question_notes")
    .upsert({ user_id: user.id, question_id: id, favorite }, { onConflict: "user_id,question_id" });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  return { ok: true };
}

export async function saveNoteAction(
  id: string,
  note: string,
): Promise<{ ok: true; note: string | null } | Fail> {
  const user = await requireUser();
  if (!questionId.safeParse(id).success) return { ok: false, message: "Questão inválida." };
  const clean = note.trim();
  if (clean.length > 5000) return { ok: false, message: "Anotação com mais de 5.000 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("question_notes")
    .upsert(
      { user_id: user.id, question_id: id, note: clean || null },
      { onConflict: "user_id,question_id" },
    );
  if (error) return { ok: false, message: dbErrorMessage(error) };
  return { ok: true, note: clean || null };
}

const reportSchema = z.object({
  id: questionId,
  category: z.enum(Object.keys(REPORT_CATEGORIES) as [keyof typeof REPORT_CATEGORIES]),
  message: z.string().trim().max(2000, "Use no máximo 2.000 caracteres."),
});

export async function reportQuestionAction(
  input: z.input<typeof reportSchema>,
): Promise<{ ok: true } | Fail> {
  await requireUser();
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("question_reports").insert({
    question_id: parsed.data.id,
    category: parsed.data.category,
    message: parsed.data.message || null,
  });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  return { ok: true };
}

export async function resolveReportAction(reportId: string): Promise<{ ok: true } | Fail> {
  await requireUser();
  if (!z.uuid().safeParse(reportId).success) return { ok: false, message: "Relato inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_reports")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", reportId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (!data) return { ok: false, message: "Só a conta administradora marca como resolvido." };
  refresh();
  return { ok: true };
}

/** Guarda a área escolhida ("todas" vira null no banco = todas as áreas). */
export async function setAreaAction(area: string): Promise<{ ok: true } | Fail> {
  const user = await requireUser();
  if (!/^[a-z0-9_-]{1,40}$/.test(area)) return { ok: false, message: "Área inválida." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("question_prefs")
    .upsert({ user_id: user.id, area, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  return { ok: true };
}

export async function claimAdminAction(): Promise<{ ok: true } | Fail> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_question_admin");
  if (error) return { ok: false, message: dbErrorMessage(error) };
  if (data !== true) return { ok: false, message: "Outra conta já administra o banco de questões." };
  refresh();
  return { ok: true };
}

export type ImportResult =
  | {
      ok: true;
      inserted: number;
      updated: number;
      unchanged: number;
      errors: { id: string; message: string }[];
    }
  | Fail;

/** Recebe uma parte do arquivo (até 250 questões), revalida e envia ao banco. */
export async function importChunkAction(items: unknown[]): Promise<ImportResult> {
  await requireUser();
  if (!Array.isArray(items) || items.length === 0 || items.length > 250)
    return { ok: false, message: "Envie entre 1 e 250 questões por parte." };
  const valid = [];
  const errors: { id: string; message: string }[] = [];
  for (const raw of items) {
    const r = importItemSchema.safeParse(raw);
    if (r.success) valid.push(r.data);
    else
      errors.push({
        id: String((raw as { id?: unknown })?.id ?? "(sem id)"),
        message: r.error.issues[0]?.message ?? "inválida",
      });
  }
  if (valid.length === 0) return { ok: true, inserted: 0, updated: 0, unchanged: 0, errors };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_questions", { p_items: valid });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  const d = data as {
    inserted: number;
    updated: number;
    unchanged: number;
    errors: { id: string; message: string }[];
  };
  return {
    ok: true,
    inserted: d.inserted,
    updated: d.updated,
    unchanged: d.unchanged,
    errors: [...errors, ...d.errors],
  };
}
