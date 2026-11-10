"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveLibraryItemAction } from "../actions";

/** Exclui da biblioteca (arquiva) com confirmação em dois toques. Marcações e anotações ficam guardadas. */
export function AdminArchive({
  kind,
  id,
  label,
  redirectTo,
}: {
  kind: "discipline" | "chapter" | "topic";
  id: string;
  label: string;
  redirectTo?: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant={confirm ? "danger" : "ghost"}
      size="sm"
      loading={pending}
      onBlur={() => setConfirm(false)}
      onClick={() => {
        if (!confirm) return setConfirm(true);
        start(async () => {
          const r = await archiveLibraryItemAction(kind, id);
          if (!r.ok) return void toast.error(r.message);
          toast.success(`${label} excluído da biblioteca`, {
            description: "As marcações e anotações de vocês continuam guardadas.",
          });
          if (redirectTo) router.push(redirectTo);
        });
      }}
      className={confirm ? "" : "text-fg-3"}
    >
      <Trash2 />
      {confirm ? "Confirmar exclusão" : `Excluir ${label.toLowerCase()}`}
    </Button>
  );
}
