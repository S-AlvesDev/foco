"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatDuration, plural } from "@/lib/format";
import {
  deleteSubjectAction,
  getSubjectUsageAction,
  setSubjectArchivedAction,
  type SubjectUsage,
} from "../actions";

type Target = { id: string; name: string; archived: boolean };

export function DeleteSubjectDialog({
  subject,
  open,
  onOpenChange,
  redirectTo,
}: {
  subject: Target;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Para onde ir depois de excluir (ex.: saindo da página da matéria). */
  redirectTo?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Excluir ${subject.name}?`}>
        {open && <DeleteBody subject={subject} onDone={() => onOpenChange(false)} redirectTo={redirectTo} />}
      </DialogContent>
    </Dialog>
  );
}

function DeleteBody({
  subject,
  onDone,
  redirectTo,
}: {
  subject: Target;
  onDone: () => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [usage, setUsage] = useState<SubjectUsage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"delete" | "archive" | null>(null);

  useEffect(() => {
    let alive = true;
    getSubjectUsageAction(subject.id).then((res) => {
      if (!alive) return;
      if (res.ok) setUsage(res.usage);
      else setLoadError(res.message);
    });
    return () => {
      alive = false;
    };
  }, [subject.id]);

  const run = (kind: "delete" | "archive") => {
    setAction(kind);
    startTransition(async () => {
      const res =
        kind === "delete"
          ? await deleteSubjectAction(subject.id)
          : await setSubjectArchivedAction(subject.id, true);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(kind === "delete" ? "Matéria excluída" : "Matéria arquivada");
      onDone();
      if (redirectTo) router.push(redirectTo);
    });
  };

  const lost: string[] = [];
  if (usage) {
    if (usage.sessions)
      lost.push(`${plural(usage.sessions, "sessão", "sessões")} (${formatDuration(usage.seconds)})`);
    if (usage.reviews) lost.push(plural(usage.reviews, "revisão", "revisões"));
    if (usage.goals) lost.push(plural(usage.goals, "meta", "metas"));
  }
  const hasHistory = Boolean(usage && (usage.sessions || usage.reviews || usage.goals || usage.notes));

  return (
    <>
      <DialogBody>
        {!usage && !loadError && (
          <p className="flex items-center gap-2 text-[13.5px] text-fg-2">
            <Spinner className="size-3.5" /> Verificando o que está registrado…
          </p>
        )}
        {loadError && <p className="text-[13.5px] text-danger">{loadError}</p>}
        {usage && (
          <div className="flex flex-col gap-3 text-[13.5px] leading-relaxed text-fg-2">
            {lost.length > 0 ? (
              <p>
                Isso apaga de vez <span className="font-medium text-fg">{joinPt(lost)}</span> desta matéria.
                Não dá para desfazer.
              </p>
            ) : (
              <p>Nada foi registrado nesta matéria ainda. Ela será removida da lista.</p>
            )}
            {usage.notes > 0 && (
              <p>
                {usage.notes === 1
                  ? "1 anotação continua salva, sem matéria vinculada."
                  : `${usage.notes} anotações continuam salvas, sem matéria vinculada.`}
              </p>
            )}
            {hasHistory && !subject.archived && (
              <p>Para tirá-la da lista sem perder o histórico, arquive em vez de excluir.</p>
            )}
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={pending}>
            Cancelar
          </Button>
        </DialogClose>
        {hasHistory && !subject.archived && (
          <Button
            variant="secondary"
            disabled={!usage || pending}
            loading={pending && action === "archive"}
            onClick={() => run("archive")}
          >
            Arquivar
          </Button>
        )}
        <Button
          variant="danger"
          disabled={!usage || pending}
          loading={pending && action === "delete"}
          onClick={() => run("delete")}
        >
          Excluir matéria
        </Button>
      </DialogFooter>
    </>
  );
}

function joinPt(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;
}
