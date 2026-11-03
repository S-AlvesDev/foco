"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { DASHBOARD_PERIODS } from "../aggregate";

type Option = { value: string; label: string };

/** Troca o período pela URL (?periodo=), sem rolar a página. */
export function PeriodTabs({
  value,
  param = "periodo",
  options = DASHBOARD_PERIODS.map((p) => ({ value: p.value, label: p.label })),
  defaultValue = "30",
}: {
  value: string;
  param?: string;
  options?: readonly Option[];
  /** Valor que não precisa aparecer na URL. */
  defaultValue?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  return (
    <Segmented<string>
      label="Período"
      value={value}
      className={cn("transition-opacity", pending && "opacity-60")}
      onChange={(v) => {
        const next = new URLSearchParams(params.toString());
        if (v === defaultValue) next.delete(param);
        else next.set(param, v);
        startTransition(() => router.replace(`?${next.toString()}`, { scroll: false }));
      }}
      options={options.map((o) => ({ value: o.value, label: o.label }))}
    />
  );
}
