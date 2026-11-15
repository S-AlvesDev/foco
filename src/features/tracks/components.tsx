"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, CircleCheck, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { restartChallengeAction, setTrackMarkAction } from "./actions";
import type { CafeQuestion } from "@/features/cafe/days";

type Track = "cafe-com-lei" | "desafio-7-dias";

/** Botão de concluir (ou desfazer) uma dose ou tarefa. */
export function MarkButton({
  track,
  day,
  item = 0,
  done,
  label,
  doneLabel,
}: {
  track: Track;
  day: string;
  item?: number;
  done: boolean;
  label: string;
  doneLabel: string;
}) {
  const [pending, start] = useTransition();
  const [value, setValue] = useOptimistic(done);
  return (
    <Button
      variant={value ? "secondary" : "primary"}
      loading={pending}
      aria-pressed={value}
      onClick={() =>
        start(async () => {
          setValue(!value);
          const r = await setTrackMarkAction({ track, day, item, done: !value });
          if (!r.ok) toast.error(r.message);
        })
      }
    >
      {value ? <CircleCheck /> : <Check />}
      {value ? doneLabel : label}
    </Button>
  );
}

/** Caixa de seleção de uma tarefa do desafio. */
export function TaskCheck({
  day,
  item,
  done,
  disabled,
  label,
}: {
  day: string;
  item: number;
  done: boolean;
  disabled?: boolean;
  label: string;
}) {
  const [pending, start] = useTransition();
  const [value, setValue] = useOptimistic(done);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={value}
      aria-label={label}
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          setValue(!value);
          const r = await setTrackMarkAction({ track: "desafio-7-dias", day, item, done: !value });
          if (!r.ok) toast.error(r.message);
        })
      }
      className={cn(
        "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed",
        value
          ? "border-accent bg-accent text-accent-fg"
          : "border-border-strong bg-surface-2 hover:border-accent",
        disabled && !value && "opacity-50",
      )}
    >
      {value && <Check className="size-3.5" strokeWidth={3} />}
    </button>
  );
}

/** Itens de certo ou errado da dose, com correção na hora. */
export function CafeQuiz({ questions }: { questions: CafeQuestion[] }) {
  const [answers, setAnswers] = useState<(boolean | null)[]>(() => questions.map(() => null));
  const answered = answers.filter((a) => a !== null).length;
  const right = answers.filter((a, i) => a === questions[i].answer).length;
  return (
    <div className="flex flex-col gap-3">
      {questions.map((q, i) => {
        const a = answers[i];
        const ok = a !== null && a === q.answer;
        return (
          <div key={i} className="rounded-2xl border border-border bg-surface-1 p-4 sm:p-5">
            <p className="text-[14.5px] leading-relaxed text-fg">
              <span className="mr-2 font-semibold text-fg-3 tabular-nums">{i + 1}.</span>
              {q.statement}
            </p>
            <div className="mt-3 flex gap-2" role="group" aria-label={`Item ${i + 1}: certo ou errado`}>
              {[true, false].map((v) => (
                <Button
                  key={String(v)}
                  size="sm"
                  variant={a === v ? (ok ? "primary" : "danger") : "secondary"}
                  disabled={a !== null}
                  onClick={() => setAnswers((prev) => prev.map((x, j) => (j === i ? v : x)))}
                >
                  {v ? "Certo" : "Errado"}
                </Button>
              ))}
            </div>
            {a !== null && (
              <p
                role="status"
                className={cn(
                  "mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-[13px] leading-relaxed",
                  ok ? "bg-success/10 text-fg" : "bg-danger-subtle text-fg",
                )}
              >
                {ok ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <X className="mt-0.5 size-4 shrink-0 text-danger" />
                )}
                <span>
                  <strong>{ok ? "Acertou." : `Gabarito: ${q.answer ? "Certo" : "Errado"}.`}</strong>{" "}
                  {q.explain}
                </span>
              </p>
            )}
          </div>
        );
      })}
      {answered === questions.length && (
        <p className="text-[13.5px] text-fg-2" role="status">
          Você acertou <strong className="text-fg">{right}</strong> de {questions.length}.
          {right < questions.length && " Releia os pontos dos itens que errou antes de concluir a dose."}
        </p>
      )}
    </div>
  );
}

/** Recomeçar o desafio, com confirmação em dois toques. */
export function RestartChallenge() {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Button
      variant={confirm ? "danger" : "ghost"}
      size="sm"
      loading={pending}
      onBlur={() => setConfirm(false)}
      onClick={() => {
        if (!confirm) return setConfirm(true);
        start(async () => {
          const r = await restartChallengeAction();
          setConfirm(false);
          if (!r.ok) return void toast.error(r.message);
          toast.success("Desafio recomeçado", { description: "Comece de novo pelo dia 1." });
        });
      }}
    >
      <RotateCcw />
      {confirm ? "Confirmar: apagar o progresso" : "Recomeçar desafio"}
    </Button>
  );
}
