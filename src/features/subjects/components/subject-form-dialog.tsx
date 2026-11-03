"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { saveSubjectAction, type SubjectFormState } from "../actions";
import { ColorPicker } from "./color-picker";

export type EditableSubject = { id: string; name: string; color: string; description: string | null };

const idle: SubjectFormState = { status: "idle" };

export function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
  defaultColor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sem matéria = criar. */
  subject?: EditableSubject;
  defaultColor: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={subject ? "Editar matéria" : "Nova matéria"}
        description={subject ? undefined : "Você pode mudar nome, cor e descrição depois."}
      >
        {/* Remonta a cada abertura para começar limpo. */}
        {open && (
          <SubjectForm subject={subject} defaultColor={defaultColor} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubjectForm({
  subject,
  defaultColor,
  onDone,
}: {
  subject?: EditableSubject;
  defaultColor: string;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(saveSubjectAction, idle);
  const [color, setColor] = useState(subject?.color ?? defaultColor);
  const [descLength, setDescLength] = useState(subject?.description?.length ?? 0);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(subject ? "Matéria atualizada" : "Matéria criada");
      onDone();
    }
  }, [state, subject, onDone]);

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col" noValidate>
      {subject && <input type="hidden" name="id" value={subject.id} />}
      <DialogBody className="flex flex-col gap-5">
        {state.status === "error" && state.message && (
          <Notice tone="error" key={state.at}>
            {state.message}
          </Notice>
        )}
        <Field label="Nome" error={state.fieldErrors?.name}>
          {(p) => (
            <Input
              {...p}
              name="name"
              defaultValue={state.values?.name ?? subject?.name}
              placeholder="Ex.: Direito Constitucional"
              maxLength={80}
              autoComplete="off"
              autoFocus
              data-1p-ignore
            />
          )}
        </Field>

        <div className="flex flex-col gap-2">
          <p id="subject-color-label" className="text-[13px] font-medium text-fg-2">
            Cor
          </p>
          <ColorPicker name="color" value={color} onChange={setColor} labelledBy="subject-color-label" />
          {state.fieldErrors?.color && <p className="text-[12.5px] text-danger">{state.fieldErrors.color}</p>}
        </div>

        <Field
          label="Descrição"
          error={state.fieldErrors?.description}
          aside={<span className="text-[12px] text-fg-3 tabular-nums">{descLength}/500</span>}
          hint="Opcional. Edital, banca, livro de referência…"
        >
          {(p) => (
            <Textarea
              {...p}
              name="description"
              defaultValue={state.values?.description ?? subject?.description ?? ""}
              maxLength={500}
              rows={3}
              onChange={(e) => setDescLength(e.target.value.length)}
            />
          )}
        </Field>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton variant="primary">{subject ? "Salvar alterações" : "Criar matéria"}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
