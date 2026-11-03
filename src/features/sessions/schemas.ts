import { z } from "zod";
import { addMinutesToTime, localDateISO, minutesBetween, parseDurationInput } from "@/lib/format";
import { zonedToUtc } from "@/lib/time";

const time = z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/, "Use o formato 14:30.")]);
const optionalCount = z.union([
  z.literal("").transform(() => null),
  z.coerce
    .number()
    .int("Use um número inteiro.")
    .min(0, "Não pode ser negativo.")
    .max(10000, "Valor alto demais."),
]);

export const sessionFormSchema = z.object({
  id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  subject_id: z.string().uuid("Escolha a matéria."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  start: time,
  end: time,
  duration: z.string().trim().max(20),
  study_type: z.enum(["theory", "questions", "review", "mock_exam", "reading"]),
  topic: z.string().trim().max(200, "Use até 200 caracteres."),
  notes: z.string().trim().max(5000, "Use até 5.000 caracteres."),
  questions_answered: optionalCount,
  questions_correct: optionalCount,
});

export type SessionField =
  | "subject_id"
  | "date"
  | "start"
  | "end"
  | "duration"
  | "study_type"
  | "topic"
  | "notes"
  | "questions_answered"
  | "questions_correct";

export const SESSION_FIELDS = [
  "id",
  "subject_id",
  "date",
  "start",
  "end",
  "duration",
  "study_type",
  "topic",
  "notes",
  "questions_answered",
  "questions_correct",
] as const;

type Parsed = z.infer<typeof sessionFormSchema>;

export type ResolvedSession = {
  subject_id: string;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  study_type: Parsed["study_type"];
  topic: string | null;
  notes: string | null;
  questions_answered: number | null;
  questions_correct: number | null;
};

/**
 * Regras do registro manual, no fuso do usuário:
 * início + fim → duração = intervalo (pode ser menor, para descontar pausas);
 * início + duração → calcula o fim; só duração → sem horários.
 * Fim antes do início significa que passou da meia-noite.
 */
export function resolveSession(
  v: Parsed,
  tz: string,
  now: Date,
): { ok: true; data: ResolvedSession } | { ok: false; errors: Partial<Record<SessionField, string>> } {
  const errors: Partial<Record<SessionField, string>> = {};
  const today = localDateISO(tz, now);
  if (v.date > today) errors.date = "A data não pode estar no futuro.";

  const typed = v.duration ? parseDurationInput(v.duration) : null;
  if (v.duration && typed === null) errors.duration = "Não entendi. Use 1:30, 90 ou 1h30.";
  if (v.end && !v.start) errors.start = "Informe o início.";

  let minutes: number | null = typed;
  let endTime = v.end;
  if (v.start && v.end) {
    const interval = minutesBetween(v.start, v.end);
    if (typed !== null && typed > interval) errors.duration = "Maior que o intervalo entre início e fim.";
    minutes = typed ?? interval;
  } else if (v.start) {
    if (typed === null && !errors.duration) errors.duration = "Informe o fim ou a duração.";
    else if (typed !== null) endTime = addMinutesToTime(v.start, typed);
  } else if (typed === null && !errors.duration) {
    errors.duration = "Informe a duração.";
  }

  if (minutes !== null && !errors.duration) {
    if (minutes < 1) errors.duration = "Mínimo de 1 minuto.";
    else if (minutes > 24 * 60) errors.duration = "Máximo de 24 horas.";
  }

  if (
    v.questions_answered !== null &&
    v.questions_correct !== null &&
    v.questions_correct > v.questions_answered
  ) {
    errors.questions_correct = "Acertos não podem passar do total.";
  }
  if (v.questions_answered === null && v.questions_correct !== null) {
    errors.questions_answered = "Informe quantas resolveu.";
  }

  let startedAt: Date | null = null;
  let endedAt: Date | null = null;
  if (v.start && endTime && minutes !== null && !errors.duration && !errors.date) {
    startedAt = zonedToUtc(v.date, v.start, tz);
    endedAt = new Date(startedAt.getTime() + minutesBetween(v.start, endTime) * 60_000);
    if (endedAt.getTime() > now.getTime() + 60_000) errors.end = "O fim está no futuro.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      subject_id: v.subject_id,
      session_date: v.date,
      started_at: startedAt?.toISOString() ?? null,
      ended_at: endedAt?.toISOString() ?? null,
      duration_seconds: minutes! * 60,
      study_type: v.study_type,
      topic: v.topic || null,
      notes: v.notes || null,
      questions_answered: v.questions_answered,
      questions_correct: v.questions_correct,
    },
  };
}
