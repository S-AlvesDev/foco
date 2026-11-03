"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputClass = cn(
  "h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-[14px] text-fg",
  "placeholder:text-fg-3 transition-[border-color,box-shadow,background-color] duration-150",
  "hover:border-border-strong",
  "focus:border-accent focus:bg-surface-1 focus:shadow-[0_0_0_3px_var(--accent-subtle)] focus:outline-none",
  "aria-invalid:border-danger aria-invalid:focus:shadow-[0_0_0_3px_var(--danger-subtle)]",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input type={visible ? "text" : "password"} className={cn(inputClass, "pr-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-9 cursor-pointer items-center justify-center rounded-r-md text-fg-3 transition-colors hover:text-fg-2"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

type FieldProps = {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  aside?: React.ReactNode;
  children: (props: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => React.ReactNode;
  className?: string;
};

/** Rótulo + controle + mensagem, com ids e aria ligados. */
export function Field({ label, error, hint, aside, children, className }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-fg-2">
          {label}
        </label>
        {aside}
      </div>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-[12.5px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] text-fg-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(inputClass, "h-auto min-h-[76px] resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
}
