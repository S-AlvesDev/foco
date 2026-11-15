import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookOpen, ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { CAFE_DAYS, CAFE_PLAN_ID, getCafeDay } from "@/features/cafe/days";
import { getTrackMarks } from "@/features/tracks/queries";
import { CafeQuiz, MarkButton } from "@/features/tracks/components";

export async function generateMetadata({ params }: PageProps<"/cafe-com-lei/[dia]">): Promise<Metadata> {
  const d = getCafeDay((await params).dia);
  return { title: d ? `Café com Lei ${d.id} · ${d.title}` : "Café com Lei" };
}

export default async function CafeDayPage({ params }: PageProps<"/cafe-com-lei/[dia]">) {
  const day = getCafeDay((await params).dia);
  if (!day) notFound();
  const i = CAFE_DAYS.indexOf(day);
  const prev = CAFE_DAYS[i - 1];
  const next = CAFE_DAYS[i + 1];
  return (
    <Page size="narrow">
      <Link
        href="/cafe-com-lei"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-fg-3 hover:text-fg"
      >
        <ChevronLeft className="size-4" />
        Café com Lei
      </Link>
      <p className="text-[13px] font-medium text-accent">
        Dose {day.id} de {CAFE_DAYS.length}
      </p>
      <h1 className="font-display mt-1 text-[28px] leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[34px]">
        {day.title}
      </h1>
      <p className="mt-1.5 text-[14px] text-fg-2">{day.law}</p>

      <section aria-labelledby="pontos" className="mt-8">
        <h2 id="pontos" className="mb-3 text-[15px] font-semibold text-fg">
          O que mais cai
        </h2>
        <ol className="flex flex-col gap-3">
          {day.points.map((p) => (
            <li key={p.ref} className="rounded-2xl border border-border bg-surface-1 p-4 sm:p-5">
              <p className="text-[12.5px] font-semibold text-accent">{p.ref}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-fg">{p.text}</p>
              {p.trap && (
                <p className="mt-3 flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-[13px] leading-relaxed text-fg">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  <span>
                    <strong>Pegadinha:</strong> {p.trap}
                  </span>
                </p>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[12.5px] text-fg-3">
          Resumo do Missão Alpha. Confira sempre o texto oficial da lei, indicado em cada ponto.
        </p>
      </section>

      <section aria-labelledby="fixe" className="mt-9">
        <h2 id="fixe" className="mb-3 text-[15px] font-semibold text-fg">
          Fixe: certo ou errado
        </h2>
        <CafeQuiz questions={day.questions} />
      </section>

      <div className="mt-9 flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Suspense fallback={<Button disabled>Concluir a dose</Button>}>
          <Done id={day.id} />
        </Suspense>
        {day.topic && (
          <Button asChild variant="ghost">
            <Link href={`/biblioteca/${day.topic.disciplineId}/${day.topic.topicId}`}>
              <BookOpen />
              Aprofundar na apostila
            </Link>
          </Button>
        )}
      </div>

      <nav aria-label="Outras doses" className="mt-6 flex justify-between gap-3 text-[13px]">
        {prev ? (
          <Link
            href={`/cafe-com-lei/${prev.id}`}
            className="inline-flex items-center gap-1 text-fg-3 hover:text-fg"
          >
            <ChevronLeft className="size-4" />
            {prev.id}. {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/cafe-com-lei/${next.id}`}
            className="inline-flex items-center gap-1 text-right text-fg-3 hover:text-fg"
          >
            {next.id}. {next.title}
            <ChevronRight className="size-4" />
          </Link>
        )}
      </nav>
    </Page>
  );
}

async function Done({ id }: { id: string }) {
  const t = await getTrackMarks(CAFE_PLAN_ID);
  return (
    <MarkButton
      track="cafe-com-lei"
      day={id}
      done={t.marks.has(`${id}:0`)}
      label="Concluir a dose"
      doneLabel="Dose concluída"
    />
  );
}

export function generateStaticParams() {
  return CAFE_DAYS.map((d) => ({ dia: d.id }));
}
