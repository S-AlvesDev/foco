"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, UserMinus, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { decideAccessAction } from "../access-actions";

export type AdminRequestRow = {
  userId: string;
  name: string;
  email: string;
  contestId: string;
  contestName: string;
  status: "pending" | "approved" | "denied";
  message: string | null;
  when: string;
};

/** Um pedido de acesso, com as decisões da conta administradora. */
export function AccessRequestItem({ row }: { row: AdminRequestRow }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"approved" | "denied" | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const decide = (status: "approved" | "denied") => {
    setBusy(status);
    start(async () => {
      const r = await decideAccessAction({ userId: row.userId, contestId: row.contestId, status });
      setBusy(null);
      if (!r.ok) return void toast.error(r.message);
      toast.success(
        status === "approved"
          ? `${row.name} agora tem acesso a ${row.contestName}`
          : row.status === "approved"
            ? `Acesso de ${row.name} encerrado`
            : `Pedido de ${row.name} negado`,
        { description: "A pessoa recebe um aviso no app." },
      );
    });
  };

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-1 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar name={row.name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] leading-snug text-fg">
            <span className="font-semibold">{row.name}</span>
            <span className="text-fg-3"> · </span>
            <span className="font-medium text-accent">{row.contestName}</span>
          </p>
          <p className="truncate text-[12.5px] text-fg-3">
            {row.email} · {row.when}
          </p>
          {row.message && (
            <p className="mt-2 rounded-md bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-fg-2">
              “{row.message}”
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2 sm:justify-end">
        {row.status !== "approved" && (
          <Button
            variant="primary"
            onClick={() => decide("approved")}
            loading={busy === "approved"}
            disabled={pending}
          >
            <Check />
            Permitir
          </Button>
        )}
        {row.status === "pending" && (
          <Button
            variant="ghost"
            onClick={() => decide("denied")}
            loading={busy === "denied"}
            disabled={pending}
          >
            <X />
            Negar
          </Button>
        )}
        {row.status === "approved" && (
          <Button
            variant={confirmRevoke ? "danger" : "ghost"}
            onBlur={() => setConfirmRevoke(false)}
            onClick={() => (confirmRevoke ? decide("denied") : setConfirmRevoke(true))}
            loading={busy === "denied"}
            disabled={pending && busy !== "denied"}
          >
            <UserMinus />
            {confirmRevoke ? "Confirmar remoção" : "Remover acesso"}
          </Button>
        )}
      </div>
    </li>
  );
}
