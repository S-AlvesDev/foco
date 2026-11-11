"use client";

import { useState, useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPlanMarkAction } from "../actions";

/** Botão "Marcar como feito" / "Desfazer" para itens que concluem à mão. */
export function MarkButton({
  planId,
  meta,
  item,
  done,
  label,
  disabled,
}: {
  planId: string;
  meta: string;
  item: number;
  done: boolean;
  label: string;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        size="sm"
        variant={done ? "ghost" : "primary"}
        disabled={disabled || pending}
        loading={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await setPlanMarkAction({ planId, meta, item, done: !done });
            if (!r.ok) setError(r.message);
          })
        }
      >
        {done ? <RotateCcw /> : <Check />}
        {done ? "Desfazer" : label}
      </Button>
      {error && (
        <span role="alert" className="text-[12px] text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
