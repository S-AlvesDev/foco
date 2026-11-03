import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { listSubjects } from "@/features/subjects/queries";
import { listSessions } from "@/features/sessions/queries";
import { DashboardStudyActions } from "@/features/timer/components/timer-widgets";
import { formatDuration, localDateISO, plural } from "@/lib/format";
import { getProfile } from "@/lib/auth";
import { clockTime, greeting, longDate, timeZoneName, timeZoneOffset } from "@/lib/time";

export const metadata: Metadata = { title: "Painel" };

export default function DashboardPage() {
  return (
    <Page>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </Page>
  );
}

async function Dashboard() {
  const [profile, subjects] = await Promise.all([getProfile(), listSubjects()]);
  const activeSubjects = subjects.filter((s) => !s.archived_at).length;
  const now = new Date();
  const tz = profile.timezone;
  const today = localDateISO(tz, now);
  const todaySessions = await listSessions({ from: today, to: today });
  const todaySeconds = todaySessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  const firstName = (profile.display_name || profile.email).split(" ")[0];
  const themeLabel = { dark: "Escuro", light: "Claro", system: "Do sistema" }[profile.theme];

  return (
    <>
      <header className="mb-10">
        <p className="text-[13px] text-fg-3 first-letter:uppercase">{longDate(tz, now)}</p>
        <h1 className="mt-1 text-[24px] leading-tight font-semibold tracking-[-0.02em] text-fg sm:text-[28px]">
          {greeting(tz, now)}, {firstName}.
        </h1>
        {activeSubjects > 0 && (
          <>
            <p className="mt-3 text-[15px] text-fg-2 tabular-nums">
              {todaySessions.length === 0 ? (
                "Nada registrado hoje ainda."
              ) : (
                <>
                  Hoje: <span className="font-medium text-fg">{formatDuration(todaySeconds)}</span> em{" "}
                  {plural(todaySessions.length, "sessão", "sessões")}.
                </>
              )}
            </p>
            <div className="mt-5">
              <DashboardStudyActions />
            </div>
          </>
        )}
      </header>

      {activeSubjects === 0 && (
        <section
          aria-labelledby="subjects-cta"
          className="mb-10 flex max-w-[560px] flex-col items-start gap-4 rounded-lg border border-border bg-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 id="subjects-cta" className="text-[14px] font-semibold text-fg">
              Cadastre suas matérias
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-2">
              Elas organizam sessões, metas, anotações e revisões.
            </p>
          </div>
          <Button asChild variant="primary" className="shrink-0">
            <Link href="/materias">Abrir matérias</Link>
          </Button>
        </section>
      )}

      <section aria-labelledby="setup-title" className="max-w-[560px]">
        <h2 id="setup-title" className="text-[14px] font-semibold text-fg">
          Confira antes de começar
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-2">
          Horas, sequências e metas são contadas no seu fuso horário. Um dia de estudo termina à meia-noite
          daqui.
        </p>

        <dl className="mt-5 divide-y divide-border border-y border-border">
          <Row label="Fuso horário">
            {timeZoneName(tz)}
            <span className="ml-2 text-[12.5px] text-fg-3 tabular-nums">{timeZoneOffset(tz, now)}</span>
          </Row>
          <Row label="Agora">
            <span className="tabular-nums">{clockTime(tz, now)}</span>
          </Row>
          <Row label="Semana começa">{profile.week_starts_on === 0 ? "Domingo" : "Segunda-feira"}</Row>
          <Row label="Tema">{themeLabel}</Row>
          {activeSubjects > 0 && (
            <Row label="Matérias ativas">
              <Link
                href="/materias"
                className="underline decoration-border-strong underline-offset-[3px] hover:decoration-fg-2"
              >
                {activeSubjects}
              </Link>
            </Row>
          )}
        </dl>

        <Button asChild variant="secondary" className="mt-5">
          <Link href="/configuracoes">Ajustar configurações</Link>
        </Button>
      </section>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 text-[13.5px]">
      <dt className="text-fg-2">{label}</dt>
      <dd className="text-right text-fg">{children}</dd>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-3 w-40 rounded bg-surface-2" />
      <div className="mt-3 h-7 w-64 rounded bg-surface-2" />
      <div className="mt-12 h-3.5 w-48 rounded bg-surface-2" />
      <div className="mt-6 h-40 max-w-[560px] rounded-lg bg-surface-2/60" />
    </div>
  );
}
