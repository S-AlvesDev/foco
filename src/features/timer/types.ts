import type { Tables } from "@/lib/supabase/database.types";

export type Timer = Pick<
  Tables<"active_timers">,
  | "id"
  | "subject_id"
  | "study_type"
  | "topic"
  | "started_at"
  | "segment_started_at"
  | "accumulated_seconds"
  | "status"
>;

export type StudySubject = { id: string; name: string; color: string };

export type StudyContext = {
  timer: Timer | null;
  subjects: StudySubject[];
  timezone: string;
  todayISO: string;
  /** Matéria da sessão mais recente, para pré-selecionar. */
  lastSubjectId: string | null;
  /** Relógio do servidor (ms), para corrigir a diferença com o aparelho. */
  serverNow: number;
};

export type TimerResult =
  { ok: true; timer: Timer | null; serverNow: number } | { ok: false; message: string };

export const TIMER_COLUMNS =
  "id, subject_id, study_type, topic, started_at, segment_started_at, accumulated_seconds, status";
