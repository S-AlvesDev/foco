import type { Enums } from "@/lib/supabase/database.types";

export type StudyType = Enums<"study_type">;

export const STUDY_TYPES: { value: StudyType; label: string }[] = [
  { value: "theory", label: "Teoria" },
  { value: "questions", label: "Questões" },
  { value: "review", label: "Revisão" },
  { value: "mock_exam", label: "Simulado" },
  { value: "reading", label: "Leitura" },
];

export const studyTypeLabel = (t: StudyType) => STUDY_TYPES.find((s) => s.value === t)?.label ?? t;
