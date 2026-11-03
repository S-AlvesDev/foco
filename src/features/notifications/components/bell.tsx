"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

/** Sino com o número de não lidas. Atualiza quando chega um push com o app aberto. */
export function BellLink({ count, className }: { count: number; className?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => e.data?.type === "NOTIFICATION_RECEIVED" && router.refresh();
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return (
    <Link
      href="/notificacoes"
      aria-label={count ? `Notificações, ${count} não ${count === 1 ? "lida" : "lidas"}` : "Notificações"}
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-full text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      <Bell className="size-[20px]" strokeWidth={1.8} />
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[10.5px] leading-none font-semibold text-accent-fg ring-2 ring-bg tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
