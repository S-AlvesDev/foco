import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Timer as TimerIcon } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import {
  aggregateDashboard,
  DASHBOARD_PERIODS,
  statsRange,
  type DashboardPeriod,
} from "@/features/dashboard/aggregate";
import { EvolutionChart } from "@/features/dashboard/components/evolution-chart";
import { PeriodTabs } from "@/features/dashboard/components/period-tabs";
import { getAllTimeTotals, getRecentSessions, getStatRows, getStreak } from "@/features/dashboard/queries";
import { listSubjects } from "@/features/subjects/queries";
import { DashboardStudyActions } from "@/features/timer/components/timer-widgets";
import { getProfile } from "@/lib/auth";
import { formatDuration, localDateISO, plural, relativeDay } from "@/lib/format";
import { studyTypeLabel } from "@/lib/study-types";
import { greeting, longDate } from "@/lib/time";

export const metadata: Metadata = { title: "Painel" };

export default function DashboardPage({ searchParams }: PageProps<"/painel">) {
  return (
    <Page className="max-w-[1040px]">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/painel">["searchParams"] }) {
  const sp = await searchParams;
  const period = (DASHBOARD_PERIODS.find((p) => p.value === sp.periodo)?.value ?? "30") as DashboardPeriod;
  const profile = await getProfile();
  const tz = profile.timezone;
  const now = new Date();
  const today = localDateISO(tz, now);
  const range = statsRange(period, today, profile.week_starts_on);

  const [subjects, rows, streak, allTime, recent] = await Promise.all([
    listSubjects(),
    getStatRows(range.from, range.to),
    getStreak(),
    getAllTimeTotals(),
    getRecentSessions(5),
  ]);
  const d = aggregateDashboard(rows, { today, weekStartsOn: profile.week_starts_on, period });
  const meta = Object.fromEntries(subjects.map((s) => [s.id, { name: s.name, color: s.color }]));
  const firstName = (profile.display_name || profile.email).split(" ")[0];
  const activeSubjects = subjects.filter((s) => !s.archived_at).length;
  const periodLabel = DASHBOARD_PERIODS.find((p) => p.value === period)!.label;
  const top = d.bySubject[0];

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <p className="text-[13px] text-fg-3 first-letter:uppercase">{longDate(tz, now)}</p>
          <h1 className="mt-1 text-[24px] leading-tight font-semibold tracking-[-0.02em] text-fg sm:text-[28px]">
            {greeting(tz, now)}, {firstName}.
          </h1>
        </div>
        {activeSubjects > 0 && <DashboardStudyActions />}
      </header>

      {activeSubjects === 0 && (
        <section className="mb-10 flex max-w-[560px] flex-col items-start gap-4 rounded-lg border border-border bg-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-fg">Cadastre suas matérias</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-2">
              Elas organizam sessões, metas, anotações e revisões.
            </p>
          </div>
          <Button asChild variant="primary" className="shrink-0">
            <Link href="/materias">Abrir matérias</Link>
          </Button>
        </section>
      )}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-5">
        <Stat label="Hoje" value={formatDuration(d.today)} />
        <Stat label="Esta semana" value={formatDuration(d.week)} />
        <Stat label="Este mês" value={formatDuration(d.month)} />
        <Stat
          label="Total acumulado"
          value={formatDuration(allTime.seconds)}
          sub={plural(allTime.sessions, "sessão", "sessões")}
        />
        <Stat
          label="Sequência"
          value={plural(streak.current, "dia", "dias")}
          sub={
            streak.best > 0 ? `Recorde: ${plural(streak.best, "dia", "dias")}` : "Estude hoje para começar"
          }
          className="col-span-2 sm:col-span-1"
        />
      </dl>

      <section aria-labelledby="evolution-title" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="evolution-title" className="text-[14px] font-semibold text-fg">
            Evolução
          </h2>
          <PeriodTabs value={period} />
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-fg-2 tabular-nums">
          <span>
            <span className="font-medium text-fg">{formatDuration(d.period.seconds)}</span> em{" "}
            {plural(d.period.sessions, "sessão", "sessões")}
          </span>
          <span>Média de {formatDuration(d.period.dailyAverage)} por dia</span>
          <span>
            {d.period.studiedDays} de {d.period.days} dias com estudo
          </span>
          {d.period.questions > 0 && <span>{plural(d.period.questions, "questão", "questões")}</span>}
        </p>
        <div className="mt-4">
          <EvolutionChart
            buckets={d.buckets}
            subjects={meta}
            caption={`Horas estudadas por ${d.granularity === "day" ? "dia" : d.granularity === "week" ? "semana" : "mês"}, últimos ${periodLabel}`}
          />
        </div>
      </section>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <section aria-labelledby="subjects-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="subjects-title" className="text-[14px] font-semibold text-fg">
              Por matéria
            </h2>
            <span className="text-[12.5px] text-fg-3">Últimos {periodLabel}</span>
          </div>
          {d.bySubject.length === 0 ? (
            <p className="mt-3 text-[13.5px] text-fg-2">Nenhum estudo registrado neste período.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3.5">
              {d.bySubject.slice(0, 8).map((s) => (
                <li key={s.subjectId}>
                  <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                    <Link
                      href={`/materias/${s.subjectId}`}
                      className="flex min-w-0 items-center gap-2 text-fg hover:underline hover:decoration-border-strong hover:underline-offset-[3px]"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: meta[s.subjectId]?.color }}
                      />
                      <span className="truncate">{meta[s.subjectId]?.name ?? "Matéria excluída"}</span>
                      {s === top && d.bySubject.length > 1 && (
                        <span className="shrink-0 text-[12px] text-fg-3">mais estudada</span>
                      )}
                    </Link>
                    <span className="shrink-0 text-fg tabular-nums">
                      {formatDuration(s.seconds)}
                      <span className="ml-2 inline-block w-9 text-right text-fg-3">
                        {Math.round(s.share * 100)}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-surface-2" aria-hidden>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(s.share * 100, 1.5)}%`,
                        background: meta[s.subjectId]?.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recent-title" className="text-[14px] font-semibold text-fg">
              Últimas sessões
            </h2>
            <Link href="/sessoes" className="text-[13px] text-fg-2 transition-colors hover:text-fg">
              Ver todas
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-3 text-[13.5px] text-fg-2">
              Use o cronômetro enquanto estuda ou registre uma sessão que já aconteceu.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: meta[s.subject_id]?.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-fg">
                      {s.topic || meta[s.subject_id]?.name || "Matéria"}
                    </span>
                    <span className="flex items-center gap-2 text-[12.5px] text-fg-3">
                      {s.topic ? (meta[s.subject_id]?.name ?? "Matéria") : studyTypeLabel(s.study_type)}
                      {s.source === "timer" && <TimerIcon className="size-3" aria-label="cronômetro" />}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13.5px] text-fg tabular-nums">
                      {formatDuration(s.duration_seconds)}
                    </span>
                    <span className="block text-[12px] text-fg-3">{relativeDay(s.session_date, today)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={`bg-bg px-4 py-3.5 ${className ?? ""}`}>
      <dt className="text-[12.5px] text-fg-3">{label}</dt>
      <dd className="mt-1 text-[20px] font-semibold tracking-[-0.015em] text-fg tabular-nums">{value}</dd>
      {sub && <dd className="mt-0.5 text-[12px] text-fg-3">{sub}</dd>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-3 w-40 rounded bg-surface-2" />
      <div className="mt-3 h-7 w-64 rounded bg-surface-2" />
      <div className="mt-10 h-[86px] rounded-lg bg-surface-2/60" />
      <div className="mt-10 h-3.5 w-24 rounded bg-surface-2" />
      <div className="mt-6 h-[200px] rounded-lg bg-surface-2/40" />
    </div>
  );
}
