"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, MoreHorizontal, NotebookPen, Pencil, RotateCcw, SkipForward, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { plural, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StudySubject } from "@/features/timer/types";
import { completeReviewAction, deleteReviewAction, reopenReviewAction } from "../actions";
import { dueLabel, reviewGroup, type Review } from "../schedule";
import { CompleteReviewDialog, ReviewDialog } from "./review-dialog";

type SubjectInfo = StudySubject & { archived?: boolean };

/** Lista de revisões com concluir, editar, pular, desfazer e excluir. */
export function ReviewList({
  reviews,
  subjects,
  activeSubjects,
  todayISO,
  compact = false,
}: {
  reviews: Review[];
  /** Todas as matérias (inclui arquivadas, para mostrar o nome). */
  subjects: SubjectInfo[];
  /** Matérias que podem ser escolhidas ao editar. */
  activeSubjects: StudySubject[];
  todayISO: string;
  compact?: boolean;
}) {
  const bySubject = new Map(subjects.map((s) => [s.id, s]));
  const [completing, setCompleting] = useState<Review | null>(null);
  const [editing, setEditing] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);

  return (
    <>
      <ul className="divide-y divide-border">
        {reviews.map((r) => (
          <ReviewRow
            key={r.id}
            review={r}
            subject={bySubject.get(r.subject_id)}
            todayISO={todayISO}
            compact={compact}
            onComplete={() => setCompleting(r)}
            onEdit={() => setEditing(r)}
            onDelete={() => setDeleting(r)}
          />
        ))}
      </ul>
      <CompleteReviewDialog
        review={completing}
        onOpenChange={(o) => !o && setCompleting(null)}
        subjectName={completing ? bySubject.get(completing.subject_id)?.name : undefined}
        todayISO={todayISO}
      />
      <ReviewDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        subjects={
          editing &&
          !activeSubjects.some((s) => s.id === editing.subject_id) &&
          bySubject.get(editing.subject_id)
            ? [...activeSubjects, bySubject.get(editing.subject_id)!]
            : activeSubjects
        }
        todayISO={todayISO}
        review={editing ?? undefined}
      />
      <DeleteDialog review={deleting} onOpenChange={(o) => !o && setDeleting(null)} />
    </>
  );
}

function ReviewRow({
  review: r,
  subject,
  todayISO,
  compact,
  onComplete,
  onEdit,
  onDelete,
}: {
  review: Review;
  subject?: SubjectInfo;
  todayISO: string;
  compact: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const done = r.status !== "pending";
  const overdue = !done && reviewGroup(r.due_date, todayISO) === "overdue";

  const skip = () =>
    startTransition(async () => {
      const res = await completeReviewAction({ id: r.id, nextDue: null, skip: true });
      if (!res.ok) return void toast.error(res.message);
      toast.success("Revisão pulada", {
        action: { label: "Desfazer", onClick: () => void reopenReviewAction(r.id) },
      });
    });
  const reopen = () =>
    startTransition(async () => {
      const res = await reopenReviewAction(r.id);
      if (!res.ok) return void toast.error(res.message);
      toast.success("Revisão voltou para pendentes");
    });

  return (
    <li className={cn("flex items-start gap-3 py-3", pending && "opacity-60")}>
      {done ? (
        <span
          className={cn(
            "mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full",
            r.status === "done" ? "bg-success/15 text-success" : "bg-surface-3 text-fg-3",
          )}
          aria-hidden
        >
          {r.status === "done" ? (
            <Check className="size-3.5" strokeWidth={2.5} />
          ) : (
            <SkipForward className="size-3" />
          )}
        </span>
      ) : (
        <button
          type="button"
          onClick={onComplete}
          aria-label={`Concluir revisão de ${r.topic}`}
          className="group mt-0.5 flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border-strong text-transparent transition-colors hover:border-success hover:text-success"
        >
          <Check className="size-3.5" strokeWidth={2.5} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("text-[14px] leading-snug", done ? "text-fg-2" : "text-fg")}>{r.topic}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-fg-3">
          {subject && (
            <span className="inline-flex items-center gap-1.5 text-fg-2">
              <span className="size-2 rounded-full" style={{ background: subject.color }} aria-hidden />
              {subject.name}
            </span>
          )}
          {done ? (
            <span>
              {r.status === "done" ? "Concluída" : "Pulada"} em{" "}
              {r.completed_at ? shortDate(r.completed_at.slice(0, 10), todayISO) : "—"}
            </span>
          ) : (
            <span className={cn(overdue && "font-medium text-danger")}>{dueLabel(r.due_date, todayISO)}</span>
          )}
          {!compact && r.interval_days && !done && (
            <span>intervalo de {plural(r.interval_days, "dia", "dias")}</span>
          )}
          {!compact && r.note_id && (
            <Link
              href={`/anotacoes/${r.note_id}`}
              className="inline-flex items-center gap-1 text-fg-2 underline-offset-[3px] hover:text-fg hover:underline"
            >
              <NotebookPen className="size-3" />
              Anotação
            </Link>
          )}
        </p>
        {!compact && done && r.comment && (
          <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line text-fg-2">{r.comment}</p>
        )}
      </div>
      <Menu>
        <MenuTrigger
          aria-label={`Ações da revisão ${r.topic}`}
          className="-mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-3 outline-none transition-colors hover:bg-surface-2 hover:text-fg data-[state=open]:bg-surface-2"
        >
          <MoreHorizontal className="size-4" />
        </MenuTrigger>
        <MenuContent align="end">
          {done ? (
            <MenuItem onSelect={reopen}>
              <RotateCcw />
              Voltar para pendentes
            </MenuItem>
          ) : (
            <>
              <MenuItem onSelect={onComplete}>
                <Check />
                Concluir…
              </MenuItem>
              <MenuItem onSelect={onEdit}>
                <Pencil />
                Editar ou reagendar…
              </MenuItem>
              <MenuItem onSelect={skip}>
                <SkipForward />
                Pular
              </MenuItem>
            </>
          )}
          <MenuSeparator />
          <MenuItem destructive onSelect={onDelete}>
            <Trash2 />
            Excluir
          </MenuItem>
        </MenuContent>
      </Menu>
    </li>
  );
}

function DeleteDialog({
  review,
  onOpenChange,
}: {
  review: Review | null;
  onOpenChange: (o: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={review !== null} onOpenChange={onOpenChange}>
      <DialogContent title="Excluir revisão?">
        <DialogBody>
          <p className="text-[13.5px] leading-relaxed text-fg-2">
            <span className="font-medium text-fg">{review?.topic}</span> sai da lista e do histórico.
          </p>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              review &&
              startTransition(async () => {
                const res = await deleteReviewAction(review.id);
                if (!res.ok) return void toast.error(res.message);
                toast.success("Revisão excluída");
                onOpenChange(false);
              })
            }
          >
            Excluir revisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
