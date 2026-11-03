"use client";

import { cn } from "@/lib/utils";

/** Interruptor liga/desliga (role="switch"). */
export function Switch({
  checked,
  onChange,
  labelledBy,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelledBy?: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[24px] w-[42px] shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-accent bg-accent" : "border-border-strong bg-surface-3",
      )}
    >
      <span
        className={cn(
          "inline-block size-[18px] rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[19px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
