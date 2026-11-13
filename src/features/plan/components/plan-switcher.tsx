"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Segmented } from "@/components/ui/segmented";
import { setActivePlanAction } from "../actions";

/** Escolha do plano ativo: ele vira a "Missão do dia" do painel e a página do plano. */
export function PlanSwitcher({ plans, active }: { plans: { id: string; label: string }[]; active: string }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useOptimistic(active);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <Segmented
        label="Plano ativo"
        value={value}
        options={plans.map((p) => ({ value: p.id, label: p.label }))}
        onChange={(id) => {
          if (id === value) return;
          start(async () => {
            setError(null);
            setValue(id);
            const r = await setActivePlanAction(id);
            if (!r.ok) setError(r.message);
          });
        }}
        className={pending ? "opacity-70" : undefined}
      />
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
