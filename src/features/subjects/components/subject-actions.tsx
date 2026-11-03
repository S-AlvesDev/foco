"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import { setSubjectArchivedAction } from "../actions";
import { DeleteSubjectDialog } from "./delete-subject-dialog";
import { SubjectFormDialog, type EditableSubject } from "./subject-form-dialog";

export type ActionSubject = EditableSubject & { archived: boolean };

/** Menu "⋯" de uma matéria, com os diálogos de editar e excluir. */
export function SubjectActions({
  subject,
  redirectOnDelete,
  className,
  triggerLabel,
}: {
  subject: ActionSubject;
  redirectOnDelete?: string;
  className?: string;
  triggerLabel?: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [, startTransition] = useTransition();

  const toggleArchive = () =>
    startTransition(async () => {
      const res = await setSubjectArchivedAction(subject.id, !subject.archived);
      if (res.ok) toast.success(subject.archived ? "Matéria restaurada" : "Matéria arquivada");
      else toast.error(res.message);
    });

  return (
    <>
      <Menu>
        <MenuTrigger
          className={cn(
            "flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-3 transition-colors outline-none",
            "hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent data-[state=open]:bg-surface-2 data-[state=open]:text-fg",
            className,
          )}
          aria-label={triggerLabel ?? `Ações de ${subject.name}`}
        >
          <MoreHorizontal className="size-4" />
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Editar
          </MenuItem>
          <MenuItem onSelect={toggleArchive}>
            {subject.archived ? <ArchiveRestore /> : <Archive />}
            {subject.archived ? "Restaurar" : "Arquivar"}
          </MenuItem>
          <MenuSeparator />
          <MenuItem destructive onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Excluir…
          </MenuItem>
        </MenuContent>
      </Menu>

      <SubjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        subject={subject}
        defaultColor={subject.color}
      />
      <DeleteSubjectDialog
        subject={{ id: subject.id, name: subject.name, archived: subject.archived }}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectTo={redirectOnDelete}
      />
    </>
  );
}
