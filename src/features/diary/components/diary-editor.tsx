"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { saveDiaryAction } from "../actions";

type Fields = { studied: string; learned: string; difficulties: string };

const FIELDS: { key: keyof Fields; label: string; placeholder: string }[] = [
  { key: "studied", label: "O que estudei", placeholder: "Matérias, assuntos, materiais usados…" },
  { key: "learned", label: "O que aprendi", placeholder: "O ponto principal, com suas palavras." },
  {
    key: "difficulties",
    label: "Dificuldades",
    placeholder: "Onde travou, o que precisa revisar, dúvidas para levar adiante.",
  },
];

export function DiaryEditor({ date, initial }: { date: string; initial: Fields }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const latest = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    setStatus("saving");
    const res = await saveDiaryAction({ date, ...latest.current });
    if (res.ok) setStatus(dirty.current ? "saving" : "saved");
    else {
      dirty.current = true;
      setStatus("error");
      toast.error(res.message);
    }
  }, [date]);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && void save();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      void save();
    };
  }, [save]);

  const change = (key: keyof Fields, v: string) => {
    const next = { ...latest.current, [key]: v };
    latest.current = next;
    setValues(next);
    dirty.current = true;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 800);
  };

  return (
    <div className="flex flex-col gap-6">
      {FIELDS.map((f) => (
        <div key={f.key} className="flex flex-col gap-2">
          <label htmlFor={`diary-${f.key}`} className="text-[13.5px] font-semibold text-fg">
            {f.label}
          </label>
          <textarea
            id={`diary-${f.key}`}
            value={values[f.key]}
            onChange={(e) => change(f.key, e.target.value)}
            placeholder={f.placeholder}
            maxLength={10000}
            rows={4}
            className="field-sizing-content min-h-[104px] w-full resize-none rounded-lg border border-border bg-surface-1 px-3.5 py-3 text-[14.5px] leading-relaxed text-fg placeholder:text-fg-3 hover:border-border-strong focus:border-accent focus:outline-none"
          />
        </div>
      ))}
      <p className="flex items-center gap-1.5 text-[12.5px] text-fg-3" aria-live="polite">
        {status === "saving" ? (
          <>
            <Spinner className="size-3" /> Salvando
          </>
        ) : status === "error" ? (
          <span className="text-danger">Não salvou. Tente editar de novo.</span>
        ) : (
          <>
            <Check className="size-3.5" /> Salvo automaticamente
          </>
        )}
      </p>
    </div>
  );
}

export function DiaryDatePicker({ date, max }: { date: string; max: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      aria-label="Escolher data"
      value={date}
      max={max}
      onChange={(e) => e.target.value && router.push(`/diario?data=${e.target.value}`, { scroll: false })}
      className="h-8 rounded-md border border-border bg-surface-2 px-2 text-[13px] text-fg focus:border-accent focus:outline-none"
    />
  );
}
