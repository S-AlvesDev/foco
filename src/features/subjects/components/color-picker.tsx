"use client";

import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUBJECT_COLORS } from "../colors";

/** Cores da paleta como radio group + uma cor livre pelo seletor nativo. */
export function ColorPicker({
  value,
  onChange,
  name,
  labelledBy,
}: {
  value: string;
  onChange: (color: string) => void;
  name: string;
  labelledBy: string;
}) {
  const upper = value.toUpperCase();
  const isCustom = !SUBJECT_COLORS.some((c) => c.value === upper);

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-wrap gap-1.5">
      <input type="hidden" name={name} value={upper} />
      {SUBJECT_COLORS.map((c) => {
        const selected = c.value === upper;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(c.value)}
            className={cn(
              "relative flex size-[26px] cursor-pointer items-center justify-center rounded-[7px] transition-transform duration-150 active:scale-90",
              selected && "ring-2 ring-fg ring-offset-2 ring-offset-surface-1",
            )}
            style={{ background: c.value }}
          >
            {selected && <Check className="size-3.5 text-white" strokeWidth={3} />}
          </button>
        );
      })}
      <label
        title="Outra cor"
        className={cn(
          "relative flex size-[26px] cursor-pointer items-center justify-center rounded-[7px] border border-dashed border-border-strong text-fg-3 transition-colors hover:text-fg-2",
          isCustom && "border-solid ring-2 ring-fg ring-offset-2 ring-offset-surface-1",
        )}
        style={isCustom ? { background: upper, borderColor: "transparent" } : undefined}
      >
        <input
          type="color"
          value={upper.toLowerCase()}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Outra cor"
        />
        {isCustom ? <Check className="size-3.5 text-white" strokeWidth={3} /> : <Plus className="size-3.5" />}
      </label>
    </div>
  );
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ background: color }}
    />
  );
}
