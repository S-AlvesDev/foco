"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { minutesToInput, parseDurationInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GroupLabel } from "@/features/sessions/components/pickers";
import type { StudySubject } from "@/features/timer/types";
import { saveGoalAction } from "../actions";
import { METRIC_LABEL, goalTitle, type Goal, type GoalMetric, type GoalPeriod } from "../progress";

export function GoalDialog({
  open,
  onOpenChange,
  subjects,
  goal,
  defaultSubjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: StudySubject[];
  goal?: Goal;
  defaultSubjectId?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={goal ? "Editar meta" : "Nova meta"}
        description={goal ? undefined : "O progresso é calculado sozinho a partir das suas sessões."}
      >
        {open && (
          <GoalForm
            subjects={subjects}
            goal={goal}
            defaultSubjectId={defaultSubjectId ?? null}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const chip =
  "inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-[13px] transition-colors duration-150 select-none";
const on = "border-accent bg-accent-subtle text-fg";
const off = "border-border bg-surface-2 text-fg-2 hover:border-border-strong hover:text-fg";

const DEFAULT_TARGET: Record<GoalMetric, Record<GoalPeriod, string>> = {
  minutes: { daily: "2:00", weekly: "12:00", monthly: "50:00" },
  sessions: { daily: "3", weekly: "15", monthly: "60" },
  questions: { daily: "30", weekly: "150", monthly: "600" },
};

function GoalForm({
  subjects,
  goal,
  defaultSubjectId,
  onDone,
}: {
  subjects: StudySubject[];
  goal?: Goal;
  defaultSubjectId: string | null;
  onDone: () => void;
}) {
  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? "daily");
  const [metric, setMetric] = useState<GoalMetric>(goal?.metric ?? "minutes");
  const [subjectId, setSubjectId] = useState<string | null>(goal ? goal.subject_id : defaultSubjectId);
  const [target, setTarget] = useState(
    goal ? (goal.metric === "minutes" ? minutesToInput(goal.target) : String(goal.target)) : "",
  );
  const [error, setError] = useState<{ message: string; field?: "target" } | null>(null);
  const [pending, startTransition] = useTransition();
  const placeholder = DEFAULT_TARGET[metric][period];

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await saveGoalAction({
        id: goal?.id,
        subjectId,
        period,
        metric,
        target: target || placeholder,
      });
      if (!res.ok) return setError({ message: res.message, field: res.field });
      toast.success(goal ? "Meta atualizada" : "Meta criada");
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
          <GroupLabel id="goal-period">Período</GroupLabel>
          <Segmented<GoalPeriod>
            label="Período"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "daily", label: "Diária" },
              { value: "weekly", label: "Semanal" },
              { value: "monthly", label: "Mensal" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <GroupLabel id="goal-metric">O que medir</GroupLabel>
          <div role="radiogroup" aria-labelledby="goal-metric" className="flex flex-wrap gap-1.5">
            {(Object.keys(METRIC_LABEL) as GoalMetric[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={metric === m}
                onClick={() => {
                  setMetric(m);
                  setTarget("");
                }}
                className={cn(chip, metric === m ? on : off)}
              >
                {METRIC_LABEL[m]}
              </button>
            ))}
          </div>
          {metric === "questions" && (
            <p className="text-[12.5px] text-fg-3">
              Conta as questões informadas ao registrar ou finalizar sessões.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <GroupLabel id="goal-subject">Matéria</GroupLabel>
          <div role="radiogroup" aria-labelledby="goal-subject" className="flex flex-wrap gap-1.5">
            <button
              type="button"
              role="radio"
              aria-checked={subjectId === null}
              onClick={() => setSubjectId(null)}
              className={cn(chip, subjectId === null ? on : off)}
            >
              Todas as matérias
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={subjectId === s.id}
                onClick={() => setSubjectId(s.id)}
                className={cn(chip, subjectId === s.id ? on : off)}
              >
                <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <Field
          label={metric === "minutes" ? "Tempo" : metric === "sessions" ? "Sessões" : "Questões"}
          error={error?.field === "target" ? error.message : undefined}
          hint={metric === "minutes" ? "Ex.: 2:00, 90 ou 1h30." : undefined}
          className="max-w-[220px]"
        >
          {(p) => (
            <Input
              {...p}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={placeholder}
              inputMode="numeric"
              autoComplete="off"
              className="tabular-nums"
            />
          )}
        </Field>

        <p className="text-[13px] text-fg-2">
          Resumo:{" "}
          <span className="font-medium text-fg">
            {previewTitle(metric, target || placeholder)}{" "}
            {period === "daily" ? "por dia" : period === "weekly" ? "por semana" : "por mês"}
            {subjectId ? ` em ${subjects.find((s) => s.id === subjectId)?.name ?? "uma matéria"}` : ""}
          </span>
        </p>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          {goal ? "Salvar meta" : "Criar meta"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function previewTitle(metric: GoalMetric, raw: string) {
  if (metric === "minutes") {
    const minutes = parseDurationInput(raw);
    return minutes ? goalTitle({ metric, target: minutes }) : "Estudar";
  }
  const n = Number(raw);
  if (Number.isInteger(n) && n > 0) return goalTitle({ metric, target: n });
  return metric === "sessions" ? "Fazer sessões" : "Resolver questões";
}
