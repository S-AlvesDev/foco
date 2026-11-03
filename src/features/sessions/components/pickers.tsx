"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { STUDY_TYPES, type StudyType } from "@/lib/study-types";
import type { StudySubject } from "@/features/timer/types";

const chip =
  "inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-[13px] transition-colors duration-150 select-none";
const chipOff = "border-border bg-surface-2 text-fg-2 hover:border-border-strong hover:text-fg";
const chipOn = "border-accent bg-accent-subtle text-fg";

function useRovingKeys<T>(values: T[], value: T | undefined, onChange: (v: T) => void) {
  return (e: React.KeyboardEvent<HTMLDivElement>) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir || values.length === 0) return;
    e.preventDefault();
    const i = Math.max(0, values.indexOf(value as T));
    const n = (i + dir + values.length) % values.length;
    onChange(values[n]);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[n]?.focus();
  };
}

/** Matérias como chips de um toque (radio group). */
export function SubjectChips({
  subjects,
  value,
  onChange,
  labelledBy,
  name,
}: {
  subjects: StudySubject[];
  value: string | undefined;
  onChange: (id: string) => void;
  labelledBy: string;
  name?: string;
}) {
  const onKeyDown = useRovingKeys(
    subjects.map((s) => s.id),
    value,
    onChange,
  );
  if (subjects.length === 0) {
    return (
      <p className="text-[13px] text-fg-2">
        Você ainda não tem matérias ativas.{" "}
        <Link href="/materias" className="font-medium text-fg underline underline-offset-[3px]">
          Cadastrar matérias
        </Link>
      </p>
    );
  }
  const selected = subjects.some((s) => s.id === value) ? value : undefined;
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-1.5"
      onKeyDown={onKeyDown}
    >
      {name && <input type="hidden" name={name} value={selected ?? ""} />}
      {subjects.map((s, i) => {
        const on = s.id === selected;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (!selected && i === 0) ? 0 : -1}
            onClick={() => onChange(s.id)}
            className={cn(chip, on ? chipOn : chipOff)}
          >
            <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="max-w-[200px] truncate">{s.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function StudyTypeChips({
  value,
  onChange,
  labelledBy,
  name,
}: {
  value: StudyType;
  onChange: (t: StudyType) => void;
  labelledBy: string;
  name?: string;
}) {
  const onKeyDown = useRovingKeys(
    STUDY_TYPES.map((t) => t.value),
    value,
    onChange,
  );
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-1.5"
      onKeyDown={onKeyDown}
    >
      {name && <input type="hidden" name={name} value={value} />}
      {STUDY_TYPES.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(chip, on ? chipOn : chipOff)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function GroupLabel({
  id,
  children,
  aside,
}: {
  id: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p id={id} className="text-[13px] font-medium text-fg-2">
        {children}
      </p>
      {aside}
    </div>
  );
}
