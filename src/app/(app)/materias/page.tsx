import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/layout/page";
import { SubjectsView } from "@/features/subjects/components/subjects-view";
import { listSubjects } from "@/features/subjects/queries";
import { getProfile } from "@/lib/auth";
import { localDateISO } from "@/lib/format";

export const metadata: Metadata = { title: "Matérias" };

export default function SubjectsPage() {
  return (
    <Page>
      <Suspense fallback={<SubjectsSkeleton />}>
        <Subjects />
      </Suspense>
    </Page>
  );
}

async function Subjects() {
  const [profile, subjects] = await Promise.all([getProfile(), listSubjects()]);
  const todayISO = localDateISO(profile.timezone, new Date());
  return (
    <SubjectsView
      todayISO={todayISO}
      subjects={subjects.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        description: s.description,
        archived: Boolean(s.archived_at),
        seconds: s.seconds,
        sessions: s.sessions,
        lastDate: s.lastDate,
      }))}
    />
  );
}

function SubjectsSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
            Matérias
          </h1>
          <div className="mt-2.5 h-3 w-48 rounded bg-surface-2" />
        </div>
        <div className="h-8 w-32 rounded-md bg-surface-2" />
      </div>
      <div className="divide-y divide-border border-y border-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex h-14 items-center gap-3 px-2">
            <span className="size-2.5 rounded-full bg-surface-3" />
            <span className="h-3 w-40 rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
