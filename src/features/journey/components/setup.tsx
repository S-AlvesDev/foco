"use client";

import { useState, useTransition } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import {
  createCoupleAction,
  joinCoupleAction,
  leaveCoupleAction,
  regenerateInviteAction,
  type JourneyResult,
} from "../actions";

type Err = Extract<JourneyResult, { ok: false }> | null;

/** Sem espaço ainda: criar um ou entrar com o código de outra pessoa. */
export function JourneySetup() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [createErr, setCreateErr] = useState<Err>(null);
  const [joinErr, setJoinErr] = useState<Err>(null);
  const [creating, startCreate] = useTransition();
  const [joining, startJoin] = useTransition();

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          startCreate(async () => {
            setCreateErr(null);
            const res = await createCoupleAction({ name });
            if (!res.ok) return setCreateErr(res);
            toast.success("Espaço criado. Agora envie o código para a outra pessoa.");
          });
        }}
        noValidate
      >
        <div>
          <h2 className="text-[14px] font-semibold text-fg">Criar um espaço</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-2">
            Você recebe um código para enviar à outra pessoa. Ele vale por 7 dias.
          </p>
        </div>
        {createErr && !createErr.field && <Notice tone="error">{createErr.message}</Notice>}
        <Field
          label="Nome do espaço (opcional)"
          error={createErr?.field === "name" ? createErr.message : undefined}
        >
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nossa Jornada"
              maxLength={60}
            />
          )}
        </Field>
        <Button type="submit" variant="primary" loading={creating} className="w-fit">
          Criar espaço
        </Button>
      </form>

      <form
        className="flex flex-col gap-4 border-t border-border pt-8 md:border-t-0 md:border-l md:pt-0 md:pl-10"
        onSubmit={(e) => {
          e.preventDefault();
          startJoin(async () => {
            setJoinErr(null);
            const res = await joinCoupleAction({ code });
            if (!res.ok) return setJoinErr(res);
            toast.success("Pronto, vocês estão conectados.");
          });
        }}
        noValidate
      >
        <div>
          <h2 className="text-[14px] font-semibold text-fg">Entrar com um código</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-2">
            Recebeu um código? Digite aqui para entrar no espaço da outra pessoa.
          </p>
        </div>
        <Field label="Código do convite" error={joinErr?.message}>
          {(p) => (
            <Input
              {...p}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex.: 3FA9C21B"
              maxLength={12}
              autoComplete="off"
              autoCapitalize="characters"
              className="font-medium tracking-[0.12em] uppercase"
            />
          )}
        </Field>
        <Button type="submit" variant="secondary" loading={joining} className="w-fit" disabled={!code.trim()}>
          Entrar no espaço
        </Button>
      </form>
    </div>
  );
}

/** Espaço criado, esperando a outra pessoa entrar. */
export function WaitingForPartner({
  code,
  expiresLabel,
}: {
  code: string | null;
  expiresLabel: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="max-w-[520px]">
      <h2 className="text-[14px] font-semibold text-fg">Esperando a outra pessoa</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-fg-2">
        Envie este código. Ela entra em Nossa Jornada, escolhe “Entrar com um código” e digita.
      </p>
      {code ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span
            className="rounded-lg border border-border bg-surface-1 px-4 py-2.5 text-[22px] font-semibold tracking-[0.18em] text-fg tabular-nums"
            aria-label={`Código do convite: ${code.split("").join(" ")}`}
          >
            {code}
          </span>
          <Button
            variant="secondary"
            onClick={() =>
              navigator.clipboard
                .writeText(code)
                .then(() => toast.success("Código copiado"))
                .catch(() => toast.error("Não foi possível copiar. Selecione e copie o código."))
            }
          >
            <Copy />
            Copiar código
          </Button>
        </div>
      ) : (
        <Notice tone="warning" className="mt-5">
          O código expirou. Gere um novo.
        </Notice>
      )}
      {expiresLabel && code && <p className="mt-2 text-[12.5px] text-fg-3">Vale até {expiresLabel}.</p>}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await regenerateInviteAction();
              if (!res.ok) return void toast.error(res.message);
              toast.success("Novo código gerado. O anterior deixou de valer.");
            })
          }
        >
          <RefreshCw />
          Gerar novo código
        </Button>
        <Button variant="ghost" onClick={() => setConfirm(true)}>
          Cancelar espaço
        </Button>
      </div>
      <LeaveDialog open={confirm} onOpenChange={setConfirm} alone />
    </div>
  );
}

export function LeaveDialog({
  open,
  onOpenChange,
  alone = false,
  partnerName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  alone?: boolean;
  partnerName?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={alone ? "Cancelar o espaço?" : "Sair de Nossa Jornada?"}>
        <DialogBody>
          <p className="text-[13.5px] leading-relaxed text-fg-2">
            {alone
              ? "O espaço e o código deixam de existir. Seus dados de estudo continuam com você."
              : `${partnerName ?? "A outra pessoa"} deixa de ver o que você compartilha, e suas conquistas voltam a ser privadas. Seus dados de estudo continuam com você.`}
          </p>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Voltar</Button>
          </DialogClose>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await leaveCoupleAction();
                if (!res.ok) return void toast.error(res.message);
                toast.success(alone ? "Espaço cancelado" : "Você saiu do espaço");
                onOpenChange(false);
              })
            }
          >
            {alone ? "Cancelar espaço" : "Sair do espaço"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
