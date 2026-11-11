import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChartNoAxesColumn, LibraryBig, TriangleAlert } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { plural, shortDate } from "@/lib/format";
import { EmptyState } from "@/features/library/components/parts";
import { memoryGate } from "@/features/memory/components/gate";
import { ForecastBars } from "@/features/memory/components/forecast-bars";
import { ReviewSession, type SessionTopic } from "@/features/memory/components/review-session";
import { daysToExam, FINAL_STRETCH_DAYS } from "@/features/memory/fsrs";
import { getMemoryItems, getQueue, type Queue } from "@/features/memory/queries";

export const metadata: Metadata = { title: "Revisões de hoje" };

export default function TodayPage({ searchParams }: PageProps<"/revisoes/hoje">) {
  return (
    <Page size="narrow">
      <Suspense fallback={<Skeleton />}>
        <Today searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

const toSession = (t: Queue["now"][number]): SessionTopic => ({
  topicId: t.topicId,
  disciplineId: t.disciplineId,
  disciplineName: t.disciplineName,
  topicNumber: t.topicNumber,
  topicTitle: t.topicTitle,
  dueOn: t.dueOn,
  r: t.r,
  overdue: t.overdue,
  minutes: t.minutes,
  level: t.level,
  stability: t.stability,
  difficulty: t.difficulty,
  lastReviewOn: t.lastReviewOn,
  recent: t.recent,
  hasQuestions: t.hasQuestions,
  contentChanged: t.contentChanged,
});

async function Today({ searchParams }: { searchParams: PageProps<"/revisoes/hoje">["searchParams"] }) {
  const sp = await searchParams;
  const header = (
    <PageHeader
      title="Revisões de hoje"
      description="Revisão adaptativa dos tópicos que você concluiu na Biblioteca."
      actions={
        <Button asChild variant="ghost">
          <Link href="/revisoes/desempenho">
            <ChartNoAxesColumn />
            <span className="hidden sm:inline">Desempenho e ajustes</span>
            <span className="sm:hidden">Desempenho</span>
          </Link>
        </Button>
      }
    />
  );
  const gate = await memoryGate();
  if (gate)
    return (
      <>
        {header}
        {gate}
      </>
    );

  const q = await getQueue();
  const items = await getMemoryItems();
  if (!q.total)
    return (
      <>
        {header}
        <EmptyState
          title="Nenhum tópico nas revisões ainda"
          action={
            <Button asChild variant="primary">
              <Link href="/biblioteca">
                <LibraryBig />
                Abrir a Biblioteca
              </Link>
            </Button>
          }
        >
          Quando você marca um tópico como concluído na Biblioteca, ele entra aqui com a primeira revisão no
          dia seguinte. Depois, cada data é calculada pelo seu desempenho.
        </EmptyState>
      </>
    );

  const upcoming = items
    .filter((i) => i.state !== "suspended" && i.dueOn > q.today)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const next = upcoming[0]?.dueOn;
  const nextCount = upcoming.filter((i) => i.dueOn === next).length;
  const exam = daysToExam(q.settings, q.today);
  const autoStart = typeof sp.topico === "string" ? sp.topico : null;

  return (
    <>
      {header}
      {exam != null && exam <= FINAL_STRETCH_DAYS && (
        <Notice>
          Reta final: faltam {plural(exam, "dia", "dias")} para a prova. A meta subiu para{" "}
          {Math.round(q.target * 100)}% e nenhuma revisão passa da véspera.
        </Notice>
      )}
      {q.overloadFrom && (
        <Notice warn>
          A partir de {shortDate(q.overloadFrom, q.today)} as revisões passam do seu tempo diário. Vale
          reduzir os tópicos novos por alguns dias até a fila baixar, ou aumentar o tempo em Desempenho e
          ajustes.
        </Notice>
      )}
      <ReviewSession
        today={q.today}
        now={q.now.map(toSession)}
        later={q.later.map(toSession)}
        settings={q.settings}
        minutes={q.minutes}
        autoStart={autoStart}
        aside={
          <>
            {!q.now.length && next && (
              <p className="mt-3 text-[13.5px] text-fg-2">
                Próxima: {shortDate(next, q.today)}, {plural(nextCount, "tópico", "tópicos")}.
              </p>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_1fr]">
              <section
                aria-labelledby="fc"
                className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-5"
              >
                <h2 id="fc" className="text-[14.5px] font-semibold text-fg">
                  Próximos 30 dias
                </h2>
                <p className="mt-0.5 mb-5 text-[12.5px] text-fg-3">Minutos de revisão previstos por dia</p>
                <ForecastBars days={q.forecast} limit={q.settings.dailyMinutes} today={q.today} />
              </section>
              <section
                aria-labelledby="att"
                className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-5"
              >
                <h2 id="att" className="text-[14.5px] font-semibold text-fg">
                  Precisam de atenção
                </h2>
                {q.attention.length ? (
                  <ul className="mt-3 flex flex-col gap-3">
                    {q.attention.map((a) => (
                      <li key={a.disciplineId}>
                        <Link
                          href={`/biblioteca/${encodeURIComponent(a.disciplineId)}`}
                          className="text-[14px] font-medium text-fg hover:underline"
                        >
                          {a.name}
                        </Link>
                        <p className="text-[12.5px] text-fg-3">{a.reason}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">
                    Nenhuma disciplina abaixo da meta agora.
                  </p>
                )}
              </section>
            </div>
          </>
        }
      />
    </>
  );
}

function Notice({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <div
      className={
        "mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13.5px] leading-relaxed " +
        (warn ? "border-warning/40 bg-warning/10 text-fg" : "border-accent/30 bg-accent-subtle text-fg")
      }
    >
      <TriangleAlert
        className={"mt-0.5 size-4 shrink-0 " + (warn ? "text-warning" : "text-accent")}
        aria-hidden
      />
      <p>{children}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[34px]">
        Revisões de hoje
      </h1>
      <div className="mt-2.5 h-3 w-72 rounded bg-surface-2" />
      <div className="mt-8 h-64 rounded-2xl bg-surface-2/60" />
    </div>
  );
}
