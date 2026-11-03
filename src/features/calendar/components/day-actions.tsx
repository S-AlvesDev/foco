"use client";

import { PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudy } from "@/features/timer/study-provider";

export function RegisterOnDay({ date }: { date: string }) {
  const { openManual, ready, data } = useStudy();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => openManual({ date })}
      disabled={!ready || data?.subjects.length === 0}
    >
      <PencilLine />
      Registrar neste dia
    </Button>
  );
}
