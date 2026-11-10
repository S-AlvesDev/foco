import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/layout/page";
import { ReviewsView } from "@/features/reviews/components/reviews-view";
import { countReviews, listPendingReviews, listReviewHistory } from "@/features/reviews/queries";
import { reviewGroup } from "@/features/reviews/schedule";
import { listSubjects } from "@/features/subjects/queries";
import { uuid } from "@/features/subjects/schemas";
import { getProfile } from "@/lib/auth";
import { localDateISO } from "@/lib/format";
import { findTopicsByTitle } from "@/features/library/queries";

export const metadata: Metadata = { title: "Revisões" };

export default function ReviewsPage({ searchParams }: PageProps<"/revisoes">) {
  return (
    <Page>
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Reviews({ searchParams }: { searchParams: PageProps<"/revisoes">["searchParams"] }) {
  const sp = await searchParams;
  const view = sp.ver === "historico" ? "historico" : "pendentes";
  const subjectId =
    typeof sp.materia === "string" && uuid.safeParse(sp.materia).success ? sp.materia : undefined;
  const [profile, subjects, pendingAll, counts] = await Promise.all([
    getProfile(),
    listSubjects(),
    listPendingReviews(),
    countReviews(),
  ]);
  const today = localDateISO(profile.timezone, new Date());
  const reviews =
    view === "historico"
      ? await listReviewHistory(subjectId)
      : pendingAll.filter((r) => !subjectId || r.subject_id === subjectId);

  const materials = Object.fromEntries(await findTopicsByTitle(reviews.map((r) => r.topic)));

  return (
    <ReviewsView
      reviews={reviews}
      materials={materials}
      subjects={subjects.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        archived: Boolean(s.archived_at),
      }))}
      todayISO={today}
      view={view}
      subjectId={subjectId}
      counts={{
        ...counts,
        overdue: pendingAll.filter((r) => reviewGroup(r.due_date, today) === "overdue").length,
        today: pendingAll.filter((r) => r.due_date === today).length,
      }}
    />
  );
}

function ReviewsSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
        Revisões
      </h1>
      <div className="mt-2.5 h-3 w-56 rounded bg-surface-2" />
      <div className="mt-6 h-8 w-72 rounded-md bg-surface-2/60" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="mt-5 h-12 rounded bg-surface-2/40" />
      ))}
    </div>
  );
}
