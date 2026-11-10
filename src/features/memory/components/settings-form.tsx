"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/ui/submit-button";
import { selectChevron, selectClass } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { saveMemorySettingsAction } from "../actions";

const TARGETS = [
  { value: "0.8", label: "80% · menos revisões (longe da prova)" },
  { value: "0.85", label: "85% · equilíbrio (recomendado)" },
  { value: "0.9", label: "90% · mais revisões (perto da prova)" },
];

export function MemorySettingsForm({
  target,
  dailyMinutes,
  examDate,
  minDate,
}: {
  target: number;
  dailyMinutes: number;
  examDate: string | null;
  minDate: string;
}) {
  const [state, action] = useActionState(saveMemorySettingsAction, null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);
  const nearest = TARGETS.reduce((a, b) =>
    Math.abs(Number(b.value) - target) < Math.abs(Number(a.value) - target) ? b : a,
  );
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-fg">Meta de retenção</span>
        <select
          name="targetRetention"
          defaultValue={nearest.value}
          className={cn(selectClass, "h-10 w-full text-[15px] sm:text-[14px]")}
          style={{ backgroundImage: selectChevron }}
        >
          {TARGETS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <span className="text-[12px] leading-snug text-fg-3">
          A chance de lembrar em que cada revisão é marcada. Nos últimos 45 dias antes da prova, sobe para
          90%.
        </span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-fg">Tempo de revisão por dia (minutos)</span>
        <input
          type="number"
          name="dailyMinutes"
          min={5}
          max={240}
          step={5}
          defaultValue={dailyMinutes}
          className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-[15px] text-fg focus:border-accent focus:outline-none"
        />
        <span className="text-[12px] leading-snug text-fg-3">
          A fila do dia para quando o tempo acaba; o resto fica para o dia seguinte, sem punição.
        </span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-fg">Data da prova (opcional)</span>
        <input
          type="date"
          name="examDate"
          min={minDate}
          defaultValue={examDate ?? ""}
          className="h-10 rounded-lg border border-border bg-surface-2 px-3 text-[15px] text-fg focus:border-accent focus:outline-none"
        />
        <span className="text-[12px] leading-snug text-fg-3">
          Com a data, nenhuma revisão passa da véspera e a reta final ganha meta maior.
        </span>
      </label>
      <div className="flex justify-end">
        <SubmitButton variant="primary">Salvar ajustes</SubmitButton>
      </div>
    </form>
  );
}
