import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  completeJustificativa,
  justificativaIsLead,
  LIST_FILTERS,
  toQuery,
  type Filters,
  type ListFilter,
  type Status,
} from "./model";

/** O banco de produção ainda não tem as tabelas e funções da migração 0009. */
export function isMissingSchema(error: { code?: string } | null | undefined) {
  return ["PGRST202", "PGRST205", "42P01", "42883"].includes(error?.code ?? "");
}

export class QuestionsNotInstalled extends Error {
  constructor() {
    super("QUESTIONS_NOT_INSTALLED");
  }
}

export type Facets = {
  area: { value: string; n: number }[];
  lists: Record<ListFilter, { value: string; n: number }[]>;
  status: Record<Status, number>;
};

/** Área escolhida pela pessoa (null = ainda não escolheu). */
export const getAreaPref = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("question_prefs").select("area").maybeSingle();
  if (isMissingSchema(error)) throw new QuestionsNotInstalled();
  if (error) throw error;
  return data?.area ?? null;
});

export async function getFacets(f: Filters): Promise<Facets> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("question_facets", { p: toQuery(f) });
  if (error) throw error;
  const lists = Object.fromEntries(
    LIST_FILTERS.map((k) => [k, [] as { value: string; n: number }[]]),
  ) as Facets["lists"];
  const area: Facets["area"] = [];
  const status = {
    all: 0,
    unanswered: 0,
    answered: 0,
    correct: 0,
    wrong: 0,
    favorite: 0,
    noted: 0,
  } as Facets["status"];
  for (const r of data ?? []) {
    const n = Number(r.n);
    if (r.field === "area") area.push({ value: r.value, n });
    else if (r.field === "status") status[r.value as Status] = n;
    else if ((LIST_FILTERS as readonly string[]).includes(r.field))
      lists[r.field as ListFilter].push({ value: r.value, n });
  }
  const byCount = (a: { value: string; n: number }, b: { value: string; n: number }) =>
    b.n - a.n || a.value.localeCompare(b.value, "pt-BR");
  area.sort(byCount);
  for (const k of LIST_FILTERS) {
    lists[k].sort(
      k === "dificuldade" ? (a, b) => DIFF_ORDER.indexOf(a.value) - DIFF_ORDER.indexOf(b.value) : byCount,
    );
  }
  return { area, lists, status };
}
const DIFF_ORDER = ["facil", "intermediaria", "dificil"];

/** Questão na posição `index` (0 = primeira) do filtro, e o total. */
export async function findAt(f: Filters, index: number, seed: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("question_search", {
    p: toQuery(f),
    p_offset: index,
    p_limit: 1,
    ...(seed ? { p_seed: seed } : {}),
  });
  if (error) throw error;
  const row = data?.[0];
  if (row) return { id: row.id, total: Number(row.total) };
  // Fora do fim: descobre o total para oferecer voltar.
  if (index > 0) {
    const { data: first, error: e2 } = await supabase.rpc("question_search", {
      p: toQuery(f),
      p_offset: 0,
      p_limit: 1,
    });
    if (e2) throw e2;
    return { id: null, total: Number(first?.[0]?.total ?? 0) };
  }
  return { id: null, total: 0 };
}

/** O que a tela mostra antes de responder: sem gabarito nem comentários. */
export type PublicQuestion = {
  id: string;
  area: string;
  concurso: string;
  cargo: string | null;
  disciplina: string;
  assunto: string;
  subassunto: string | null;
  banca: string | null;
  tipo: "certo_errado" | "multipla_escolha";
  dificuldade: string;
  enunciado: string;
  alternativas: Record<string, string> | null;
  origem: string | null;
};

export async function getPublicQuestion(id: string): Promise<PublicQuestion | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, area, concurso, cargo, disciplina, assunto, subassunto, banca_referencia, tipo, dificuldade, enunciado, alternativas, origem",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    banca: data.banca_referencia,
    tipo: data.tipo as PublicQuestion["tipo"],
    alternativas: (data.alternativas as Record<string, string> | null) ?? null,
  };
}

