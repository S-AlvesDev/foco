"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startMemoryAction } from "../actions";

/** Tópico concluído que ainda não está nas revisões (ex.: concluído antes do sistema). */
export function IncludeInReviews({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await startMemoryAction(topicId);
          if (!r.ok) return void toast.error(r.message);
          toast.success("Incluído. Primeira revisão amanhã.");
          router.refresh();
        })
      }
    >
      <CalendarPlus />
      Incluir nas revisões
    </Button>
  );
}
