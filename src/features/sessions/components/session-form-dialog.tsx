"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import {
  addMinutesToTime,
  formatDuration,
  minutesBetween,
  minutesToInput,
  parseDurationInput,
} from "@/lib/format";
import type { StudyType } from "@/lib/study-types";
import { cn } from "@/lib/utils";
import type { StudySubject } from "@/features/timer/types";
import { useStudy } from "@/features/timer/study-provider";
import { saveSessionAction, type SessionFormState } from "../actions";
import { GroupLabel, StudyTypeChips, SubjectChips } from "./pickers";

export type SessionDraft = {
  id?: string;
  subjectId?: string;
  date?: string;
  start?: string;
  end?: string;
  durationMinutes?: number;
  studyType?: StudyType;
  topic?: string | null;
  notes?: string | null;
  questionsAnswered?: number | null;
  questionsCorrect?: number | null;
  /** Matéria da sessão editada, caso esteja arquivada (fora da lista ativa). */
  subject?: StudySubject;
};

const idle: SessionFormState = { status: "idle" };

export function SessionFormDialog({
  open,
  onOpenChange,
  subjects,
  todayISO,
  draft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: StudySubject[];
  todayISO: string;
  draft: Partial<SessionDraft>;
}) {
  const editing = Boolean(draft.id);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={editing ? "Editar sessão" : "Registrar sessão"}
        className="sm:w-[min(560px,calc(100vw-32px))]"
      >
        {open && (
          <SessionForm
            subjects={subjects}
            todayISO={todayISO}
            draft={draft}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function yesterday(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function SessionForm({
  subjects,
  todayISO,
  draft,
  onDone,
}: {
  subjects: StudySubject[];
  todayISO: string;
  draft: Partial<SessionDraft>;
  onDone: () => void;
}) {
  const { sync } = useStudy();
  const editing = Boolean(draft.id);
  const [state, formAction] = useActionState(saveSessionAction, idle);
  const v = state.values;

  // Matérias arquivadas continuam editáveis numa sessão antiga.
  const [subjectId, setSubjectId] = useState(v?.subject_id ?? draft.subjectId);
  const [date, setDate] = useState(v?.date ?? draft.date ?? todayISO);
  const [start, setStart] = useState(v?.start ?? draft.start ?? "");
  const [end, setEnd] = useState(v?.end ?? draft.end ?? "");
  const [duration, setDuration] = useState(
    v?.duration ?? (draft.durationMinutes ? minutesToInput(draft.durationMinutes) : ""),
  );
  const [durationTouched, setDurationTouched] = useState(Boolean(draft.durationMinutes));
  const [studyType, setStudyType] = useState<StudyType>(
    (v?.study_type as StudyType | undefined) ?? draft.studyType ?? "theory",
  );
  const [showQuestions, setShowQuestions] = useState(
    draft.questionsAnswered != null || draft.studyType === "questions" || draft.studyType === "mock_exam",
  );
  const [showNotes, setShowNotes] = useState(Boolean(draft.notes));

  useEffect(() => {
    if (state.status === "success") {
      toast.success(editing ? "Sessão atualizada" : "Sessão registrada");
      sync();
      onDone();
    }
  }, [state, editing, sync, onDone]);

  const interval = start && end ? minutesBetween(start, end) : null;
  const shownDuration = !durationTouched && interval !== null ? minutesToInput(interval) : duration;
  const typed = parseDurationInput(shownDuration);
  const durationHint =
    interval !== null
      ? `Intervalo de ${formatDuration(interval * 60)}. Diminua para descontar pausas.`
      : start && typed
        ? `Termina às ${addMinutesToTime(start, typed)}.`
        : "Ex.: 1:30, 90 ou 1h30. Horários são opcionais.";

  const subjectList =
    draft.subject && !subjects.some((s) => s.id === draft.subject!.id)
      ? [...subjects, draft.subject]
      : subjects;
  const fe = state.fieldErrors ?? {};
  const chooseType = (t: StudyType) => {
    setStudyType(t);
    if (t === "questions" || t === "mock_exam") setShowQuestions(true);
  };

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col" noValidate>
      {draft.id && <input type="hidden" name="id" value={draft.id} />}
      <DialogBody className="flex flex-col gap-5">
        {state.status === "error" && state.message && (
          <Notice tone="error" key={state.at}>
            {state.message}
          </Notice>
        )}

        <div className="flex flex-col gap-2">
          <GroupLabel id="session-subject">Matéria</GroupLabel>
          <SubjectChips
            subjects={subjectList}
            value={subjectId}
            onChange={setSubjectId}
            labelledBy="session-subject"
            name="subject_id"
          />
          {fe.subject_id && <p className="text-[12.5px] text-danger">{fe.subject_id}</p>}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] [&_input]:min-w-0">
          <Field
            label="Data"
            error={fe.date}
            className="col-span-2 sm:col-span-1"
            aside={
              <span className="flex gap-2 text-[12px]">
                {[
                  ["Hoje", todayISO],
                  ["Ontem", yesterday(todayISO)],
                ].map(([label, iso]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setDate(iso)}
                    className={cn(
                      "cursor-pointer rounded transition-colors",
                      date === iso ? "text-accent" : "text-fg-3 hover:text-fg-2",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </span>
            }
          >
            {(p) => (
              <Input
                {...p}
                type="date"
                name="date"
                value={date}
                max={todayISO}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </Field>
          <Field label="Início" error={fe.start}>
            {(p) => (
              <Input
                {...p}
                type="time"
                name="start"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            )}
          </Field>
          <Field label="Fim" error={fe.end}>
            {(p) => (
              <Input {...p} type="time" name="end" value={end} onChange={(e) => setEnd(e.target.value)} />
            )}
          </Field>
          <Field label="Duração" error={fe.duration} className="col-span-2 sm:col-span-1">
            {(p) => (
              <Input
                {...p}
                name="duration"
                inputMode="numeric"
                autoComplete="off"
                placeholder="1:30"
                value={shownDuration}
                onChange={(e) => {
                  setDurationTouched(true);
                  setDuration(e.target.value);
                }}
                autoFocus={!editing}
                className="tabular-nums"
              />
            )}
          </Field>
          <p className="col-span-2 -mt-2 text-[12.5px] text-fg-3 sm:col-span-4">{durationHint}</p>
        </div>

        <div className="flex flex-col gap-2">
          <GroupLabel id="session-type">Tipo de estudo</GroupLabel>
          <StudyTypeChips
            value={studyType}
            onChange={chooseType}
            labelledBy="session-type"
            name="study_type"
          />
        </div>

        <Field label="Assunto" error={fe.topic}>
          {(p) => (
            <Input
              {...p}
              name="topic"
              defaultValue={v?.topic ?? draft.topic ?? ""}
              placeholder="Ex.: Crase, controle de constitucionalidade"
              maxLength={200}
              autoComplete="off"
            />
          )}
        </Field>

        {showQuestions ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Questões resolvidas" error={fe.questions_answered}>
              {(p) => (
                <Input
                  {...p}
                  name="questions_answered"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={v?.questions_answered ?? draft.questionsAnswered ?? ""}
                />
              )}
            </Field>
            <Field label="Acertos" error={fe.questions_correct}>
              {(p) => (
                <Input
                  {...p}
                  name="questions_correct"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={v?.questions_correct ?? draft.questionsCorrect ?? ""}
                />
              )}
            </Field>
          </div>
        ) : (
          <input type="hidden" name="questions_answered" value="" />
        )}
        {!showQuestions && <input type="hidden" name="questions_correct" value="" />}

        {showNotes ? (
          <Field label="Observações" error={fe.notes}>
            {(p) => (
              <Textarea
                {...p}
                name="notes"
                rows={3}
                maxLength={5000}
                defaultValue={v?.notes ?? draft.notes ?? ""}
              />
            )}
          </Field>
        ) : (
          <input type="hidden" name="notes" value="" />
        )}

        {(!showQuestions || !showNotes) && (
          <div className="-mt-1 flex flex-wrap gap-x-4 gap-y-2">
            {!showQuestions && <AddLink onClick={() => setShowQuestions(true)}>Questões resolvidas</AddLink>}
            {!showNotes && <AddLink onClick={() => setShowNotes(true)}>Observações</AddLink>}
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton variant="primary" disabled={subjectList.length === 0}>
          {editing ? "Salvar alterações" : "Registrar sessão"}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

function AddLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1 rounded text-[13px] text-fg-2 transition-colors hover:text-fg"
    >
      <Plus className="size-3.5" />
      {children}
    </button>
  );
}
