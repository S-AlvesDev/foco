import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { addDays } from "@/lib/dates";
import { QuestionsTodayCard } from "@/features/questions/components/question-insights";
import { LibraryCard } from "@/features/library/components/library-card";
import { MemoryCard } from "@/features/memory/components/memory-card";
import { PlanCard } from "@/features/plan/components/plan-card";
import { getQuestionDaily } from "@/features/questions/queries";
import type { Route } from "next";
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  ChartColumn,
  ChartNoAxesColumn,
  ChevronRight,
  Clock3,
  Flame,
  History,
  Layers,
  NotebookPen,
  RefreshCcw,
  Target,
  Timer as TimerIcon,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { FocusChip } from "@/features/focus/components/focus-chip";
import { getStudyFocus } from "@/features/focus/queries";
import { BannerBackdrop } from "@/features/banner/components/banner-backdrop";
import { readBanner } from "@/features/banner/model";
import { bannerUrl } from "@/features/banner/server";
import { ShortcutAction } from "@/features/pwa/shortcut-action";
import { OrbitArcs } from "@/components/orbit-arcs";
import { cn } from "@/lib/utils";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import {
  aggregateDashboard,
  compareWithPrevious,
  DASHBOARD_PERIODS,
  type Comparison,
  statsRange,
  type DashboardPeriod,
} from "@/features/dashboard/aggregate";
import { EvolutionChart } from "@/features/dashboard/components/evolution-chart";
import { PeriodTabs } from "@/features/dashboard/components/period-tabs";
import { getAllTimeTotals, getRecentSessions, getStatRows, getStreak } from "@/features/dashboard/queries";
import { GoalList } from "@/features/goals/components/goal-list";
import { getGoalsProgress } from "@/features/goals/queries";
import { listNotes } from "@/features/notes/queries";
import { ReviewList } from "@/features/reviews/components/review-list";
import { getUpcomingReviews } from "@/features/reviews/queries";
import { listSubjects } from "@/features/subjects/queries";
import { DashboardStudyActions } from "@/features/timer/components/timer-widgets";
import { getProfile } from "@/lib/auth";
import { formatDuration, localDateISO, plural, relativeDay, shortDate } from "@/lib/format";
import { studyTypeLabel } from "@/lib/study-types";
import { greeting, longDate } from "@/lib/time";

export const metadata: Metadata = { title: "Painel" };

