"use client";

import { useState, useTransition } from "react";
import { Crosshair, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { saveFocusAction } from "../actions";

/** Objetivo atual no topo do painel; toque para editar. */
export function FocusChip({ title }: { title: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex h-10 max-w-full cursor-pointer items-center gap-2.5 rounded-full border border-border bg-surface-1 pr-3.5 pl-3 text-[13.5px] transition-colors hover:border-border-strong hover:bg-surface-2"
        aria-label={title ? `Objetivo atual: ${title}. Editar` : "Definir objetivo atual"}
      >
        <Crosshair className="size-[18px] shrink-0 text-accent" strokeWidth={1.9} />
        {title ? (
          <span className="truncate font-medium text-fg">{title}</span>
        ) : (
          <span className="text-fg-2">Definir objetivo</span>
        )}
        <PencilLine className="size-3.5 shrink-0 text-fg-3 transition-colors group-hover:text-fg-2" />
      </button>
      <FocusDialog open={open} onOpenChange={setOpen} title={title} />
    </>
  );
}

function FocusDialog({
  open,
  onOpenChange,
  title,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string | null;
}) {
  const [value, setValue] = useState(title ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const save = (next: string) =>
    startTransition(async () => {
      setError(null);
      const res = await saveFocusAction(next);
      if (!res.ok) return setError(res.message);
      toast.success(next.trim() ? "Objetivo salvo" : "Objetivo removido");
      onOpenChange(false);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) {
          setValue(title ?? "");
          setError(null);
        }
      }}
    >
      <DialogContent
        title="Objetivo atual"
        description="O concurso ou a meta que guia seus estudos agora. Só você vê."
      >
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            save(value);
          }}
          noValidate
        >
          <DialogBody>
            <Field
              label="Objetivo"
              error={error ?? undefined}
              hint="Exemplos: Preparação PRF, PC-CE Inspetor, TAF em março."
            >
              {(p) => (
                <Input
                  {...p}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  maxLength={80}
                  placeholder="Preparação PRF"
                  autoComplete="off"
                />
              )}
            </Field>
          </DialogBody>
          <DialogFooter>
            {title && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-danger hover:text-danger"
                disabled={pending}
                onClick={() => save("")}
              >
                Remover
              </Button>
            )}
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={pending} disabled={!value.trim()}>
              Salvar objetivo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
