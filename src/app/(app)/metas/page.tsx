import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/layout/page";
import { GoalsView } from "@/features/goals/components/goals-view";
import { getGoalsProgress } from "@/features/goals/queries";
import { listSubjects } from "@/features/subjects/queries";
import { getProfile } from "@/lib/auth";
import { localDateISO } from "@/lib/format";

export const metadata: Metadata = { title: "Metas" };

export default function GoalsPage() {
  return (
    <Page>
      <Suspense fallback={<GoalsSkeleton />}>
        <Goals />
      </Suspense>
    </Page>
  );
}

async function Goals() {
  const [profile, subjects] = await Promise.all([getProfile(), listSubjects()]);
  const today = localDateISO(profile.timezone, new Date());
  const goals = await getGoalsProgress({
    today,
    weekStartsOn: profile.week_starts_on,
    subjectOrder: subjects.map((s) => s.id),
  });
  return (
    <GoalsView
      goals={goals}
      subjects={subjects
        .filter((s) => !s.archived_at)
        .map((s) => ({ id: s.id, name: s.name, color: s.color }))}
    />
  );
}

function GoalsSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="text-[20px] leading-tight font-semibold tracking-[-0.015em] text-fg sm:text-[22px]">
        Metas
      </h1>
      <div className="mt-2.5 h-3 w-56 rounded bg-surface-2" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-8 h-14 rounded bg-surface-2/50" />
      ))}
    </div>
  );
}
