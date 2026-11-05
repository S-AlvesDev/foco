import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { getStatRows } from "@/features/dashboard/queries";
import { EvolutionChart } from "@/features/dashboard/components/evolution-chart";
import { PeriodTabs } from "@/features/dashboard/components/period-tabs";
import { goalAmount, goalTitle, PERIOD_LABEL } from "@/features/goals/progress";
import {
  PERFORMANCE_PERIODS,
  bySubject,
  byType,
  cumulative,
  delta,
  frequency,
  goalHistory,
  goalHistoryStart,
  monthlyBuckets,
  performanceRange,
  summarize,
  weeklyBuckets,
  type PerformancePeriod,
} from "@/features/performance/compute";
import { CumulativeChart } from "@/features/performance/components/cumulative-chart";
import {
  getBreakdown,
  getDailyTotals,
  getGoalsWithCreation,
  getMonthlyTotals,
} from "@/features/performance/queries";
import { listSubjects } from "@/features/subjects/queries";
import { AchievementsList } from "@/features/journey/components/space-controls";
import { getAchievements } from "@/features/journey/queries";
import { getProfile } from "@/lib/auth";
import { QuestionPerformance } from "@/features/questions/components/question-insights";
import { getQuestionDaily } from "@/features/questions/queries";
import { MONTHS_LONG } from "@/lib/dates";
import { formatDuration, localDateISO, plural, shortDate } from "@/lib/format";
import { studyTypeLabel } from "@/lib/study-types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Desempenho" };

