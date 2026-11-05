"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudySubject } from "@/features/timer/types";
import type { GoalProgress } from "../progress";
import { GoalDialog } from "./goal-dialog";
import { GoalList } from "./goal-list";

export function GoalsView({ goals, subjects }: { goals: GoalProgress[]; subjects: StudySubject[] }) {
  const [creating, setCreating] = useState(false);
  const done = goals.filter((g) => g.done).length;
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
            Metas
          </h1>
          <p className="mt-1 text-[14px] text-fg-2 tabular-nums">
            {goals.length === 0
              ? "Defina quanto quer estudar por dia, semana ou mês."
              : `${done} de ${goals.length} cumprida${goals.length === 1 ? "" : "s"} no período atual.`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus />
          Nova meta
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong px-6 py-12 text-center">
          <p className="text-[14px] font-medium text-fg">Nenhuma meta ainda</p>
          <p className="mx-auto mt-1.5 max-w-[420px] text-[13.5px] leading-relaxed text-fg-2">
            Metas podem ser de horas, de sessões ou de questões resolvidas, para todas as matérias ou para uma
            só. O progresso é atualizado a cada sessão registrada.
          </p>
          <Button variant="secondary" className="mt-5" onClick={() => setCreating(true)}>
            <Plus />
            Criar a primeira meta
          </Button>
        </div>
      ) : (
        <GoalList goals={goals} subjects={subjects} grouped showCreate={false} />
      )}

      <GoalDialog open={creating} onOpenChange={setCreating} subjects={subjects} />
    </>
  );
}
