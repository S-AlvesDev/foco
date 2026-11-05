"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Layers, Pill, Shield } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { setAreaAction } from "../actions";
import { areaLabel } from "../model";

const ICONS: Record<string, typeof Shield> = { policial: Shield, farmacia: Pill };

const DESCRIPTIONS: Record<string, string> = {
  policial: "PRF, PF, Perícia Criminal e afins",
  farmacia: "Graduação e concursos para farmacêutico",
};

/** Primeira visita: a pessoa escolhe a própria área. Dá para trocar depois nos filtros. */
export function AreaChooser({ areas, total }: { areas: { value: string; n: number }[]; total: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [choice, setChoice] = useState<string | null>(null);

  const choose = (area: string) => {
    setChoice(area);
    start(async () => {
      const r = await setAreaAction(area);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      router.replace(`/questoes?area=${area}`, { scroll: false });
    });
  };

  const options = [
    ...areas.map((a) => ({ value: a.value, n: a.n, label: areaLabel(a.value), desc: DESCRIPTIONS[a.value] })),
    { value: "todas", n: total, label: "Todas as áreas", desc: "Misture as questões de todas as áreas" },
  ];

  return (
    <section aria-labelledby="area-title">
      <h2 id="area-title" className="text-[17px] font-semibold tracking-[-0.01em] text-fg">
        Qual é a sua área?
      </h2>
      <p className="mt-1 text-[13.5px] text-fg-2">
        Os filtros já abrem nela. Cada conta guarda a própria escolha, e dá para trocar quando quiser.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => {
          const Icon = o.value === "todas" ? Layers : (ICONS[o.value] ?? BookOpen);
          const busy = pending && choice === o.value;
          return (
            <button
              key={o.value}
              type="button"
              disabled={pending}
              onClick={() => choose(o.value)}
              className={cn(
                "group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-2xl border border-border bg-surface-1 p-5 text-left shadow-card",
                "transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-accent/60 disabled:cursor-wait",
              )}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-subtle text-accent">
                <Icon className="size-6" strokeWidth={1.8} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-fg">{o.label}</span>
                {o.desc && <span className="mt-0.5 block text-[13px] text-fg-2">{o.desc}</span>}
                <span className="mt-1.5 block text-[12.5px] font-medium text-fg-3 tabular-nums">
                  {o.n.toLocaleString("pt-BR")} {o.n === 1 ? "questão" : "questões"}
                </span>
              </span>
              {busy ? (
                <Spinner />
              ) : (
                <ArrowRight
                  className="size-4 shrink-0 text-fg-3 transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
