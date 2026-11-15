"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, CircleCheck, Clock, KeyRound, RotateCcw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cancelAccessRequestAction, requestAccessAction } from "../access-actions";
import type { ContestAccess } from "../access";

/** Lista de concursos com o pedido de acesso de cada um: pedir, acompanhar, cancelar, pedir de novo. */
export function AccessRequestList({ contests }: { contests: ContestAccess[] }) {
  if (!contests.length)
    return (
      <p className="text-[13.5px] text-fg-2">
        Ainda não há concursos na Biblioteca. Assim que a conta administradora importar as apostilas, eles
        aparecem aqui.
      </p>
    );
  return (
    <ul className="flex flex-col gap-3">
      {contests.map((c) => (
        <ContestRow key={c.id} contest={c} />
      ))}
    </ul>
  );
}

const STATUS = {
  none: null,
  pending: {
    label: "Aguardando aprovação",
    icon: Clock,
    cls: "border-warning/30 bg-warning/10 text-warning",
  },
  approved: {
    label: "Acesso liberado",
    icon: CircleCheck,
    cls: "border-success/30 bg-success/10 text-success",
  },
  denied: { label: "Não aprovado", icon: X, cls: "border-border-strong bg-surface-2 text-fg-2" },
} as const;

function ContestRow({ contest }: { contest: ContestAccess }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const st = STATUS[contest.status];
  const formId = `pedido-${contest.id}`;

  const send = () =>
    start(async () => {
      const r = await requestAccessAction(contest.id, msg);
      if (!r.ok) return void toast.error(r.message);
      toast.success("Pedido enviado", {
        description: "Você recebe um aviso assim que ele for respondido.",
      });
      setOpen(false);
      setMsg("");
    });

  const cancel = () =>
    start(async () => {
      const r = await cancelAccessRequestAction(contest.id);
      if (!r.ok) return void toast.error(r.message);
      toast.success("Pedido cancelado");
    });

  return (
    <li className="rounded-2xl border border-border bg-surface-1 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[19px] leading-tight font-semibold text-fg">{contest.name}</p>
          <p className="mt-1 text-[13px] text-fg-3">Apostilas da Biblioteca e plano de metas do concurso</p>
        </div>
        {st && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-medium",
              st.cls,
            )}
          >
            <st.icon className="size-3.5" aria-hidden />
            {st.label}
          </span>
        )}
        <div className="flex gap-2">
          {contest.status === "none" && !open && (
            <Button variant="primary" onClick={() => setOpen(true)} aria-controls={formId}>
              <KeyRound />
              Pedir acesso
            </Button>
          )}
          {contest.status === "denied" && !open && (
            <Button onClick={() => setOpen(true)} aria-controls={formId}>
              <RotateCcw />
              Pedir de novo
            </Button>
          )}
          {contest.status === "pending" && (
            <Button variant="ghost" onClick={cancel} loading={pending}>
              Cancelar pedido
            </Button>
          )}
          {contest.status === "approved" && (
            <Button asChild variant="secondary">
              <Link href={`/biblioteca?c=${encodeURIComponent(contest.id)}`}>
                Abrir apostilas
                <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </div>
      {contest.status === "pending" && contest.message && (
        <p className="mt-3 text-[13px] text-fg-2">
          <span className="text-fg-3">Sua mensagem: </span>
          {contest.message}
        </p>
      )}
      {open && (
        <form
          id={formId}
          className="mt-4 flex flex-col gap-3 border-t border-border pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Field label="Mensagem para a administradora (opcional)" hint={`${msg.length}/300`}>
            {(p) => (
              <Textarea
                {...p}
                value={msg}
                maxLength={300}
                rows={2}
                placeholder="Diga quem você é, para a administradora reconhecer o pedido."
                onChange={(e) => setMsg(e.target.value)}
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" loading={pending}>
              <Send />
              Enviar pedido
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Voltar
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}
