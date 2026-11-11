"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  MoreHorizontal,
  Pencil,
  PencilLine,
  Play,
  Timer as TimerIcon,
  Trash2,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { formatDuration, plural, relativeDay, shortDate } from "@/lib/format";
import { studyTypeLabel } from "@/lib/study-types";
import { wallTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useStudy } from "@/features/timer/study-provider";
import { deleteSessionAction } from "../actions";
import type { SessionRow } from "../queries";
import { PERIODS } from "../periods";

export type SubjectInfo = { id: string; name: string; color: string; archived: boolean };

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function dayHeading(iso: string, todayISO: string) {
  const rel = relativeDay(iso, todayISO);
  if (rel === "hoje" || rel === "ontem") return rel[0].toUpperCase() + rel.slice(1);
  const wd = WEEKDAYS[new Date(iso + "T12:00:00Z").getUTCDay()];
  return `${wd[0].toUpperCase()}${wd.slice(1)}, ${shortDate(iso, todayISO)}`;
}

export function SessionsView({
  sessions,
  subjects,
  todayISO,
  timezone,
  period,
  subjectId,
  hasOlder,
}: {
  sessions: SessionRow[];
  subjects: SubjectInfo[];
  todayISO: string;
  timezone: string;
  period: string;
  subjectId?: string;
  hasOlder: boolean;
}) {
  const { openManual, openStart, ready, data } = useStudy();
  const bySubject = new Map(subjects.map((s) => [s.id, s]));
  const total = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  const noSubjects = ready && data?.subjects.length === 0;

  const groups: { date: string; items: SessionRow[]; seconds: number }[] = [];
  for (const s of sessions) {
    const last = groups.at(-1);
    if (last && last.date === s.session_date) {
      last.items.push(s);
      last.seconds += s.duration_seconds;
    } else groups.push({ date: s.session_date, items: [s], seconds: s.duration_seconds });
  }

  const nextPeriod = PERIODS[PERIODS.findIndex((p) => p.value === period) + 1];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[34px]">
            Sessões
          </h1>
          <p className="mt-1 text-[14px] text-fg-2 tabular-nums">
            {sessions.length === 0
              ? "Nenhuma sessão no período."
              : `${formatDuration(total)} em ${plural(sessions.length, "sessão", "sessões")}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => openStart(subjectId)}
            disabled={!ready || noSubjects || Boolean(data?.timer)}
          >
            <Play fill="currentColor" className="!size-3.5" />
            Cronômetro
          </Button>
          <Button
            variant="primary"
            onClick={() => openManual(subjectId ? { subjectId } : undefined)}
            disabled={!ready || noSubjects}
          >
            <PencilLine />
            Registrar sessão
          </Button>
        </div>
      </div>

      <Filters subjects={subjects} period={period} subjectId={subjectId} />

      {groups.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center">
          <p className="text-[14px] font-medium text-fg">
            {subjects.length === 0 ? "Cadastre uma matéria para começar" : "Nada registrado neste período"}
          </p>
          <p className="mx-auto mt-1.5 max-w-[400px] text-[13.5px] leading-relaxed text-fg-2">
            {subjects.length === 0
              ? "Toda sessão pertence a uma matéria."
              : "Use o cronômetro enquanto estuda ou registre uma sessão que já aconteceu."}
          </p>
          {subjects.length === 0 && (
            <Button asChild variant="secondary" className="mt-5">
              <Link href="/materias">Abrir matérias</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.date} aria-label={dayHeading(g.date, todayISO)}>
              <div className="list-head">
                <h2 className="text-fg">{dayHeading(g.date, todayISO)}</h2>
                <span className="text-[13px] text-fg-2 tabular-nums">{formatDuration(g.seconds)}</span>
              </div>
              <ul className="list-box divide-y divide-border">
                {g.items.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    subject={bySubject.get(s.subject_id)}
                    timezone={timezone}
                    onEdit={() => {
                      const subject = bySubject.get(s.subject_id);
                      openManual({
                        id: s.id,
                        subjectId: s.subject_id,
                        subject: subject && { id: subject.id, name: subject.name, color: subject.color },
                        date: s.session_date,
                        start: s.started_at ? wallTime(timezone, new Date(s.started_at)) : "",
                        end: s.ended_at ? wallTime(timezone, new Date(s.ended_at)) : "",
                        durationMinutes: Math.round(s.duration_seconds / 60),
                        studyType: s.study_type,
                        topic: s.topic,
                        notes: s.notes,
                        questionsAnswered: s.questions_answered,
                        questionsCorrect: s.questions_correct,
                      });
                    }}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {hasOlder && nextPeriod && (
        <p className="mt-8 text-center text-[13px] text-fg-2">
          Há sessões mais antigas.{" "}
          <Link
            href={`/sessoes?periodo=${nextPeriod.value}${subjectId ? `&materia=${subjectId}` : ""}`}
            className="font-medium text-fg underline decoration-border-strong underline-offset-[3px] hover:decoration-fg-2"
          >
            Ver {nextPeriod.value === "tudo" ? "todo o histórico" : `os últimos ${nextPeriod.label}`}
          </Link>
        </p>
      )}
    </>
  );
}

const selectClass =
  "h-8 cursor-pointer appearance-none rounded-md border border-border bg-surface-2 bg-[length:14px] bg-[right_8px_center] bg-no-repeat pr-7 pl-2.5 text-[13px] text-fg transition-colors hover:border-border-strong focus:border-accent focus:outline-none";
const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

function Filters({
  subjects,
  period,
  subjectId,
}: {
  subjects: SubjectInfo[];
  period: string;
  subjectId?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  // Mudanças rápidas seguidas partem da última URL pedida.
  const paramsStr = params.toString();
  const latest = useRef(paramsStr);
  useEffect(() => {
    if (!pending) latest.current = paramsStr;
  }, [paramsStr, pending]);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(latest.current);
    if (value) next.set(key, value);
    else next.delete(key);
    latest.current = next.toString();
    startTransition(() => router.replace(`/sessoes${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  return (
    <div className={cn("flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-60")}>
      <label className="sr-only" htmlFor="filter-subject">
        Matéria
      </label>
      <select
        id="filter-subject"
        value={subjectId ?? ""}
        onChange={(e) => set("materia", e.target.value)}
        className={selectClass}
        style={{ backgroundImage: chevron }}
      >
        <option value="">Todas as matérias</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.archived ? " (arquivada)" : ""}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="filter-period">
        Período
      </label>
      <select
        id="filter-period"
        value={period}
        onChange={(e) => set("periodo", e.target.value === "30" ? "" : e.target.value)}
        className={selectClass}
        style={{ backgroundImage: chevron }}
      >
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.value === "tudo" ? "Todo o histórico" : `Últimos ${p.label}`}
          </option>
        ))}
      </select>
    </div>
  );
}

