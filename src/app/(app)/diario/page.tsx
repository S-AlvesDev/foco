import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Page } from "@/components/layout/page";
import { DiaryDatePicker, DiaryEditor } from "@/features/diary/components/diary-editor";
import { listSessions } from "@/features/sessions/queries";
import { listSubjects } from "@/features/subjects/queries";
import { getProfile } from "@/lib/auth";
import { addDays, longDayLabel } from "@/lib/dates";
import { formatDuration, localDateISO, plural, relativeDay } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Diário" };

export default function DiaryPage({ searchParams }: PageProps<"/diario">) {
  return (
    <Page className="max-w-[1040px]">
      <Suspense fallback={<DiarySkeleton />}>
        <Diary searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Diary({ searchParams }: { searchParams: PageProps<"/diario">["searchParams"] }) {
  const sp = await searchParams;
  const profile = await getProfile();
  const today = localDateISO(profile.timezone, new Date());
  const raw = typeof sp.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : today;
  const date = raw > today ? today : raw;
  const supabase = await createClient();

  const [entry, recent, sessions, subjects] = await Promise.all([
    supabase
      .from("study_diaries")
      .select("studied, learned, difficulties")
      .eq("entry_date", date)
      .maybeSingle(),
    supabase
      .from("study_diaries")
      .select("entry_date, studied, learned, difficulties")
      .order("entry_date", { ascending: false })
      .limit(30),
    listSessions({ from: date, to: date }),
    listSubjects(),
  ]);
  const meta = new Map(subjects.map((s) => [s.id, s]));
  const bySubject = new Map<string, number>();
  for (const s of sessions)
    bySubject.set(s.subject_id, (bySubject.get(s.subject_id) ?? 0) + s.duration_seconds);
  const total = sessions.reduce((a, s) => a + s.duration_seconds, 0);
  const topics = [...new Set(sessions.map((s) => s.topic).filter(Boolean))];

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[20px] leading-tight font-semibold tracking-[-0.015em] text-fg sm:text-[22px]">
            Diário
          </h1>
          <p className="mt-1 text-[14px] text-fg-2 first-letter:uppercase">
            {date === today ? "Hoje, " : ""}
            {longDayLabel(date)}
          </p>
        </div>
        <nav aria-label="Navegar entre dias" className="flex items-center gap-1">
          <Link
            href={`/diario?data=${addDays(date, -1)}`}
            scroll={false}
            aria-label="Dia anterior"
            className="flex size-8 items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <DiaryDatePicker date={date} max={today} />
          {date < today ? (
            <Link
              href={`/diario?data=${addDays(date, 1)}`}
              scroll={false}
              aria-label="Próximo dia"
              className="flex size-8 items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className="flex size-8 items-center justify-center text-fg-3 opacity-40" aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
          {date !== today && (
            <Link
              href="/diario"
              scroll={false}
              className="flex h-8 items-center rounded-md px-2.5 text-[13px] text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg"
            >
              Hoje
            </Link>
          )}
        </nav>
      </div>

      <div className="grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <DiaryEditor
          key={date}
          date={date}
          initial={{
            studied: entry.data?.studied ?? "",
            learned: entry.data?.learned ?? "",
            difficulties: entry.data?.difficulties ?? "",
          }}
        />

        <aside className="flex flex-col gap-8" aria-label="Contexto do dia">
          <section aria-labelledby="day-sessions">
            <div className="flex items-baseline justify-between border-b border-border pb-2">
              <h2 id="day-sessions" className="text-[13px] font-semibold text-fg">
                Sessões do dia
              </h2>
              <span className="text-[12.5px] text-fg-2 tabular-nums">{formatDuration(total)}</span>
            </div>
            {sessions.length === 0 ? (
              <p className="mt-3 text-[13px] text-fg-2">Nenhuma sessão registrada neste dia.</p>
            ) : (
              <>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {[...bySubject.entries()].map(([id, secs]) => (
                    <li key={id} className="flex items-center gap-2 text-[13px]">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: meta.get(id)?.color }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-fg">
                        {meta.get(id)?.name ?? "Matéria"}
                      </span>
                      <span className="text-fg-2 tabular-nums">{formatDuration(secs)}</span>
                    </li>
                  ))}
                </ul>
                {topics.length > 0 && (
                  <p className="mt-3 text-[12.5px] leading-relaxed text-fg-3">
                    Assuntos: {topics.join(", ")}
                  </p>
                )}
              </>
            )}
          </section>

          <section aria-labelledby="recent-entries">
            <h2 id="recent-entries" className="border-b border-border pb-2 text-[13px] font-semibold text-fg">
              Entradas recentes
            </h2>
            {(recent.data ?? []).length === 0 ? (
              <p className="mt-3 text-[13px] text-fg-2">Suas entradas aparecem aqui.</p>
            ) : (
              <ul className="mt-1 divide-y divide-border">
                {(recent.data ?? []).map((e) => {
                  const text = (e.studied || e.learned || e.difficulties || "").replace(/\s+/g, " ");
                  return (
                    <li key={e.entry_date}>
                      <Link
                        href={`/diario?data=${e.entry_date}`}
                        scroll={false}
                        aria-current={e.entry_date === date ? "page" : undefined}
                        className="-mx-2 block rounded-md px-2 py-2 transition-colors hover:bg-surface-2/60 aria-[current=page]:bg-surface-2"
                      >
                        <span className="block text-[12.5px] text-fg-2 first-letter:uppercase">
                          {relativeDay(e.entry_date, today)}
                        </span>
                        <span className="line-clamp-2 block text-[13px] text-fg">{text}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {(recent.data ?? []).length > 0 && (
              <p className="mt-2 text-[12px] text-fg-3">
                {plural((recent.data ?? []).length, "entrada recente", "entradas recentes")}
              </p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function DiarySkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="text-[20px] leading-tight font-semibold tracking-[-0.015em] text-fg sm:text-[22px]">
        Diário
      </h1>
      <div className="mt-2.5 h-3 w-48 rounded bg-surface-2" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-8 h-28 max-w-[680px] rounded-lg bg-surface-2/50" />
      ))}
    </div>
  );
}
