"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { StudyType } from "@/lib/study-types";
import { GroupLabel, StudyTypeChips, SubjectChips } from "@/features/sessions/components/pickers";
import { startTimerAction } from "../actions";
import type { StudySubject } from "../types";
import { useStudy } from "../study-provider";

export function StartTimerDialog({
  open,
  onOpenChange,
  subjects,
  defaultSubjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: StudySubject[];
  defaultSubjectId?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Iniciar cronômetro"
        description="Ele continua contando se você trocar de página ou fechar o app."
      >
        {open && (
          <StartForm
            subjects={subjects}
            defaultSubjectId={defaultSubjectId}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StartForm({
  subjects,
  defaultSubjectId,
  onDone,
}: {
  subjects: StudySubject[];
  defaultSubjectId?: string;
  onDone: () => void;
}) {
  const { sync } = useStudy();
  const [subjectId, setSubjectId] = useState(
    subjects.some((s) => s.id === defaultSubjectId) ? defaultSubjectId : subjects[0]?.id,
  );
  const [studyType, setStudyType] = useState<StudyType>("theory");
  const [topic, setTopic] = useState("");
  const [pending, startTransition] = useTransition();

  const start = () => {
    if (!subjectId) return;
    startTransition(async () => {
      const res = await startTimerAction({ subjectId, topic, studyType });
      if (!res.ok) {
        toast.error(res.message);
        sync();
        return;
      }
      sync(res.timer, res.serverNow);
      onDone();
    });
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        start();
      }}
    >
      <DialogBody className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <GroupLabel id="timer-subject">Matéria</GroupLabel>
          <SubjectChips
            subjects={subjects}
            value={subjectId}
            onChange={setSubjectId}
            labelledBy="timer-subject"
          />
        </div>
        <Field label="Assunto" hint="Opcional. Dá para completar ao finalizar.">
          {(p) => (
            <Input
              {...p}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="O que você vai estudar agora?"
              maxLength={200}
              autoComplete="off"
            />
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <GroupLabel id="timer-type">Tipo de estudo</GroupLabel>
          <StudyTypeChips value={studyType} onChange={setStudyType} labelledBy="timer-type" />
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending} disabled={!subjectId} autoFocus>
          {!pending && <Play />}
          Iniciar
        </Button>
      </DialogFooter>
    </form>
  );
}
