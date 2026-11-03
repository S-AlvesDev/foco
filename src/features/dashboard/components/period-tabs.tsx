"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { DASHBOARD_PERIODS, type DashboardPeriod } from "../aggregate";

/** Troca o período pela URL (?periodo=), sem rolar a página. */
export function PeriodTabs({ value, param = "periodo" }: { value: DashboardPeriod; param?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  return (
    <Segmented<DashboardPeriod>
      label="Período"
      value={value}
      className={cn("transition-opacity", pending && "opacity-60")}
      onChange={(v) => {
        const next = new URLSearchParams(params.toString());
        if (v === "30") next.delete(param);
        else next.set(param, v);
        startTransition(() => router.replace(`?${next.toString()}`, { scroll: false }));
      }}
      options={DASHBOARD_PERIODS.map((p) => ({ value: p.value, label: p.label }))}
    />
  );
}
