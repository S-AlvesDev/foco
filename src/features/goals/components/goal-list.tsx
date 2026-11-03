"use client";

import { useState, useTransition } from "react";
import { Check, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import type { StudySubject } from "@/features/timer/types";
import { deleteGoalAction } from "../actions";
import { PERIOD_WINDOW_LABEL, goalAmount, goalTitle, type GoalPeriod, type GoalProgress } from "../progress";
import { GoalDialog } from "./goal-dialog";

/** Barra fina de progresso; verde quando a meta é cumprida. */
export function GoalBar({ ratio, done }: { ratio: number; done: boolean }) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out-soft",
          done ? "bg-success" : "bg-accent",
        )}
        style={{ width: `${Math.max(Math.min(ratio, 1) * 100, ratio > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}

function GoalRow({
  goal,
  subject,
  onEdit,
  editable,
  showWindow,
}: {
  goal: GoalProgress;
  subject?: StudySubject;
  onEdit: () => void;
  editable: boolean;
  showWindow?: boolean;
}) {
  const [, startTransition] = useTransition();
  const remove = () =>
    startTransition(async () => {
      const res = await deleteGoalAction(goal.id);
      if (res.ok) toast.success("Meta excluída");
      else toast.error(res.message);
    });
  const pct = Math.round(goal.ratio * 100);
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[14px] text-fg">
            {goalTitle(goal)}
            {goal.done && (
              <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-success">
                <Check className="size-3.5" strokeWidth={2.5} />
                Cumprida
              </span>
            )}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-fg-3">
            {showWindow && <span>{PERIOD_WINDOW_LABEL[goal.period]}</span>}
            <span className="inline-flex items-center gap-1.5">
              {subject && (
                <span className="size-2 rounded-full" style={{ background: subject.color }} aria-hidden />
              )}
              {subject ? subject.name : goal.subject_id ? "Matéria arquivada" : "Todas as matérias"}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-right text-[13px] text-fg-2 tabular-nums">
            {goalAmount(goal)}
            <span className="ml-2 inline-block w-10 text-fg-3">{pct}%</span>
          </span>
          {editable && (
            <Menu>
              <MenuTrigger
                className="flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-3 outline-none transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent data-[state=open]:bg-surface-2"
                aria-label={`Ações da meta ${goalTitle(goal)}`}
              >
                <MoreHorizontal className="size-4" />
              </MenuTrigger>
              <MenuContent align="end">
                <MenuItem onSelect={onEdit}>
                  <Pencil />
                  Editar
                </MenuItem>
                <MenuSeparator />
                <MenuItem destructive onSelect={remove}>
                  <Trash2 />
                  Excluir
                </MenuItem>
              </MenuContent>
            </Menu>
          )}
        </div>
      </div>
      <div className="mt-2">
        <GoalBar ratio={goal.ratio} done={goal.done} />
      </div>
    </li>
  );
}

/**
 * Lista de metas com progresso. Agrupa por janela (hoje, semana, mês) quando `grouped`.
 * Também usada no painel e na página da matéria, em versão compacta.
 */
export function GoalList({
  goals,
  subjects,
  grouped = false,
  editable = true,
  newSubjectId,
  emptyText,
  showCreate = true,
}: {
  goals: GoalProgress[];
  subjects: StudySubject[];
  grouped?: boolean;
  editable?: boolean;
  newSubjectId?: string | null;
  emptyText?: string;
  showCreate?: boolean;
}) {
  const [dialog, setDialog] = useState<{ goal?: GoalProgress } | null>(null);
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const periods: GoalPeriod[] = ["daily", "weekly", "monthly"];

  const rows = (list: GoalProgress[], showWindow: boolean) => (
    <ul className="divide-y divide-border">
      {list.map((g) => (
        <GoalRow
          key={g.id}
          goal={g}
          subject={g.subject_id ? byId.get(g.subject_id) : undefined}
          onEdit={() => setDialog({ goal: g })}
          editable={editable}
          showWindow={showWindow}
        />
      ))}
    </ul>
  );

  return (
    <>
      {goals.length === 0 ? (
        <p className="text-[13.5px] leading-relaxed text-fg-2">{emptyText ?? "Nenhuma meta definida."}</p>
      ) : grouped ? (
        <div className="flex flex-col gap-8">
          {periods.map((p) => {
            const list = goals.filter((g) => g.period === p);
            if (list.length === 0) return null;
            const done = list.filter((g) => g.done).length;
            return (
              <section key={p} aria-label={PERIOD_WINDOW_LABEL[p]}>
                <div className="flex items-baseline justify-between border-b border-border pb-2">
                  <h2 className="text-[13px] font-semibold text-fg">{PERIOD_WINDOW_LABEL[p]}</h2>
                  <span className="text-[12.5px] text-fg-3 tabular-nums">
                    {done} de {list.length} cumprida{list.length === 1 ? "" : "s"}
                  </span>
                </div>
                {rows(list, false)}
              </section>
            );
          })}
        </div>
      ) : (
        rows(goals, true)
      )}

      {editable && showCreate && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => setDialog({})}>
          <Plus />
          Nova meta
        </Button>
      )}

      <GoalDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        subjects={subjects}
        goal={dialog?.goal}
        defaultSubjectId={newSubjectId}
      />
    </>
  );
}
