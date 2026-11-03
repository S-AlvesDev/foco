"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { addDays } from "@/lib/dates";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GroupLabel, SubjectChips } from "@/features/sessions/components/pickers";
import type { StudySubject } from "@/features/timer/types";
import {
  completeReviewAction,
  createReviewsAction,
  reopenReviewAction,
  updateReviewAction,
  type ReviewResult,
} from "../actions";
import { REVIEW_PRESETS, listDates, suggestedNextInterval, type Review } from "../schedule";

export type ReviewDraft = {
  subjectId?: string | null;
  topic?: string | null;
  noteId?: string | null;
  sessionId?: string | null;
};

const chip =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors duration-150 select-none";
const on = "border-accent bg-accent-subtle text-fg";
const off = "border-border bg-surface-2 text-fg-2 hover:border-border-strong hover:text-fg";
const dateInput =
  "h-9 w-fit rounded-md border border-border bg-surface-2 px-2.5 text-[13.5px] text-fg focus:border-accent focus:outline-none";

type Err = Extract<ReviewResult, { ok: false }> | null;

/** "10 nov" sem o ponto final, para usar no meio de frases. */
const dateInSentence = (iso: string, today: string) => shortDate(iso, today).replace(/\.$/, "");

/** Agendar (uma ou várias datas) ou editar uma revisão pendente. */
export function ReviewDialog({
  open,
  onOpenChange,
  subjects,
  todayISO,
  draft,
  review,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: StudySubject[];
  todayISO: string;
  draft?: ReviewDraft;
  review?: Review;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={review ? "Editar revisão" : "Agendar revisão"}
        description={
          review ? undefined : "Escolha uma ou mais datas. Cada uma vira uma revisão na sua lista."
        }
      >
        {open &&
          (review ? (
            <EditForm
              review={review}
              subjects={subjects}
              todayISO={todayISO}
              onDone={() => onOpenChange(false)}
            />
          ) : (
            <CreateForm
              draft={draft ?? {}}
              subjects={subjects}
              todayISO={todayISO}
              onDone={() => onOpenChange(false)}
            />
          ))}
      </DialogContent>
    </Dialog>
  );
}

function TopicField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <Field label="Assunto" error={error}>
      {(p) => (
        <Input
          {...p}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={200}
          placeholder="Ex.: Crase, Atos administrativos"
          autoComplete="off"
        />
      )}
    </Field>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12.5px] text-danger" role="alert">
      {children}
    </p>
  );
}