export default function DashboardPage({ searchParams }: PageProps<"/painel">) {
  return (
    <Page className="relative isolate">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/painel">["searchParams"] }) {
  const sp = await searchParams;
  const period = (DASHBOARD_PERIODS.find((p) => p.value === sp.periodo)?.value ?? "7") as DashboardPeriod;
  const profile = await getProfile();
  const tz = profile.timezone;
  const now = new Date();
  const today = localDateISO(tz, now);
  const range = statsRange(period, today, profile.week_starts_on);

  const qFrom = addDays(today, -6);
  const [subjects, rows, streak, allTime, recent, notes, upcoming, focus, qRows] = await Promise.all([
    listSubjects(),
    getStatRows(range.from, range.to),
    getStreak(),
    getAllTimeTotals(),
    getRecentSessions(5),
    listNotes({}, 4),
    getUpcomingReviews(today, 5),
    getStudyFocus(),
    getQuestionDaily(qFrom, today),
  ]);
  const banner = readBanner(profile);
  const bannerSrc = banner.style === "custom" ? await bannerUrl(banner.path) : null;
  const cmp = compareWithPrevious(rows, { today, weekStartsOn: profile.week_starts_on });
  const d = aggregateDashboard(rows, { today, weekStartsOn: profile.week_starts_on, period });
  const goals = await getGoalsProgress({
    today,
    weekStartsOn: profile.week_starts_on,
    subjectOrder: subjects.map((s) => s.id),
    rows,
  });
  const dailyGoal = goals.find((g) => g.period === "daily" && g.metric === "minutes" && !g.subject_id);
  const activeList = subjects
    .filter((s) => !s.archived_at)
    .map((s) => ({ id: s.id, name: s.name, color: s.color }));
  const meta = Object.fromEntries(subjects.map((s) => [s.id, { name: s.name, color: s.color }]));
  const firstName = (profile.display_name || profile.email).split(" ")[0];
  const activeSubjects = activeList.length;
  const periodLabel = DASHBOARD_PERIODS.find((p) => p.value === period)!.label;
  const top = d.bySubject[0];

  const hero = (onImage: boolean) => (
    <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className={cn("text-[13px] first-letter:uppercase", onImage ? "text-fg-2" : "text-fg-3")}>
          {longDate(tz, now)}
        </p>
        <h1 className="font-display mt-2 text-[34px] leading-[1.02] font-semibold tracking-[-0.02em] text-fg sm:text-[48px]">
          {greeting(tz, now)}, {firstName}.
        </h1>
        <div className="mt-4">
          <FocusChip title={focus.title} onImage={onImage} />
        </div>
      </div>
      {activeSubjects > 0 && <DashboardStudyActions onImage={onImage} />}
    </header>
  );

  return (
    <>
      <Suspense>
        <ShortcutAction />
      </Suspense>
      {banner.style === "none" ? (
        <>
          {/* Sem imagem: só um brilho discreto atrás da saudação. */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[380px] w-[100vw] -translate-x-1/2 bg-[radial-gradient(55%_70%_at_88%_0%,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_70%),radial-gradient(40%_60%_at_60%_0%,color-mix(in_oklab,var(--steel)_8%,transparent),transparent_70%)]"
          />
          <OrbitArcs className="pointer-events-none absolute -top-6 -left-4 -z-10 w-[280px] opacity-50 sm:w-[380px]" />
          {hero(false)}
        </>
      ) : (
        // Sempre escuro por cima da imagem, mesmo no tema claro, para o texto continuar legível.
        <section
          aria-label="Boas-vindas"
          data-banner={banner.style}
          className="dark relative -mx-4 -mt-6 overflow-hidden text-fg sm:mx-0 sm:mt-0 sm:rounded-3xl sm:border sm:border-white/[0.07]"
        >
          <BannerBackdrop
            style={banner.style}
            path={banner.path}
            src={bannerSrc}
            focusX={banner.focusX}
            focusY={banner.focusY}
            zoom={banner.zoom}
            overlay={banner.overlay}
          />
          {banner.style === "default" && (
            <OrbitArcs className="pointer-events-none absolute -top-2 -left-2 w-[260px] opacity-55 sm:w-[360px]" />
          )}
          <div className="relative flex min-h-[360px] flex-col justify-end px-4 pt-16 pb-6 sm:min-h-[300px] sm:px-8 sm:pt-20 sm:pb-8">
            {hero(true)}
          </div>
        </section>
      )}

      {activeSubjects === 0 && (
        <section className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-border bg-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">Cadastre suas matérias</h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-fg-2">
              Elas organizam sessões, metas, anotações e revisões.
            </p>
          </div>
          <Button asChild variant="primary" size="lg" className="shrink-0 rounded-xl">
            <Link href="/materias">Abrir matérias</Link>
          </Button>
        </section>
      )}

      <dl
        className="rise mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-card lg:grid-cols-4"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        <Stat icon={Clock3} label="Hoje" value={formatDuration(cmp.today.current)}>
          <Delta c={cmp.today} versus="ontem" absolute />
        </Stat>
        <Stat icon={CalendarRange} label="Esta semana" value={formatDuration(cmp.week.current)}>
          <Delta c={cmp.week} versus="semana passada" />
        </Stat>
        <Stat icon={ChartNoAxesColumn} label="Este mês" value={formatDuration(cmp.month.current)}>
          <Delta c={cmp.month} versus="mês passado" />
        </Stat>
        <Stat
          icon={Flame}
          iconClassName="text-gold"
          label="Sequência"
          value={plural(streak.current, "dia", "dias")}
        >
          <dd
            className="mt-3 flex items-center gap-1.5"
            aria-label={`Estudou em ${cmp.last7.filter((d) => d.studied).length} dos últimos 7 dias`}
          >
            {cmp.last7.map((day) => (
              <span
                key={day.day}
                title={`${shortDate(day.day)}: ${day.studied ? "estudou" : "sem estudo"}`}
                className={cn(
                  "size-2 rounded-full",
                  day.studied ? "bg-gold" : "bg-surface-3",
                  day.day === today && "ring-2 ring-gold/30",
                )}
              />
            ))}
          </dd>
          <dd className="mt-1.5 text-[12px] text-fg-3">
            {streak.best > 0 ? `Recorde: ${plural(streak.best, "dia", "dias")}` : "Estude hoje para começar"}
          </dd>
        </Stat>
      </dl>

      {/* Para hoje: o que fazer agora. Os cards somem sozinhos quando o recurso não está disponível. */}
      <section
        aria-labelledby="today-title"
        className="rise mt-10"
        style={{ "--i": 2 } as React.CSSProperties}
      >
        <h2 id="today-title" className="font-display text-[19px] font-semibold text-fg">
          Para hoje
        </h2>
        <div className="mt-4 grid gap-4 lg:has-[.mission-frame]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Suspense>
            <PlanCard />
          </Suspense>
          <div className="grid min-w-0 gap-4 sm:max-lg:grid-cols-2 lg:grid-rows-[auto_1fr]">
            <Suspense>
              <MemoryCard />
            </Suspense>
            <QuestionsTodayCard rows={qRows} today={today} from={qFrom} />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="progress-title"
        className="rise mt-12"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        <h2 id="progress-title" className="font-display text-[19px] font-semibold text-fg">
          Seu progresso
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card aria-labelledby="evolution-title">
            <CardHeader
              id="evolution-title"
              icon={ChartColumn}
              title="Sua evolução"
              action={<PeriodTabs value={period} defaultValue="7" />}
            />
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-fg-2 tabular-nums">
              <span>
                <span className="font-medium text-fg">{formatDuration(d.period.seconds)}</span> em{" "}
                {plural(d.period.sessions, "sessão", "sessões")}
              </span>
              <span>Média de {formatDuration(d.period.dailyAverage)} por dia</span>
              <span>
                {d.period.studiedDays} de {d.period.days} dias com estudo
              </span>
              {d.period.questions > 0 && <span>{plural(d.period.questions, "questão", "questões")}</span>}
              {d.granularity === "day" && dailyGoal && (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="w-4 border-t border-dashed border-success" />
                  Meta de {formatDuration(dailyGoal.target * 60)} por dia
                </span>
              )}
            </p>
            <div className="mt-5">
              <EvolutionChart
                buckets={d.buckets}
                subjects={meta}
                goalSeconds={d.granularity === "day" && dailyGoal ? dailyGoal.target * 60 : undefined}
                caption={`Horas estudadas por ${d.granularity === "day" ? "dia" : d.granularity === "week" ? "semana" : "mês"}, últimos ${periodLabel}`}
              />
            </div>
            <p className="mt-4 border-t border-border pt-3.5 text-[12.5px] text-fg-3 tabular-nums">
              Total acumulado:{" "}
              <span className="font-medium text-fg-2">{formatDuration(allTime.seconds)}</span> em{" "}
              {plural(allTime.sessions, "sessão", "sessões")}
            </p>
          </Card>
          <Card aria-labelledby="subjects-title">
            <CardHeader
              id="subjects-title"
              icon={Layers}
              title="Distribuição por matéria"
              sub={`Últimos ${periodLabel}`}
              action={
                <Link
                  href="/desempenho"
                  aria-label="Ver desempenho"
                  className="-mr-1.5 flex size-8 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  <ChevronRight className="size-[18px]" />
                </Link>
              }
            />
            {d.bySubject.length === 0 ? (
              <p className="mt-5 text-[13.5px] text-fg-2">Nenhum estudo registrado neste período.</p>
            ) : (
              <ul className="mt-5 flex flex-col gap-4">
                {d.bySubject.slice(0, 8).map((s) => (
                  <li key={s.subjectId}>
                    <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                      <Link
                        href={`/materias/${s.subjectId}`}
                        className="flex min-w-0 items-center gap-2.5 text-fg hover:underline hover:decoration-border-strong hover:underline-offset-[3px]"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: meta[s.subjectId]?.color }}
                        />
                        <span className="truncate">{meta[s.subjectId]?.name ?? "Matéria excluída"}</span>
                        {s === top && d.bySubject.length > 1 && (
                          <span className="hidden shrink-0 rounded-full bg-surface-2 px-2 py-px text-[11.5px] text-fg-2 sm:inline">
                            mais estudada
                          </span>
                        )}
                      </Link>
                      <span className="shrink-0 text-fg-2 tabular-nums">
                        {formatDuration(s.seconds)}
                        <span className="ml-2 inline-block w-9 text-right font-medium text-fg">
                          {Math.round(s.share * 100)}%
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-surface-3/70" aria-hidden>
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
          </Card>
        </div>
      </section>

      <section
        aria-labelledby="follow-title"
        className="rise mt-12"
        style={{ "--i": 4 } as React.CSSProperties}
      >
        <h2 id="follow-title" className="font-display text-[19px] font-semibold text-fg">
          Acompanhamento
        </h2>
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <Card aria-labelledby="reviews-title">
              <CardHeader
                id="reviews-title"
                icon={RefreshCcw}
                title="Próximas revisões"
                sub={
                  upcoming.overdue > 0 ? (
                    <Link href="/revisoes" className="text-warning hover:underline hover:underline-offset-2">
                      {plural(upcoming.overdue, "atrasada", "atrasadas")}
                    </Link>
                  ) : (
                    "Próximos 7 dias"
                  )
                }
                action={<CardLink href="/revisoes">Ver todas</CardLink>}
              />
              {upcoming.reviews.length === 0 ? (
                <p className="mt-4 text-[13.5px] leading-relaxed text-fg-2">
                  Nada para revisar nos próximos 7 dias. Agende revisões a partir de uma sessão, anotação ou
                  da página de revisões.
                </p>
              ) : (
                <div className="mt-2">
                  <ReviewList
                    reviews={upcoming.reviews}
                    subjects={subjects.map((s) => ({
                      id: s.id,
                      name: s.name,
                      color: s.color,
                      archived: Boolean(s.archived_at),
                    }))}
                    activeSubjects={activeList}
                    todayISO={today}
                    compact
                  />
                </div>
              )}
            </Card>
            <Card aria-labelledby="recent-title">
              <CardHeader
                id="recent-title"
                icon={History}
                title="Últimas sessões"
                action={<CardLink href="/sessoes">Ver todas</CardLink>}
              />
              {recent.length === 0 ? (
                <p className="mt-4 text-[13.5px] text-fg-2">
                  Use o cronômetro enquanto estuda ou registre uma sessão que já aconteceu.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border">
                  {recent.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-3">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
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
                        <span className="block text-[12px] text-fg-3">
                          {relativeDay(s.session_date, today)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <Card aria-labelledby="goals-title">
              <CardHeader
                id="goals-title"
                icon={Target}
                title="Metas"
                action={<CardLink href="/metas">{goals.length ? "Ver todas" : "Criar meta"}</CardLink>}
              />
              <div className="mt-2">
                <GoalList
                  goals={goals.slice(0, 4)}
                  subjects={activeList}
                  editable={false}
                  emptyText="Defina quanto quer estudar por dia, semana ou mês e acompanhe o progresso aqui."
                />
              </div>
            </Card>
            <Suspense>
              <LibraryCard />
            </Suspense>
            <Card aria-labelledby="notes-title">
              <CardHeader
                id="notes-title"
                icon={NotebookPen}
                title="Anotações recentes"
                action={
                  <CardLink href="/anotacoes">{notes.length ? "Ver todas" : "Ir para anotações"}</CardLink>
                }
              />
              {notes.length === 0 ? (
                <p className="mt-4 text-[13.5px] text-fg-2">
                  Resumos, dúvidas e pontos importantes aparecem aqui.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border">
                  {notes.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={`/anotacoes/${n.id}`}
                        className="-mx-2 block rounded-lg px-2 py-2.5 hover:bg-surface-2/60"
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className={`truncate text-[13.5px] ${n.title ? "text-fg" : "text-fg-3"}`}>
                            {n.title || "Sem título"}
                          </span>
                          <span className="shrink-0 text-[12px] text-fg-3">
                            {relativeDay(n.updated_at.slice(0, 10), today)}
                          </span>
                        </span>
                        {n.snippet && (
                          <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-fg-3">
                            {n.snippet}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}

function CardLink({ href, children }: { href: Route; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-mr-1 inline-flex items-center gap-0.5 rounded-md px-1 text-[13px] text-fg-2 transition-colors hover:text-fg"
    >
      {children}
      <ChevronRight className="size-4" />
    </Link>
  );
}

function Stat({
  icon: Icon,
  iconClassName,
  label,
  value,
  children,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 bg-surface-1 p-4 sm:px-6 sm:py-5">
      <dt className="flex items-center gap-2 text-[12.5px] text-fg-2">
        <Icon className={cn("size-4 shrink-0 text-fg-3", iconClassName)} strokeWidth={1.9} aria-hidden />
        {label}
      </dt>
      <dd className="num mt-2.5 text-[26px] leading-none font-semibold text-fg sm:text-[32px]">{value}</dd>
      {children}
    </div>
  );
}

/** Variação em relação ao período anterior equivalente. */
function Delta({ c, versus, absolute = false }: { c: Comparison; versus: string; absolute?: boolean }) {
  const diff = c.current - c.previous;
  if (c.current === 0 && c.previous === 0) {
    return <dd className="mt-3 text-[12px] text-fg-3">Sem estudo ainda</dd>;
  }
  const useAbs = absolute || c.previous === 0;
  const amount = useAbs
    ? formatDuration(Math.abs(diff))
    : `${Math.abs(Math.round((diff / c.previous) * 100))}%`;
  const same = useAbs ? Math.abs(diff) < 60 : amount === "0%";
  const Arrow = diff > 0 ? ArrowUp : ArrowDown;
  return (
    <dd className="mt-3 text-[12px] leading-snug">
      {same ? (
        <span className="text-fg-2">Igual</span>
      ) : (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 font-medium tabular-nums",
            diff > 0 ? "text-success" : "text-fg-2",
          )}
        >
          <Arrow className="size-3.5" strokeWidth={2.2} aria-hidden />
          <span className="sr-only">{diff > 0 ? "mais" : "menos"}</span>
          {diff > 0 ? "+" : "−"}
          {amount}
        </span>
      )}
      <span className="block text-fg-3">vs. {versus}</span>
    </dd>
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
