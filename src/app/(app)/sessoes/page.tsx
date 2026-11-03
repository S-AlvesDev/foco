import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/layout/page";
import { SessionsView } from "@/features/sessions/components/sessions-view";
import { PERIODS } from "@/features/sessions/periods";
import { hasOlderSessions, listSessions } from "@/features/sessions/queries";
import { listSubjects } from "@/features/subjects/queries";
import { uuid } from "@/features/subjects/schemas";
import { getProfile } from "@/lib/auth";
import { localDateISO } from "@/lib/format";

export const metadata: Metadata = { title: "Sessões" };

export default function SessionsPage({ searchParams }: PageProps<"/sessoes">) {
  return (
    <Page>
      <Suspense fallback={<SessionsSkeleton />}>
        <Sessions searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

function daysAgo(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function Sessions({ searchParams }: { searchParams: PageProps<"/sessoes">["searchParams"] }) {
  const sp = await searchParams;
  const rawPeriod = typeof sp.periodo === "string" ? sp.periodo : "30";
  const period = PERIODS.some((p) => p.value === rawPeriod) ? rawPeriod : "30";
  const rawSubject = typeof sp.materia === "string" ? sp.materia : undefined;
  const subjectId = rawSubject && uuid.safeParse(rawSubject).success ? rawSubject : undefined;

  const profile = await getProfile();
  const todayISO = localDateISO(profile.timezone, new Date());
  // Uma sessão de ontem à noite pode ter data de "amanhã" em outro fuso; folga de 1 dia.
  const to = daysAgo(todayISO, -1);
  const from = period === "tudo" ? "2000-01-01" : daysAgo(todayISO, Number(period) - 1);

  const [subjects, sessions, hasOlder] = await Promise.all([
    listSubjects(),
    listSessions({ from, to, subjectId }),
    period === "tudo" ? Promise.resolve(false) : hasOlderSessions(from, subjectId),
  ]);

  return (
    <SessionsView
      sessions={sessions}
      subjects={subjects.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        archived: Boolean(s.archived_at),
      }))}
      todayISO={todayISO}
      timezone={profile.timezone}
      period={period}
      subjectId={subjectId}
      hasOlder={hasOlder}
    />
  );
}

function SessionsSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="text-[20px] leading-tight font-semibold tracking-[-0.015em] text-fg sm:text-[22px]">
        Sessões
      </h1>
      <div className="mt-2.5 h-3 w-40 rounded bg-surface-2" />
      <div className="mt-8 flex gap-2">
        <div className="h-8 w-40 rounded-md bg-surface-2" />
        <div className="h-8 w-32 rounded-md bg-surface-2" />
      </div>
      <div className="mt-8 h-3.5 w-24 rounded bg-surface-2" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-4 h-12 rounded bg-surface-2/50" />
      ))}
    </div>
  );
}
