import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Page } from "@/components/layout/page";
import { ColorDot } from "@/features/subjects/components/color-picker";
import { SubjectActions } from "@/features/subjects/components/subject-actions";
import { getSubject, listSubjectSessions, listSubjects } from "@/features/subjects/queries";
import { GoalList } from "@/features/goals/components/goal-list";
import { getGoalsProgress } from "@/features/goals/queries";
import { uuid } from "@/features/subjects/schemas";
import { getProfile } from "@/lib/auth";
import { formatDuration, localDateISO, relativeDay } from "@/lib/format";
import { studyTypeLabel } from "@/lib/study-types";
import { SubjectStudyActions } from "@/features/timer/components/timer-widgets";

export const metadata: Metadata = { title: "Matéria" };

export default function SubjectPage({ params }: PageProps<"/materias/[id]">) {
  return (
    <Page>
      <Link
        href="/materias"
        className="mb-6 inline-flex items-center gap-1.5 rounded-md text-[13px] text-fg-2 transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Matérias
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <SubjectDetail params={params} />
      </Suspense>
    </Page>
  );
}

async function SubjectDetail({ params }: { params: PageProps<"/materias/[id]">["params"] }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const [profile, subject] = await Promise.all([getProfile(), getSubject(id)]);
  if (!subject) notFound();
  const todayISO = localDateISO(profile.timezone, new Date());
  const [sessions, all, allGoals] = await Promise.all([
    listSubjectSessions(id),
    listSubjects(),
    getGoalsProgress({ today: todayISO, weekStartsOn: profile.week_starts_on, subjectOrder: [] }),
  ]);
  const goals = allGoals.filter((g) => g.subject_id === id);
  const activeList = all
    .filter((s) => !s.archived_at)
    .map((s) => ({ id: s.id, name: s.name, color: s.color }));
  const archived = Boolean(subject.archived_at);
  const average = subject.sessions ? subject.seconds / subject.sessions : 0;

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <ColorDot color={subject.color} className="size-3" />
            <h1 className="truncate text-[22px] leading-tight font-semibold tracking-[-0.015em] text-fg">
              {subject.name}
            </h1>
            {archived && (
              <span className="shrink-0 rounded border border-border px-1.5 text-[12px] leading-5 text-fg-3">
                Arquivada
              </span>
            )}
          </div>
          {subject.description && (
            <p className="mt-2 max-w-[640px] pl-6 text-[14px] leading-relaxed whitespace-pre-line text-fg-2">
              {subject.description}
            </p>
          )}
        </div>
        <SubjectActions
          redirectOnDelete="/materias"
          triggerLabel="Ações da matéria"
          subject={{
            id: subject.id,
            name: subject.name,
            color: subject.color,
            description: subject.description,
            archived,
          }}
        />
      </header>

      {!archived && (
        <div className="mb-6">
          <SubjectStudyActions subjectId={subject.id} />
        </div>
      )}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        <Stat label="Estudado" value={formatDuration(subject.seconds)} />
        <Stat label="Sessões" value={subject.sessions.toLocaleString("pt-BR")} />
        <Stat label="Média por sessão" value={subject.sessions ? formatDuration(average) : "—"} />
        <Stat
          label="Última sessão"
          value={subject.lastDate ? relativeDay(subject.lastDate, todayISO) : "—"}
        />
      </dl>

      {!archived && (
        <section aria-labelledby="goals-title" className="mt-10">
          <h2 id="goals-title" className="mb-1 text-[14px] font-semibold text-fg">
            Metas
          </h2>
          <GoalList
            goals={goals}
            subjects={activeList}
            newSubjectId={subject.id}
            emptyText="Nenhuma meta para esta matéria."
          />
        </section>
      )}

      <section aria-labelledby="history-title" className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="history-title" className="text-[14px] font-semibold text-fg">
            Histórico
          </h2>
          {sessions.length > 0 && (
            <Link
              href={`/sessoes?materia=${subject.id}&periodo=tudo`}
              className="text-[13px] text-fg-2 transition-colors hover:text-fg"
            >
              Editar em Sessões
            </Link>
          )}
        </div>
        {sessions.length === 0 ? (
          <p className="mt-3 text-[13.5px] leading-relaxed text-fg-2">
            Nenhuma sessão registrada nesta matéria. Quando houver, o histórico aparece aqui, da mais recente
            para a mais antiga.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {sessions.map((s) => (
              <li key={s.id} className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-baseline gap-3 py-3">
                <span className="text-[13px] text-fg-2">{relativeDay(s.session_date, todayISO)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] text-fg">
                    {s.topic || studyTypeLabel(s.study_type)}
                  </span>
                  {s.topic && <span className="text-[12.5px] text-fg-3">{studyTypeLabel(s.study_type)}</span>}
                </span>
                <span className="text-[13.5px] text-fg tabular-nums">
                  {formatDuration(s.duration_seconds)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg px-4 py-3.5">
      <dt className="text-[12.5px] text-fg-3">{label}</dt>
      <dd className="mt-1 text-[18px] font-semibold tracking-[-0.01em] text-fg tabular-nums">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-6 w-56 rounded bg-surface-2" />
      <div className="mt-10 h-[74px] rounded-lg bg-surface-2/60" />
      <div className="mt-10 h-3.5 w-24 rounded bg-surface-2" />
    </div>
  );
}