export type Reference = { titulo?: string; url?: string; localizador?: string | null };

export type Solution = {
  gabarito: string;
  comentario: string | null;
  justificativa: string | null;
  /** A justificativa é só a primeira frase do comentário (não precisa aparecer em destaque). */
  justificativaIsLead: boolean;
  explicacoes: Record<string, string> | null;
  referencias: Reference[];
  licenca: string | null;
};

export async function getSolution(id: string): Promise<Solution | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .select("gabarito, comentario, justificativa, explicacoes_incorretas, referencias, licenca")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const refs = Array.isArray(data.referencias) ? (data.referencias as Reference[]) : [];
  return {
    gabarito: data.gabarito,
    comentario: data.comentario,
    // Lotes antigos cortaram a frase em abreviações ("O art."): completa com o comentário.
    justificativa: completeJustificativa(data.justificativa, data.comentario),
    justificativaIsLead: justificativaIsLead(data.justificativa, data.comentario),
    explicacoes: (data.explicacoes_incorretas as Record<string, string> | null) ?? null,
    // Só links http(s): o arquivo vem de fora e o link vira <a href>.
    referencias: refs.filter((r) => !r.url || /^https?:\/\//i.test(r.url)),
    licenca: data.licenca,
  };
}

export type Community = { total: number; correct: number; byAnswer: Record<string, number> };

export async function getCommunity(id: string): Promise<Community> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("question_community", { p_id: id });
  if (error) throw error;
  const d = (data ?? {}) as { total?: number; correct?: number; by_answer?: Record<string, number> };
  return { total: Number(d.total ?? 0), correct: Number(d.correct ?? 0), byAnswer: d.by_answer ?? {} };
}

export type MyQuestionState = {
  favorite: boolean;
  note: string | null;
  attempts: number;
  correct: number;
  last: { answer: string; isCorrect: boolean; on: string } | null;
};

export async function getMyState(id: string): Promise<MyQuestionState> {
  const supabase = await createClient();
  const [notes, attempts] = await Promise.all([
    supabase.from("question_notes").select("favorite, note").eq("question_id", id).maybeSingle(),
    supabase
      .from("question_attempts")
      .select("answer, is_correct, answered_on")
      .eq("question_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (notes.error) throw notes.error;
  if (attempts.error) throw attempts.error;
  const list = attempts.data ?? [];
  const last = list[0];
  return {
    favorite: notes.data?.favorite ?? false,
    note: notes.data?.note ?? null,
    attempts: list.length,
    correct: list.filter((a) => a.is_correct).length,
    last: last ? { answer: last.answer, isCorrect: last.is_correct, on: last.answered_on } : null,
  };
}

export const isQuestionAdmin = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_question_admin");
  if (error) throw error;
  return data === true;
});

export async function questionAdminExists() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("question_admin_exists");
  if (error) throw error;
  return data === true;
}

export type OpenReport = {
  id: string;
  questionId: string;
  category: string;
  message: string | null;
  createdAt: string;
  mine: boolean;
};

/** Erros reportados ainda abertos (administradora vê todos; os demais, só os próprios). */
export async function listOpenReports(userId: string): Promise<OpenReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_reports")
    .select("id, question_id, category, message, created_at, user_id")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    questionId: r.question_id,
    category: r.category,
    message: r.message,
    createdAt: r.created_at,
    mine: r.user_id === userId,
  }));
}

export type DailyRow = {
  day: string;
  area: string;
  disciplina: string;
  assunto: string;
  answered: number;
  correct: number;
};

/** Respostas da própria pessoa no período, por dia, disciplina e assunto. */
export async function getQuestionDaily(from: string, to: string): Promise<DailyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("question_daily", { p_from: from, p_to: to });
  // Antes da migração 0009 o painel e o desempenho seguem funcionando, só sem questões.
  if (isMissingSchema(error)) return [];
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, answered: Number(r.answered), correct: Number(r.correct) }));
}

/** Total de questões no catálogo por área (para a escolha de área). */
export async function getCatalogSize() {
  const supabase = await createClient();
  const { count, error } = await supabase.from("questions").select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}
