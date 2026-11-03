"use client";

import Link from "next/link";
import { useTransition } from "react";
import { CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteNotificationAction, markReadAction } from "../actions";
import { KIND_META, type NotificationKind } from "../kinds";
import type { NotificationRow } from "../queries";

function when(iso: string, now: number) {
  const diff = Math.max(0, now - Date.parse(iso)) / 60000;
  if (diff < 1) return "agora";
  if (diff < 60) return `há ${Math.floor(diff)} min`;
  if (diff < 24 * 60) return `há ${Math.floor(diff / 60)} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
}

export function NotificationList({ items, now }: { items: NotificationRow[]; now: number }) {
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;
  const read = items.length - unread;
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, done?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.message ?? "Não foi possível concluir.");
      else if (done) toast.success(done);
    });

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface-1 p-6 text-[14px] leading-relaxed text-fg-2">
        Nenhuma notificação. Revisões do dia, lembretes e metas alcançadas aparecem aqui.
      </p>
    );
  }

  return (
    <div className={cn("transition-opacity", pending && "opacity-70")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-fg-3">
          {unread ? `${unread} não ${unread === 1 ? "lida" : "lidas"}` : "Tudo lido"}
        </p>
        <div className="flex gap-1">
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={() => run(() => markReadAction())}>
              <CheckCheck />
              Marcar todas como lidas
            </Button>
          )}
          {read > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => run(() => deleteNotificationAction("lidas"), "Lidas excluídas")}
            >
              <Trash2 />
              Excluir lidas
            </Button>
          )}
        </div>
      </div>
      <ul
        aria-label="Lista de notificações"
        className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-1"
      >
        {items.map((n) => {
          const meta = KIND_META[n.kind as NotificationKind] ?? KIND_META.system;
          const Icon = meta.icon;
          return (
            <li key={n.id} className={cn("relative flex gap-3 p-4", !n.read_at && "bg-accent-subtle/40")}>
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  n.read_at ? "bg-surface-2 text-fg-3" : "bg-accent-subtle text-accent",
                )}
                aria-hidden
              >
                <Icon className="size-[18px]" strokeWidth={1.8} />
              </span>
              <Link
                href={`/notificacoes/abrir/${n.id}`}
                prefetch={false}
                className="min-w-0 flex-1 after:absolute after:inset-0"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className={cn("text-[14px]", n.read_at ? "text-fg-2" : "font-medium text-fg")}>
                    {!n.read_at && <span className="sr-only">Não lida: </span>}
                    {n.title}
                  </span>
                  <span className="shrink-0 text-[12px] text-fg-3">{when(n.created_at, now)}</span>
                </span>
                {n.body && (
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-fg-3">{n.body}</span>
                )}
                <span className="mt-1 block text-[11.5px] text-fg-3">{meta.label}</span>
              </Link>
              <div className="relative z-10 flex shrink-0 flex-col gap-1 self-center">
                {!n.read_at && (
                  <button
                    type="button"
                    aria-label={`Marcar "${n.title}" como lida`}
                    onClick={() => run(() => markReadAction(n.id))}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-fg-3 hover:bg-surface-2 hover:text-fg"
                  >
                    <CheckCheck className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Excluir "${n.title}"`}
                  onClick={() => run(() => deleteNotificationAction(n.id))}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-fg-3 hover:bg-surface-2 hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
