import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { plural, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { topicLabel } from "@/features/library/model";
import { memoryGate } from "@/features/memory/components/gate";
import { LEVEL_DOT } from "@/features/memory/components/level-badge";
import { MemorySettingsForm } from "@/features/memory/components/settings-form";
import { GRADE_LABELS, LEVEL_HINTS, LEVEL_LABELS, LEVELS, type Grade } from "@/features/memory/fsrs";
import { getMemorySettings, getMemoryStats } from "@/features/memory/queries";

export const metadata: Metadata = { title: "Desempenho nas revisões" };

export default function StatsPage() {
  return (
    <Page>
      <Suspense fallback={<Skeleton />}>
        <Stats />
      </Suspense>
    </Page>
  );
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const SOURCE: Record<string, string> = {
  self: "autoavaliação",
  questions: "questões",
  both: "autoavaliação e questões",
  practice: "questões avulsas",
};

async function Stats() {
  const header = (
    <PageHeader
      title="Desempenho nas revisões"
      description="Quanto você está lembrando de verdade, mês a mês, e os ajustes da revisão adaptativa."
      actions={
        <Button asChild variant="ghost">
          <Link href="/revisoes/hoje">
            <ArrowLeft />
            Revisões de hoje
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
  const [s, settings] = await Promise.all([getMemoryStats(6), getMemorySettings()]);
  const real30 = s.last30.reviews ? s.last30.retained / s.last30.reviews : null;
  const levelTotal = LEVELS.reduce((n, l) => n + s.levels[l], 0);

  return (
    <>
      {header}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Retenção real · 30 dias"
          value={real30 == null ? "—" : `${Math.round(real30 * 100)}%`}
          sub={
            real30 == null
              ? "Sem revisões no período"
              : `${s.last30.retained} de ${s.last30.reviews} revisões lembradas · meta ${Math.round(settings.targetRetention * 100)}%`
          }
        />
        <Stat
          label="Tópicos nas revisões"
          value={String(s.totalItems)}
          sub={`${s.levels.dominado} dominados`}
        />
        <Stat
          label="Sem questões ligadas"
          value={String(s.withoutQuestions)}
          sub="Nesses, a nota vem só da autoavaliação"
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section
          aria-labelledby="ret"
          className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-5"
        >
          <h2 id="ret" className="text-[14.5px] font-semibold text-fg">
            Retenção real por mês
          </h2>
          <p className="mt-0.5 text-[12.5px] text-fg-3">
            Revisões em que você não esqueceu. Abaixo da meta, os intervalos encurtam; muito acima, alongam.
          </p>
          <MonthChart months={s.months} target={settings.targetRetention} />
          <p className="mt-3 text-[12px] text-fg-3">
            Ajuste automático dos intervalos:{" "}
            {settings.intervalFactor === 1
              ? "nenhum ainda"
              : `${Math.round(settings.intervalFactor * 100)}% do padrão`}
            {settings.calibratedAt
              ? ` · última calibração ${shortDate(settings.calibratedAt.slice(0, 10), s.today)}`
              : ""}
          </p>
        </section>

        <section
          aria-labelledby="lv"
          className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-5"
        >
          <h2 id="lv" className="text-[14.5px] font-semibold text-fg">
            Domínio dos tópicos
          </h2>
          {levelTotal ? (
            <>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                {LEVELS.filter((l) => s.levels[l]).map((l) => (
                  <span
                    key={l}
                    className={cn("h-full", LEVEL_DOT[l])}
                    style={{ width: `${(s.levels[l] / levelTotal) * 100}%` }}
                  />
                ))}
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {LEVELS.map((l) => (
                  <li key={l} className="flex items-start gap-2.5">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", LEVEL_DOT[l])} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2 text-[13.5px] text-fg">
                        <span>{LEVEL_LABELS[l]}</span>
                        <span className="font-semibold tabular-nums">{s.levels[l]}</span>
                      </span>
                      <span className="block text-[12px] leading-snug text-fg-3">{LEVEL_HINTS[l]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-[13.5px] text-fg-2">Conclua tópicos na Biblioteca para começar.</p>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.3fr]">
        <section
          aria-labelledby="aj"
          className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-5"
        >
          <h2 id="aj" className="mb-4 text-[14.5px] font-semibold text-fg">
            Ajustes
          </h2>
          <MemorySettingsForm
            target={settings.targetRetention}
            dailyMinutes={settings.dailyMinutes}
            examDate={settings.examDate}
            minDate={s.today}
          />
        </section>

        <section
          aria-labelledby="hist"
          className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-5"
        >
          <h2 id="hist" className="text-[14.5px] font-semibold text-fg">
            Histórico
          </h2>
          {s.history.length ? (
            <ul className="mt-2 flex flex-col divide-y divide-border">
              {s.history.map((h) => (
                <li key={h.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/biblioteca/${encodeURIComponent(h.disciplineId)}/${encodeURIComponent(h.topicId)}`}
                      className="min-w-0 truncate text-[14px] text-fg hover:underline"
                    >
                      {topicLabel({ number: h.topicNumber, title: h.topicTitle })}
                    </Link>
                    <span
                      className={cn(
                        "shrink-0 text-[12.5px] font-semibold",
                        h.grade === 1 ? "text-danger" : h.grade === 2 ? "text-warning" : "text-fg-2",
                      )}
                    >
                      {GRADE_LABELS[h.grade as Grade]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-fg-3">
                    {shortDate(h.reviewedOn, s.today)} · {h.disciplineName} · {SOURCE[h.source] ?? h.source}
                    {h.questionsTotal > 0 && ` · ${h.questionsCorrect}/${h.questionsTotal} questões`}
                    {h.minutes != null && ` · ${h.minutes} min`} · próxima em{" "}
                    {plural(h.scheduledDays, "dia", "dias")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13.5px] text-fg-2">Nenhuma revisão registrada ainda.</p>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card">
      <p className="text-[12.5px] text-fg-3">{label}</p>
      <p className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-fg tabular-nums">{value}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-fg-3">{sub}</p>
    </div>
  );
}

function MonthChart({
  months,
  target,
}: {
  months: { month: string; reviews: number; real: number | null; target: number | null }[];
  target: number;
}) {
  const H = 120;
  const lo = 0.5; // eixo de 50% a 100%: abaixo disso tudo é "muito abaixo"
  const y = (v: number) => ((Math.max(lo, v) - lo) / (1 - lo)) * H;
  return (
    <figure className="mt-5">
      <div
        className="relative"
        style={{ height: H }}
        role="img"
        aria-label="Retenção real por mês comparada com a meta"
      >
        {[0.6, 0.8, 1].map((g) => (
          <div
            key={g}
            className="absolute inset-x-0 border-t border-border"
            style={{ bottom: y(g) }}
            aria-hidden
          >
            <span className="absolute -top-2 -left-0.5 -translate-x-full pr-1 text-[10.5px] text-fg-3">
              {Math.round(g * 100)}%
            </span>
          </div>
        ))}
        <div
          className="absolute inset-x-0 border-t-2 border-dashed border-accent/70"
          style={{ bottom: y(target) }}
          aria-hidden
        >
          <span className="absolute -top-4 right-0 text-[11px] text-accent">
            meta {Math.round(target * 100)}%
          </span>
        </div>
        <div className="absolute inset-0 ml-1 flex items-end gap-3 pl-6">
          {months.map((m) => (
            <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              {m.real != null && (
                <span className="mb-1 text-[11.5px] font-semibold text-fg tabular-nums">
                  {Math.round(m.real * 100)}%
                </span>
              )}
              <div
                className={cn(
                  "w-full max-w-[36px] rounded-t-[4px]",
                  m.real == null ? "" : m.real < target - 0.05 ? "bg-warning/80" : "bg-steel/60",
                )}
                style={{ height: m.real == null ? 0 : Math.max(3, y(m.real)) }}
                title={
                  m.real == null ? "Sem revisões" : `${Math.round(m.real * 100)}% em ${m.reviews} revisões`
                }
              />
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-1.5 ml-1 flex gap-3 pl-6">
        {months.map((m) => (
          <span key={m.month} className="min-w-0 flex-1 text-center text-[11.5px] text-fg-3">
            {MONTHS[Number(m.month.slice(5, 7)) - 1]}
            <span className="block text-[10.5px]">{m.reviews ? m.reviews : "—"}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
        Desempenho nas revisões
      </h1>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface-2/60" />
        ))}
      </div>
      <div className="mt-4 h-64 rounded-2xl bg-surface-2/40" />
    </div>
  );
}