function SessionItem({
  session: s,
  subject,
  timezone,
  onEdit,
}: {
  session: SessionRow;
  subject?: SubjectInfo;
  timezone: string;
  onEdit: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const { openReview } = useStudy();
  const range =
    s.started_at && s.ended_at
      ? `${wallTime(timezone, new Date(s.started_at))}–${wallTime(timezone, new Date(s.ended_at))}`
      : null;
  const title = s.topic || studyTypeLabel(s.study_type);

  return (
    <li className="group grid grid-cols-[minmax(0,1fr)_auto_32px] items-center gap-3 py-3">
      <button type="button" onClick={onEdit} className="min-w-0 cursor-pointer rounded-sm text-left">
        <span className="flex items-center gap-2 text-[13px] text-fg-2">
          <span className="size-2 shrink-0 rounded-full" style={{ background: subject?.color }} aria-hidden />
          <span className="truncate">{subject?.name ?? "Matéria excluída"}</span>
        </span>
        <span className="mt-0.5 block truncate pl-4 text-[14px] text-fg">{title}</span>
        <span className="mt-0.5 flex flex-wrap gap-x-3 pl-4 text-[12.5px] text-fg-3">
          {s.topic && <span>{studyTypeLabel(s.study_type)}</span>}
          {range && <span className="tabular-nums">{range}</span>}
          {s.questions_answered != null && (
            <span className="tabular-nums">
              {s.questions_correct != null
                ? `${s.questions_correct}/${s.questions_answered} acertos`
                : plural(s.questions_answered, "questão", "questões")}
            </span>
          )}
          {s.source === "timer" && (
            <span className="inline-flex items-center gap-1">
              <TimerIcon className="size-3" aria-hidden />
              cronômetro
            </span>
          )}
        </span>
        {s.notes && <span className="mt-1 line-clamp-2 block pl-4 text-[12.5px] text-fg-2">{s.notes}</span>}
      </button>
      <span className="text-[14px] font-medium text-fg tabular-nums">
        {formatDuration(s.duration_seconds)}
      </span>
      <Menu>
        <MenuTrigger
          className="flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-3 outline-none transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent data-[state=open]:bg-surface-2"
          aria-label={`Ações da sessão de ${subject?.name ?? "matéria"}: ${title}`}
        >
          <MoreHorizontal className="size-4" />
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem onSelect={onEdit}>
            <Pencil />
            Editar
          </MenuItem>
          <MenuItem onSelect={() => openReview({ subjectId: s.subject_id, topic: s.topic, sessionId: s.id })}>
            <CalendarClock />
            Agendar revisão
          </MenuItem>
          <MenuSeparator />
          <MenuItem destructive onSelect={() => setConfirm(true)}>
            <Trash2 />
            Excluir…
          </MenuItem>
        </MenuContent>
      </Menu>
      <DeleteSessionDialog
        open={confirm}
        onOpenChange={setConfirm}
        id={s.id}
        label={`${formatDuration(s.duration_seconds)} de ${subject?.name ?? "matéria"}`}
      />
    </li>
  );
}

function DeleteSessionDialog({
  open,
  onOpenChange,
  id,
  label,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  id: string;
  label: string;
}) {
  const { sync } = useStudy();
  const [pending, startTransition] = useTransition();
  const remove = () =>
    startTransition(async () => {
      const res = await deleteSessionAction(id);
      if (!res.ok) return void toast.error(res.message);
      toast.success("Sessão excluída");
      sync();
      onOpenChange(false);
    });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Excluir sessão?">
        <DialogBody>
          <p className="text-[13.5px] leading-relaxed text-fg-2">
            A sessão de <span className="font-medium text-fg">{label}</span> sai do histórico e dos totais.
            Não dá para desfazer.
          </p>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button variant="danger" onClick={remove} loading={pending}>
            Excluir sessão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
