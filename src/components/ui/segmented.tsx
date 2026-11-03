"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string | number> = { value: T; label: string; icon?: React.ReactNode };

/** Controle segmentado (radio group) com indicador que desliza entre as opções. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  label: string;
  className?: string;
}) {
  const id = useId();
  const move = (container: HTMLElement, dir: 1 | -1) => {
    const i = options.findIndex((o) => o.value === value);
    const n = (i + dir + options.length) % options.length;
    onChange(options[n].value);
    container.querySelectorAll<HTMLButtonElement>('[role="radio"]')[n]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex h-8 rounded-md border border-border bg-surface-2 p-0.5", className)}
      onKeyDown={(e) => {
        const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key] as 1 | -1 | undefined;
        if (!dir) return;
        e.preventDefault();
        move(e.currentTarget, dir);
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex cursor-pointer items-center gap-1.5 rounded-[5px] px-3 text-[13px] transition-colors duration-150",
              "[&_svg]:size-3.5",
              active ? "text-fg" : "text-fg-2 hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[5px] bg-surface-1 shadow-[0_1px_2px_rgb(0_0_0/0.12),0_0_0_1px_var(--border)] dark:bg-surface-3"
                transition={{ type: "spring", duration: 0.28, bounce: 0.12 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
