"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { clock, formatDuration, minutesToInput, parseDurationInput } from "@/lib/format";
import { studyTypeLabel } from "@/lib/study-types";
import { discardTimerAction, finishTimerAction } from "../actions";
import { useElapsed, useStudy } from "../study-provider";

const LONG_RUN = 6 * 3600;

export function FinishTimerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { timer } = useStudy();
  return (
    <Dialog open={open && Boolean(timer)} onOpenChange={onOpenChange}>
      <DialogContent title="Finalizar sessão">
        {open && timer && <FinishForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function toCount(v: string) {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

function FinishForm({ onDone }: { onDone: () => void }) {
  const { timer, offset, data, sync, openReview } = useStudy();
  const elapsed = useElapsed(timer, offset);
  const subject = data?.subjects.find((s) => s.id === timer?.subject_id);
  const [topic, setTopic] = useState(timer?.topic ?? "");
  const [notes, setNotes] = useState("");
  const [answered, setAnswered] = useState("");
  const [correct, setCorrect] = useState("");
  const [adjust, setAdjust] = useState(elapsed > LONG_RUN);
  const [adjusted, setAdjusted] = useState(minutesToInput(Math.max(1, Math.floor(elapsed / 60))));
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!timer) return null;
  const tooShort = elapsed < 60;
  const showQuestions =
    timer.study_type === "questions" || timer.study_type === "mock_exam" || answered !== "";

  const save = () => {
    setError(null);
    let durationSeconds: number | null = null;
    if (adjust) {
      const m = parseDurationInput(adjusted);
      if (m === null || m < 1) return setError("Duração inválida. Use 1:30, 90 ou 1h30.");
      if (m * 60 > elapsed)
        return setError(`A duração não pode passar do tempo cronometrado (${formatDuration(elapsed)}).`);
      durationSeconds = m * 60;
    }
    const qa = toCount(answered);
    const qc = toCount(correct);
    if (Number.isNaN(qa) || Number.isNaN(qc)) return setError("Use números inteiros nas questões.");
    if (qc !== null && (qa === null || qc > qa))
      return setError("Acertos não podem passar do total de questões.");

    startTransition(async () => {
      const res = await finishTimerAction({
        topic,
        notes,
        questionsAnswered: qa,
        questionsCorrect: qc,
        durationSeconds,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      const subjectId = timer?.subject_id;
      toast.success(
        "Sessão salva",
        topic.trim() && subjectId
          ? {
              action: {
                label: "Agendar revisão",
                onClick: () => openReview({ subjectId, topic: topic.trim() }),
              },
            }
          : undefined,
      );
      sync(null, res.serverNow);
      onDone();
    });
  };

  const discard = () =>
    startTransition(async () => {
      const res = await discardTimerAction();
      if (!res.ok) return setError(res.message);
      toast("Cronômetro descartado");
      sync(null, res.serverNow);
      onDone();
    });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!tooShort) save();
      }}
    >
      <DialogBody className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[14px] font-medium text-fg">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: subject?.color }}
                aria-hidden
              />
              <span className="truncate">{subject?.name ?? "Matéria"}</span>
            </p>
            <p className="mt-0.5 text-[12.5px] text-fg-3">
              {studyTypeLabel(timer.study_type)}
              {timer.status === "paused" ? ", pausado" : ""}
            </p>
          </div>
          <span className="font-mono text-[22px] font-medium tracking-tight text-fg tabular-nums">
            {clock(elapsed)}
          </span>
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {tooShort && (
          <Notice tone="warning">
            Sessões precisam ter ao menos 1 minuto. Continue estudando ou descarte.
          </Notice>
        )}
        {!tooShort && elapsed > LONG_RUN && (
          <Notice tone="warning">
            O cronômetro está ligado há {formatDuration(elapsed)}. Se esqueceu de parar, ajuste a duração
            abaixo.
          </Notice>
        )}

        <Field label="Assunto">
          {(p) => (
            <Input
              {...p}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="O que você estudou?"
              maxLength={200}
              autoComplete="off"
            />
          )}
        </Field>

        {showQuestions && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Questões resolvidas">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={answered}
                  onChange={(e) => setAnswered(e.target.value)}
                />
              )}
            </Field>
            <Field label="Acertos">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={correct}
                  onChange={(e) => setCorrect(e.target.value)}
                />
              )}
            </Field>
          </div>
        )}

        <Field label="Observações">
          {(p) => (
            <Textarea
              {...p}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={5000}
              placeholder="Opcional"
            />
          )}
        </Field>

        <div className="flex flex-col gap-2">
          <label className="flex w-fit cursor-pointer items-center gap-2 text-[13px] text-fg-2 select-none">
            <input
              type="checkbox"
              checked={adjust}
              onChange={(e) => setAdjust(e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Ajustar duração (esqueci de parar)
          </label>
          {adjust && (
            <Field
              label="Duração a salvar"
              hint={`Até ${formatDuration(elapsed)}.`}
              className="max-w-[200px]"
            >
              {(p) => (
                <Input
                  {...p}
                  value={adjusted}
                  onChange={(e) => setAdjusted(e.target.value)}
                  inputMode="numeric"
                  className="tabular-nums"
                />
              )}
            </Field>
          )}
        </div>
      </DialogBody>
      <DialogFooter className="sm:justify-between">
        <Button
          type="button"
          variant={confirmDiscard ? "danger" : "ghost"}
          disabled={pending}
          onClick={() => (confirmDiscard ? discard() : setConfirmDiscard(true))}
          className={confirmDiscard ? "" : "text-fg-3"}
        >
          {confirmDiscard ? "Confirmar descarte" : "Descartar"}
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Continuar estudando
            </Button>
          </DialogClose>
          <Button type="submit" variant="primary" loading={pending} disabled={tooShort}>
            Salvar sessão
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