export default function PerformancePage({ searchParams }: PageProps<"/desempenho">) {
  return (
    <Page className="max-w-[1040px]">
      <Suspense fallback={<PerformanceSkeleton />}>
        <Performance searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

/** Cores dos tipos de estudo, em ordem fixa por participação (tons bem distintos entre si). */
const TYPE_COLORS = ["var(--accent)", "#3FB6A8", "#E2A33D", "#D9739B", "#8A8F98"];

async function Performance({ searchParams }: { searchParams: PageProps<"/desempenho">["searchParams"] }) {
  const sp = await searchParams;
  const period = (PERFORMANCE_PERIODS.find((p) => p.value === sp.periodo)?.value ??
    "90") as PerformancePeriod;
  const profile = await getProfile();
  const today = localDateISO(profile.timezone, new Date());
  const wso = profile.week_starts_on;
  const r = performanceRange(period, today);
  const goalsFrom = goalHistoryStart(today, wso);

  const [subjects, daily, cur, prev, monthly, goals, goalRows, achievements, qRows] = await Promise.all([
    listSubjects(),
    getDailyTotals(r.prevFrom, r.to),
    getBreakdown(r.from, r.to),
    getBreakdown(r.prevFrom, r.prevTo),
    getMonthlyTotals(),
    getGoalsWithCreation(profile.timezone),
    getStatRows(goalsFrom, today),
    getAchievements(),
    getQuestionDaily(r.prevFrom, r.to),
  ]);

  const periodLabel = PERFORMANCE_PERIODS.find((p) => p.value === period)!.label;
  const questions = (
    <QuestionPerformance
      rows={qRows.filter((q) => q.day >= r.from)}
      prevRows={qRows.filter((q) => q.day < r.from)}
      from={r.from}
      to={r.to}
      today={today}
      periodLabel={periodLabel}
    />
  );
  const meta = new Map(subjects.map((s) => [s.id, s]));

  if (monthly.length === 0) {
    return (
      <>
        <Header period={period} />
        <div className="rounded-lg border border-dashed border-border-strong px-6 py-12 text-center">
          <p className="text-[14px] font-medium text-fg">Ainda não há sessões para analisar</p>
          <p className="mx-auto mt-1.5 max-w-[440px] text-[13.5px] leading-relaxed text-fg-2">
            Registre suas sessões de estudo e aqui aparecem horas por matéria, por semana e por mês, a
            frequência e a comparação entre períodos.
          </p>
          <Button asChild variant="secondary" className="mt-5">
            <Link href="/sessoes">Ir para sessões</Link>
          </Button>
        </div>
        {qRows.length > 0 && questions}
      </>
    );
  }

  const now = summarize(daily, r.from, r.to);
  const before = summarize(daily, r.prevFrom, r.prevTo);
  const weeks = weeklyBuckets(daily, r.from, today, wso);
  const months = monthlyBuckets(monthly, today);
  const cum = cumulative(monthly, today);
  const subj = bySubject(cur, prev);
  const types = byType(cur, prev);
  const freq = frequency(daily, r.from, r.to, wso);
  const history = goalHistory(goals, goalRows, today, wso);
  const firstMonth = cum[0]?.month;
  const allTime = cum.at(-1)?.total ?? 0;

  return (
    <>
      <Header period={period} />

      <section aria-labelledby="compare-title">
        <h2 id="compare-title" className="sr-only">
          Comparação com o período anterior
        </h2>
        <p className="mb-3 text-[13px] text-fg-3">
          Últimos {periodLabel} ({shortDate(r.from, today)} a {shortDate(r.to, today)}) comparados com os{" "}
          {periodLabel} anteriores.
        </p>
        <dl
          className={cn(
            "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border",
            now.questions > 0 || before.questions > 0 ? "lg:grid-cols-3" : "lg:grid-cols-4",
          )}
        >
          <Compare
            label="Tempo total"
            value={formatDuration(now.seconds)}
            prev={formatDuration(before.seconds)}
            d={delta(now.seconds, before.seconds)}
          />
          <Compare
            label="Sessões"
            value={String(now.sessions)}
            prev={String(before.sessions)}
            d={delta(now.sessions, before.sessions)}
          />
          <Compare
            label="Dias com estudo"
            value={`${now.studyDays} de ${now.days}`}
            prev={String(before.studyDays)}
            d={delta(now.studyDays, before.studyDays)}
          />
          <Compare
            label="Média por dia estudado"
            value={formatDuration(Math.round(now.perStudyDay))}
            prev={formatDuration(Math.round(before.perStudyDay))}
            d={delta(now.perStudyDay, before.perStudyDay)}
          />
          {(now.questions > 0 || before.questions > 0) && (
            <>
              <Compare
                label="Questões"
                value={now.questions.toLocaleString("pt-BR")}
                prev={before.questions.toLocaleString("pt-BR")}
                d={delta(now.questions, before.questions)}
              />
              <Compare
                label="Acerto"
                value={now.accuracy === null ? "—" : `${Math.round(now.accuracy)}%`}
                prev={before.accuracy === null ? "—" : `${Math.round(before.accuracy)}%`}
                d={
                  now.accuracy !== null && before.accuracy !== null
                    ? (now.accuracy - before.accuracy) / 100
                    : undefined
                }
                points
              />
            </>
          )}
        </dl>
      </section>

      {questions}

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <ChartSection id="weeks" title="Horas por semana" aside={`Últimos ${periodLabel}`}>
          <EvolutionChart
            buckets={weeks}
            subjects={{}}
            caption={`Horas por semana, últimos ${periodLabel}`}
          />
        </ChartSection>
        <ChartSection id="months" title="Horas por mês" aside="Últimos 12 meses">
          <EvolutionChart buckets={months} subjects={{}} caption="Horas por mês, últimos 12 meses" />
        </ChartSection>
      </div>

      <ChartSection
        id="history"
        title="Evolução histórica"
        aside={
          firstMonth
            ? `${formatDuration(allTime)} desde ${MONTHS_LONG[Number(firstMonth.slice(5, 7)) - 1]} de ${firstMonth.slice(0, 4)}`
            : undefined
        }
        className="mt-12"
      >
        <CumulativeChart points={cum} caption="Total de horas acumulado mês a mês" />
      </ChartSection>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="subjects-title">
          <SectionHead id="subjects-title" title="Horas por matéria" aside="vs período anterior" />
          <ul className="mt-3 flex flex-col gap-4">
            {subj.slice(0, 10).map((s) => {
              const m = meta.get(s.subjectId);
              const d = delta(s.seconds, s.previous);
              return (
                <li key={s.subjectId}>
                  <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                    <span className="flex min-w-0 items-center gap-2 text-fg">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: m?.color }}
                        aria-hidden
                      />
                      <span className="truncate">{m?.name ?? "Matéria excluída"}</span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      <span className="text-fg">{formatDuration(s.seconds)}</span>
                      <DeltaPill d={d} />
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-surface-2" aria-hidden>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.seconds ? Math.max(s.share * 100, 1.5) : 0}%`,
                        background: m?.color,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[12px] text-fg-3 tabular-nums">
                    {Math.round(s.share * 100)}% do tempo · {plural(s.sessions, "sessão", "sessões")}
                    {s.questions > 0 &&
                      ` · ${plural(s.questions, "questão", "questões")}${s.correct > 0 ? `, ${Math.round((s.correct / s.questions) * 100)}% de acerto` : ""}`}
                    {s.previous > 0 && ` · antes ${formatDuration(s.previous)}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="types-title">
          <SectionHead id="types-title" title="Por tipo de estudo" aside={`Últimos ${periodLabel}`} />
          {types.length === 0 ? (
            <p className="mt-3 text-[13.5px] text-fg-2">Nenhum estudo neste período.</p>
          ) : (
            <>
              <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden>
                {types.map((t, i) => (
                  <div
                    key={t.type}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${t.share * 100}%`, background: TYPE_COLORS[i % TYPE_COLORS.length] }}
                  />
                ))}
              </div>
              <ul className="mt-4 divide-y divide-border">
                {types.map((t, i) => {
                  const pp = Math.round((t.share - t.previousShare) * 100);
                  return (
                    <li key={t.type} className="flex items-center gap-3 py-2.5 text-[13.5px]">
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 text-fg">{studyTypeLabel(t.type)}</span>
                      <span className="text-fg tabular-nums">{formatDuration(t.seconds)}</span>
                      <span className="w-10 text-right text-fg-2 tabular-nums">
                        {Math.round(t.share * 100)}%
                      </span>
                      <span className="w-16 text-right text-[12px] text-fg-3 tabular-nums">
                        {pp === 0 ? "igual" : `${pp > 0 ? "+" : "−"}${Math.abs(pp)} p.p.`}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[12px] text-fg-3">
                p.p.: variação da participação em relação ao período anterior.
              </p>
            </>
          )}
        </section>
      </div>

      <section aria-labelledby="freq-title" className="mt-12">
        <SectionHead id="freq-title" title="Frequência" aside={`Últimos ${periodLabel}`} />
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-4">
          <Fact
            label="Dias com estudo"
            value={`${freq.studyDays} de ${freq.days} (${Math.round((freq.studyDays / freq.days) * 100)}%)`}
          />
          <Fact label="Maior sequência" value={plural(freq.longestStreak, "dia", "dias")} />
          <Fact label="Maior pausa" value={plural(freq.longestGap, "dia", "dias")} />
          <Fact
            label="Melhor dia"
            value={
              freq.bestDay
                ? `${formatDuration(freq.bestDay.seconds)} em ${shortDate(freq.bestDay.day, today)}`
                : "—"
            }
          />
        </dl>
        <div className="mt-6">
          <p className="mb-2 text-[12.5px] text-fg-3">Média de estudo por dia da semana</p>
          <EvolutionChart
            buckets={freq.weekdays}
            subjects={{}}
            caption="Média de tempo de estudo por dia da semana"
          />
        </div>
      </section>

      <section aria-labelledby="goals-title" className="mt-12">
        <SectionHead
          id="goals-title"
          title="Progresso das metas"
          aside={
            <Link href="/metas" className="text-[13px] text-fg-2 transition-colors hover:text-fg">
              {history.length ? "Abrir metas" : "Criar meta"}
            </Link>
          }
        />
        {history.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-fg-2">
            Com metas ativas, aqui aparece quantas vezes você cumpriu cada uma nos últimos dias, semanas ou
            meses.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {history.map((g) => {
              const unit =
                g.period === "daily"
                  ? ["dia", "dias"]
                  : g.period === "weekly"
                    ? ["semana", "semanas"]
                    : ["mês", "meses"];
              const n = g.windows.length;
              return (
                <li key={g.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:gap-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] text-fg">
                      {goalTitle(g)}
                      <span className="text-fg-3">
                        {" "}
                        {g.period === "daily" ? "por dia" : g.period === "weekly" ? "por semana" : "por mês"}
                        {g.subject_id ? ` em ${meta.get(g.subject_id)?.name ?? "uma matéria"}` : ""}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-fg-2 tabular-nums">
                      {n === 0
                        ? `${PERIOD_LABEL[g.period]}, criada recentemente: ainda sem ${unit[1]} completos.`
                        : `Cumprida em ${g.hits} de ${n === 1 ? `1 ${unit[0]}` : `${n} ${unit[1]}`} (${Math.round((g.hits / n) * 100)}%)`}
                    </p>
                  </div>
                  {n > 0 && (
                    <ol
                      className="flex flex-wrap gap-[3px]"
                      aria-label="Janelas anteriores, da mais antiga para a mais recente"
                    >
                      {g.windows.map((w) => (
                        <li
                          key={w.from}
                          title={`${shortDate(w.from, today)}${w.from !== w.to ? ` a ${shortDate(w.to, today)}` : ""}: ${goalAmount({ ...g, value: w.value })}`}
                          className={cn(
                            "size-2.5 rounded-[3px]",
                            w.hit ? "bg-success" : "border border-border-strong",
                          )}
                        >
                          <span className="sr-only">
                            {shortDate(w.from, today)}: {w.hit ? "cumprida" : "não cumprida"}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="ach-title" className="mt-12">
        <SectionHead
          id="ach-title"
          title="Conquistas"
          aside={
            <Link href="/jornada" className="text-[13px] text-fg-2 transition-colors hover:text-fg">
              Compartilhar em Nossa Jornada
            </Link>
          }
        />
        <div className="mt-2">
          <AchievementsList
            items={achievements.filter((a) => a.user_id === profile.id)}
            meId={profile.id}
            canShare={false}
            todayISO={today}
          />
        </div>
      </section>
    </>
  );
}

function Header({ period }: { period: PerformancePeriod }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
          Desempenho
        </h1>
        <p className="mt-1 text-[14px] text-fg-2">Como seus estudos evoluem ao longo do tempo.</p>
      </div>
      <PeriodTabs
        value={period}
        options={PERFORMANCE_PERIODS.map((p) => ({ value: p.value, label: p.label }))}
        defaultValue="90"
      />
    </div>
  );
}

function SectionHead({ id, title, aside }: { id: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-[14px] font-semibold text-fg">
        {title}
      </h2>
      {typeof aside === "string" ? <span className="text-[12.5px] text-fg-3">{aside}</span> : aside}
    </div>
  );
}

function ChartSection({
  id,
  title,
  aside,
  children,
  className,
}: {
  id: string;
  title: string;
  aside?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={className}>
      <SectionHead id={`${id}-title`} title={title} aside={aside} />
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DeltaPill({ d, points = false }: { d: number | null | undefined; points?: boolean }) {
  if (d === undefined) return null;
  if (d === null) return <span className="text-[12px] text-fg-3">novo</span>;
  const pct = Math.round(d * 100);
  if (pct === 0) return <span className="text-[12px] text-fg-3">igual</span>;
  const up = pct > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center text-[12px] font-medium tabular-nums",
        up ? "text-success" : "text-danger",
      )}
    >
      {up ? (
        <ArrowUpRight className="size-3.5" aria-hidden />
      ) : (
        <ArrowDownRight className="size-3.5" aria-hidden />
      )}
      <span className="sr-only">{up ? "aumento de" : "queda de"} </span>
      {Math.abs(pct)}
      {points ? " p.p." : "%"}
    </span>
  );
}

function Compare({
  label,
  value,
  prev,
  d,
  points,
}: {
  label: string;
  value: string;
  prev: string;
  d: number | null | undefined;
  points?: boolean;
}) {
  return (
    <div className="bg-bg px-4 py-3.5">
      <dt className="text-[12.5px] text-fg-3">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className="text-[20px] font-semibold tracking-[-0.015em] text-fg tabular-nums">{value}</span>
        <DeltaPill d={d} points={points} />
      </dd>
      <dd className="mt-0.5 text-[12px] text-fg-3 tabular-nums">Antes: {prev}</dd>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-fg-3">{label}</dt>
      <dd className="mt-0.5 text-[14px] text-fg tabular-nums">{value}</dd>
    </div>
  );
}

function PerformanceSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
        Desempenho
      </h1>
      <div className="mt-2.5 h-3 w-64 rounded bg-surface-2" />
      <div className="mt-8 h-[90px] rounded-lg bg-surface-2/60" />
      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <div className="h-[220px] rounded-lg bg-surface-2/40" />
        <div className="h-[220px] rounded-lg bg-surface-2/40" />
      </div>
    </div>
  );
}
