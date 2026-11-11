import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, Timer as TimerIcon } from "lucide-react";
import { Page } from "@/components/layout/page";
import { RegisterOnDay } from "@/features/calendar/components/day-actions";
import { Heatmap } from "@/features/calendar/components/heatmap";
import {
  dayParam,
  heatmapColumns,
  heatmapStart,
  intensity,
  monthGrid,
  monthParam,
} from "@/features/calendar/grid";
import { getStatRows } from "@/features/dashboard/queries";
import { listGoals } from "@/features/goals/queries";
import { listSessions } from "@/features/sessions/queries";
import { listSubjects } from "@/features/subjects/queries";
import { getProfile } from "@/lib/auth";
import { WEEKDAYS_SHORT, addDays, addMonths, longDayLabel, monthLabel, monthStartOf } from "@/lib/dates";
import { compactDuration, formatDuration, localDateISO, plural, shortDate } from "@/lib/format";
import { studyTypeLabel } from "@/lib/study-types";
import { wallTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendário" };

export default function CalendarPage({ searchParams }: PageProps<"/calendario">) {
  return (
    <Page>
      <Suspense fallback={<CalendarSkeleton />}>
        <Calendar searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Calendar({ searchParams }: { searchParams: PageProps<"/calendario">["searchParams"] }) {
  const sp = await searchParams;
  const profile = await getProfile();
  const tz = profile.timezone;
  const weekStartsOn = profile.week_starts_on;
  const today = localDateISO(tz, new Date());
  const month = monthParam(sp.mes, today);
  const monthEnd = addDays(addMonths(month, 1), -1);
  // Sem dia escolhido no mês atual, abre em hoje: o painel ao lado nunca fica vazio.
  const day = dayParam(sp.dia, month, today) ?? (month.slice(0, 7) === today.slice(0, 7) ? today : null);
  const heatFrom = heatmapStart(today, weekStartsOn);

  const [subjects, goals, heatRows, monthRows, daySessions] = await Promise.all([
    listSubjects(),
    listGoals(),
    getStatRows(heatFrom, today),
    month >= heatFrom ? Promise.resolve(null) : getStatRows(month, monthEnd),
    day ? listSessions({ from: day, to: day }) : Promise.resolve([]),
  ]);

  const totals: Record<string, number> = {};
  for (const r of [...heatRows, ...(monthRows ?? [])]) totals[r.day] = (totals[r.day] ?? 0) + r.seconds;
  const dailyGoal =
    goals.find((g) => g.period === "daily" && g.metric === "minutes" && !g.subject_id)?.target ?? null;
  const meta = new Map(subjects.map((s) => [s.id, s]));

  const grid = monthGrid(month, today, weekStartsOn);
  const monthDays = grid.flat().filter((c) => c.inMonth && !c.future);
  const monthTotal = monthDays.reduce((s, c) => s + (totals[c.date] ?? 0), 0);
  const studiedDays = monthDays.filter((c) => (totals[c.date] ?? 0) > 0).length;
  const best = monthDays.reduce<string | null>(
    (b, c) => ((totals[c.date] ?? 0) > (b ? totals[b] : 0) ? c.date : b),
    null,
  );
  const prev = addMonths(month, -1).slice(0, 7);
  const next = addMonths(month, 1);
  const isCurrent = month === monthStartOf(today);
  const dayTotal = daySessions.reduce((s, x) => s + x.duration_seconds, 0);

  return (
    <>
      <h1 className="mb-8 font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[34px]">
        Calendário
      </h1>

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="month-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 id="month-title" className="text-[15px] font-semibold text-fg first-letter:uppercase">
                {monthLabel(month)}
              </h2>
              <p className="mt-0.5 text-[13px] text-fg-2 tabular-nums">
                {monthTotal ? (
                  <>
                    {formatDuration(monthTotal)} em {plural(studiedDays, "dia", "dias")}
                    {best && `, melhor dia: ${shortDate(best, today)}`}
                  </>
                ) : (
                  "Nenhum estudo registrado neste mês."
                )}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`/calendario?mes=${prev}`}
                scroll={false}
                aria-label="Mês anterior"
                className="flex size-8 items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <ChevronLeft className="size-4" />
              </Link>
              {!isCurrent && (
                <Link
                  href="/calendario"
                  scroll={false}
                  className="flex h-8 items-center rounded-md px-2.5 text-[13px] text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  Hoje
                </Link>
              )}
              {isCurrent ? (
                <span className="flex size-8 items-center justify-center text-fg-3 opacity-40" aria-hidden>
                  <ChevronRight className="size-4" />
                </span>
              ) : (
                <Link
                  href={`/calendario?mes=${next.slice(0, 7)}`}
                  scroll={false}
                  aria-label="Próximo mês"
                  className="flex size-8 items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  <ChevronRight className="size-4" />
                </Link>
              )}
            </div>
          </div>

          <div role="grid" aria-labelledby="month-title" className="select-none">
            <div role="row" className="grid grid-cols-7 gap-1 pb-1.5">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} role="columnheader" className="text-center text-[12px] text-fg-3">
                  {WEEKDAYS_SHORT[(weekStartsOn + i) % 7]}
                </span>
              ))}
            </div>
            {grid.map((week, wi) => (
              <div key={wi} role="row" className="grid grid-cols-7 gap-1 pb-1">
                {week.map((c) => {
                  const secs = totals[c.date] ?? 0;
                  const lvl = c.inMonth ? intensity(secs, dailyGoal) : 0;
                  const selected = c.date === day;
                  const inner = (
                    <>
                      <span
                        className={cn(
                          "text-[12.5px] tabular-nums",
                          c.today
                            ? "font-semibold text-accent"
                            : !c.inMonth
                              ? "text-fg-3 opacity-40"
                              : c.future
                                ? "text-fg-3"
                                : "text-fg-2",
                        )}
                      >
                        {Number(c.date.slice(8))}
                      </span>
                      {c.inMonth && secs > 0 && (
                        <span className="text-[12px] font-medium text-fg tabular-nums sm:text-[13px]">
                          {compactDuration(secs)}
                        </span>
                      )}
                    </>
                  );
                  const base = cn(
                    "flex aspect-[1/0.9] flex-col justify-between rounded-md p-1.5 sm:aspect-[1/0.78] sm:p-2",
                    !c.inMonth || c.future ? "bg-transparent" : lvl ? `tint-${lvl}` : "bg-surface-1",
                    selected && "ring-2 ring-accent ring-offset-1 ring-offset-bg",
                  );
                  if (!c.inMonth || c.future) {
                    return (
                      <div
                        key={c.date}
                        role="gridcell"
                        className={cn(base, c.future && c.inMonth && "opacity-45")}
                      >
                        {inner}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={c.date}
                      role="gridcell"
                      href={`/calendario?mes=${month.slice(0, 7)}&dia=${c.date}`}
                      scroll={false}
                      aria-label={`${longDayLabel(c.date)}: ${secs ? formatDuration(secs) : "sem estudo"}`}
                      aria-current={selected ? "date" : undefined}
                      className={cn(base, "transition-[box-shadow,filter] hover:brightness-110")}
                    >
                      {inner}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <aside aria-labelledby="day-title" className="lg:pt-[52px]">
          {day ? (
            <>
              <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                <h2 id="day-title" className="text-[13.5px] font-semibold text-fg first-letter:uppercase">
                  {longDayLabel(day)}
                </h2>
                <span className="text-[13px] text-fg-2 tabular-nums">{formatDuration(dayTotal)}</span>
              </div>
              {daySessions.length === 0 ? (
                <p className="mt-3 text-[13.5px] text-fg-2">Nenhuma sessão neste dia.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {daySessions.map((s) => {
                    const subj = meta.get(s.subject_id);
                    return (
                      <li key={s.id} className="flex items-start gap-2.5 py-2.5">
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full"
                          style={{ background: subj?.color }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] text-fg">
                            {s.topic || subj?.name}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-fg-3">
                            <span>{s.topic ? subj?.name : studyTypeLabel(s.study_type)}</span>
                            {s.started_at && (
                              <span className="tabular-nums">{wallTime(tz, new Date(s.started_at))}</span>
                            )}
                            {s.source === "timer" && <TimerIcon className="size-3" aria-label="cronômetro" />}
                          </span>
                        </span>
                        <span className="text-[13.5px] text-fg tabular-nums">
                          {formatDuration(s.duration_seconds)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <RegisterOnDay date={day} />
              </div>
            </>
          ) : (
            <p id="day-title" className="text-[13.5px] leading-relaxed text-fg-2">
              Toque em um dia para ver as sessões registradas nele.
            </p>
          )}
        </aside>
      </div>

      <section aria-labelledby="year-title" className="mt-12">
        <h2 id="year-title" className="mb-1 text-[14px] font-semibold text-fg">
          Último ano
        </h2>
        <Heatmap
          columns={heatmapColumns(today, weekStartsOn)}
          totals={totals}
          dailyGoalMinutes={dailyGoal}
          weekStartsOn={weekStartsOn}
        />
      </section>
    </>
  );
}

function CalendarSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="mb-8 font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[34px]">
        Calendário
      </h1>
      <div className="h-4 w-40 rounded bg-surface-2" />
      <div className="mt-4 grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="aspect-[1/0.78] rounded-md bg-surface-2/50" />
        ))}
      </div>
    </div>
  );
}
