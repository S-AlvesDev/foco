"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useStudy } from "@/features/timer/study-provider";

/** Atalhos do ícone do app (segurar o ícone no Android/desktop): abre a ação pedida. */
export function ShortcutAction() {
  const params = useSearchParams();
  const router = useRouter();
  const { ready, openStart, openManual, timer } = useStudy();
  const action = params.get("acao");

  useEffect(() => {
    if (!ready || !action) return;
    if (action === "cronometro" && !timer) openStart();
    if (action === "registrar") openManual();
    router.replace("/painel", { scroll: false });
  }, [ready, action, timer, openStart, openManual, router]);
  return null;
}
