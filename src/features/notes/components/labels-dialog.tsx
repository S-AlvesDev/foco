"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog";
import { SUBJECT_COLORS } from "@/features/subjects/colors";
import { cn } from "@/lib/utils";
import { createLabelAction, deleteLabelAction, updateLabelAction } from "../actions";
import type { Label } from "../queries";

/** Criar, renomear, trocar a cor e excluir categorias e etiquetas. */
export function LabelsDialog({
  open,
  onOpenChange,
  labels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: Label[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Categorias e etiquetas"
        description="Cada anotação tem uma categoria e quantas etiquetas quiser. Toque na cor para trocar."
      >
        <DialogBody className="flex flex-col gap-7 pb-6">
          <Group kind="category" title="Categorias" labels={labels.filter((l) => l.kind === "category")} />
          <Group kind="tag" title="Etiquetas" labels={labels.filter((l) => l.kind === "tag")} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function nextColor(current: string) {
  const i = SUBJECT_COLORS.findIndex((c) => c.value === current.toUpperCase());
  return SUBJECT_COLORS[(i + 1) % SUBJECT_COLORS.length].value;
}

function Group({ kind, title, labels }: { kind: "category" | "tag"; title: string; labels: Label[] }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const add = () => {
    const v = name.trim();
    if (!v) return;
    startTransition(async () => {
      const color = SUBJECT_COLORS[labels.length % SUBJECT_COLORS.length].value;
      const res = await createLabelAction({ name: v, color, kind });
      if (!res.ok) return void toast.error(res.message);
      setName("");
    });
  };

  return (
    <section aria-label={title}>
      <h3 className="mb-1 text-[13px] font-semibold text-fg">{title}</h3>
      {labels.length === 0 && (
        <p className="py-2 text-[13px] text-fg-3">
          {kind === "tag" ? "Etiquetas são livres: #crase, #cf88, #revisar-domingo…" : "Nenhuma categoria."}
        </p>
      )}
      <ul className="divide-y divide-border">
        {labels.map((l) => (
          <LabelRow key={l.id} label={l} />
        ))}
      </ul>
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder={kind === "category" ? "Nova categoria" : "Nova etiqueta"}
          aria-label={kind === "category" ? "Nova categoria" : "Nova etiqueta"}
          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-2.5 text-[13.5px] text-fg placeholder:text-fg-3 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!name.trim() || pending}
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2.5 text-[13px] text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg disabled:cursor-default disabled:opacity-40"
        >
          <Plus className="size-3.5" />
          Adicionar
        </button>
      </form>
    </section>
  );
}

function LabelRow({ label }: { label: Label }) {
  const [name, setName] = useState(label.name);
  const [confirm, setConfirm] = useState(false);
  const [, startTransition] = useTransition();
  const save = (patch: { name?: string; color?: string }) =>
    startTransition(async () => {
      const res = await updateLabelAction(label.id, patch);
      if (!res.ok) {
        toast.error(res.message);
        setName(label.name);
      }
    });
  return (
    <li className="flex items-center gap-2 py-1.5">
      <button
        type="button"
        aria-label={`Trocar cor de ${label.name}`}
        onClick={() => save({ color: nextColor(label.color) })}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-surface-2"
      >
        <span className="size-3 rounded-full" style={{ background: label.color }} />
      </button>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name.trim() !== label.name && save({ name: name.trim() })}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        maxLength={40}
        aria-label={`Nome de ${label.name}`}
        className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-[13.5px] text-fg hover:border-border focus:border-accent focus:bg-surface-2 focus:outline-none"
      />
      <button
        type="button"
        onClick={() =>
          confirm
            ? startTransition(async () => {
                const res = await deleteLabelAction(label.id);
                if (!res.ok) toast.error(res.message);
              })
            : setConfirm(true)
        }
        onBlur={() => setConfirm(false)}
        aria-label={confirm ? `Confirmar exclusão de ${label.name}` : `Excluir ${label.name}`}
        className={cn(
          "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-[12.5px] transition-colors",
          confirm ? "bg-danger-subtle text-danger" : "text-fg-3 hover:bg-surface-2 hover:text-fg",
        )}
      >
        <Trash2 className="size-3.5" />
        {confirm && "Excluir"}
      </button>
    </li>
  );
}