function CreateForm({
  draft,
  subjects,
  todayISO,
  onDone,
}: {
  draft: ReviewDraft;
  subjects: StudySubject[];
  todayISO: string;
  onDone: () => void;
}) {
  const [subjectId, setSubjectId] = useState(draft.subjectId ?? undefined);
  const [topic, setTopic] = useState(draft.topic ?? "");
  const [presets, setPresets] = useState<number[]>([1]);
  const [custom, setCustom] = useState<string | null>(null);
  const [error, setError] = useState<Err>(null);
  const [pending, startTransition] = useTransition();

  const unique = [...new Set([...presets.map((d) => addDays(todayISO, d)), ...(custom ? [custom] : [])])];

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await createReviewsAction({
        subjectId: subjectId ?? "",
        topic,
        dates: unique,
        noteId: draft.noteId,
        sessionId: draft.sessionId,
      });
      if (!res.ok) return setError(res);
      toast.success(unique.length > 1 ? `${unique.length} revisões agendadas` : "Revisão agendada");
      onDone();
    });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
    >
      <DialogBody className="flex flex-col gap-5">
        {error && !error.field && <Notice tone="error">{error.message}</Notice>}
        <div className="flex flex-col gap-2">
          <GroupLabel id="review-subject">Matéria</GroupLabel>
          <SubjectChips
            subjects={subjects}
            value={subjectId}
            onChange={setSubjectId}
            labelledBy="review-subject"
          />
          {error?.field === "subject" && <FieldError>{error.message}</FieldError>}
        </div>

        <TopicField
          value={topic}
          onChange={setTopic}
          error={error?.field === "topic" ? error.message : undefined}
        />

        <div className="flex flex-col gap-2">
          <GroupLabel id="review-when">Quando revisar</GroupLabel>
          <div role="group" aria-labelledby="review-when" className="flex flex-wrap gap-1.5">
            {REVIEW_PRESETS.map((p) => {
              const active = presets.includes(p.days);
              return (
                <button
                  key={p.days}
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  onClick={() =>
                    setPresets((cur) => (active ? cur.filter((d) => d !== p.days) : [...cur, p.days]))
                  }
                  className={cn(chip, active ? on : off)}
                >
                  {active && <Check className="size-3.5" />}
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              role="checkbox"
              aria-checked={custom !== null}
              onClick={() => setCustom(custom === null ? addDays(todayISO, 3) : null)}
              className={cn(chip, custom !== null ? on : off)}
            >
              {custom !== null && <Check className="size-3.5" />}
              Outra data
            </button>
          </div>
          {custom !== null && (
            <input
              type="date"
              aria-label="Data da revisão"
              value={custom}
              min={todayISO}
              onChange={(e) => setCustom(e.target.value || null)}
              className={dateInput}
            />
          )}
          {error?.field === "dates" ? (
            <FieldError>{error.message}</FieldError>
          ) : (
            <p className="text-[12.5px] text-fg-3">
              {unique.length === 0
                ? "Escolha pelo menos uma data."
                : unique.length === 1
                  ? `Uma revisão em ${listDates(unique, todayISO)}`
                  : `${unique.length} revisões: ${listDates(unique, todayISO)}`}
            </p>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending} disabled={unique.length === 0}>
          {unique.length > 1 ? "Agendar revisões" : "Agendar revisão"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditForm({
  review,
  subjects,
  todayISO,
  onDone,
}: {
  review: Review;
  subjects: StudySubject[];
  todayISO: string;
  onDone: () => void;
}) {
  const [subjectId, setSubjectId] = useState<string | undefined>(review.subject_id);
  const [topic, setTopic] = useState(review.topic);
  const [due, setDue] = useState(review.due_date);
  const [error, setError] = useState<Err>(null);
  const [pending, startTransition] = useTransition();
  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await updateReviewAction({
        id: review.id,
        subjectId: subjectId ?? "",
        topic,
        dueDate: due,
      });
      if (!res.ok) return setError(res);
      toast.success("Revisão atualizada");
      onDone();
    });
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
    >
      <DialogBody className="flex flex-col gap-5">
        {error && !error.field && <Notice tone="error">{error.message}</Notice>}
        <div className="flex flex-col gap-2">
          <GroupLabel id="review-edit-subject">Matéria</GroupLabel>
          <SubjectChips
            subjects={subjects}
            value={subjectId}
            onChange={setSubjectId}
            labelledBy="review-edit-subject"
          />
        </div>
        <TopicField
          value={topic}
          onChange={setTopic}
          error={error?.field === "topic" ? error.message : undefined}
        />
        <Field
          label="Data"
          hint={due < todayISO ? "Esta revisão está atrasada. Escolha uma nova data." : undefined}
        >
          {(p) => (
            <Input
              {...p}
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="w-fit"
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          Salvar revisão
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Concluir uma revisão, com comentário opcional e a próxima já sugerida. */
export function CompleteReviewDialog({
  review,
  onOpenChange,
  subjectName,
  todayISO,
}: {
  review: Review | null;
  onOpenChange: (open: boolean) => void;
  subjectName?: string;
  todayISO: string;
}) {
  return (
    <Dialog open={review !== null} onOpenChange={onOpenChange}>
      <DialogContent
        title="Concluir revisão"
        description={review ? `${review.topic}${subjectName ? ` em ${subjectName}` : ""}` : undefined}
      >
        {review && <CompleteForm review={review} todayISO={todayISO} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CompleteForm({
  review,
  todayISO,
  onDone,
}: {
  review: Review;
  todayISO: string;
  onDone: () => void;
}) {
  const suggested = suggestedNextInterval(review.interval_days);
  const options = [...new Set([suggested, 7, 30])].sort((a, b) => a - b);
  const [next, setNext] = useState<number | "custom" | null>(suggested);
  const [custom, setCustom] = useState(addDays(todayISO, suggested));
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nextDue = next === null ? null : next === "custom" ? custom : addDays(todayISO, next);

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await completeReviewAction({ id: review.id, comment, nextDue });
      if (!res.ok) return setError(res.message);
      toast.success(
        nextDue ? `Revisão concluída. Próxima em ${dateInSentence(nextDue, todayISO)}.` : "Revisão concluída",
        {
          action: {
            label: "Desfazer",
            onClick: () =>
              void reopenReviewAction(review.id).then((r) =>
                r.ok ? toast("Conclusão desfeita") : toast.error(r.message),
              ),
          },
        },
      );
      onDone();
    });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
    >
      <DialogBody className="flex flex-col gap-5">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Como foi (opcional)">
          {(p) => (
            <Textarea
              {...p}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              placeholder="O que ficou claro, o que ainda confunde."
            />
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <GroupLabel id="review-next">Próxima revisão</GroupLabel>
          <div role="radiogroup" aria-labelledby="review-next" className="flex flex-wrap gap-1.5">
            {options.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={next === d}
                onClick={() => setNext(d)}
                className={cn(chip, next === d ? on : off)}
              >
                Em {d} dias
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={next === "custom"}
              onClick={() => setNext("custom")}
              className={cn(chip, next === "custom" ? on : off)}
            >
              Outra data
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={next === null}
              onClick={() => setNext(null)}
              className={cn(chip, next === null ? on : off)}
            >
              Não agendar
            </button>
          </div>
          {next === "custom" && (
            <input
              type="date"
              aria-label="Data da próxima revisão"
              value={custom}
              min={addDays(todayISO, 1)}
              onChange={(e) => setCustom(e.target.value)}
              className={dateInput}
            />
          )}
          <p className="text-[12.5px] text-fg-3">
            {nextDue
              ? `Uma nova revisão fica agendada para ${dateInSentence(nextDue, todayISO)}.`
              : "Este assunto sai da sua lista de pendentes."}
          </p>
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          Concluir revisão
        </Button>
      </DialogFooter>
    </form>
  );
}
