import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, EyeOff } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Avatar } from "@/components/ui/avatar";
import { monthGrid, monthParam } from "@/features/calendar/grid";
import { PeriodTabs } from "@/features/dashboard/components/period-tabs";
import { goalTitle } from "@/features/goals/progress";
import { ChallengesSection } from "@/features/journey/components/challenges";
import { PairChart } from "@/features/journey/components/pair-chart";
import { JourneySetup, WaitingForPartner } from "@/features/journey/components/setup";
import { AchievementsList, PrivacySettings, SpaceMenu } from "@/features/journey/components/space-controls";
import { PERSON_COLORS, evolution, level, sumFor, windows } from "@/features/journey/model";
import {
  getAchievements,
  getChallenges,
  getCouple,
  getCoupleDaily,
  getCoupleGoals,
  getCoupleStreaks,
  getCoupleSubjects,
  type CoupleState,
} from "@/features/journey/queries";
import { getProfile } from "@/lib/auth";
import { avatarUrls } from "@/features/avatar/server";
import { WEEKDAYS_SHORT, addDays, addMonths, monthLabel, monthStartOf, weekStartOf } from "@/lib/dates";
import { formatDuration, localDateISO, plural, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Nossa Jornada" };

export default function JourneyPage({ searchParams }: PageProps<"/jornada">) {
  return (
    <Page>
      <Suspense fallback={<JourneySkeleton />}>
        <Journey searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Journey({ searchParams }: { searchParams: PageProps<"/jornada">["searchParams"] }) {
  const sp = await searchParams;
  const profile = await getProfile();
  const today = localDateISO(profile.timezone, new Date());
  const couple = await getCouple(profile.id);

  if (!couple) {
    return (
      <>
        <Title
          name="Nossa Jornada"
          sub="Um espaço para acompanhar os estudos de vocês dois, cada um com seus dados."
        />
        <div className="mb-10 max-w-[640px] text-[13.5px] leading-relaxed text-fg-2">
          <p>
            Ao conectar as contas, vocês veem as horas um do outro, comparam a evolução, criam metas conjuntas
            e desafios semanais e compartilham conquistas. Cada um decide o que mostra; anotações, diário e
            revisões continuam privados.
          </p>
        </div>
        <JourneySetup />
      </>
    );
  }

  if (!couple.partner) {
    const expires = couple.inviteExpiresAt ? new Date(couple.inviteExpiresAt) : null;
    const valid = expires && expires > new Date();
    return (
      <>
        <Title name={couple.name} sub="Falta só a outra pessoa entrar." />
        <WaitingForPartner
          code={valid ? couple.inviteCode : null}
          expiresLabel={valid ? shortDate(localDateISO(profile.timezone, expires!), today) : null}
        />
      </>
    );
  }

  return (
    <Together
      couple={couple as CoupleState & { partner: NonNullable<CoupleState["partner"]> }}
      sp={sp}
      today={today}
      weekStartsOn={profile.week_starts_on}
    />
  );
}

async function Together({
  couple,
  sp,
  today,
  weekStartsOn,
}: {
  couple: CoupleState & { partner: NonNullable<CoupleState["partner"]> };
  sp: Record<string, string | string[] | undefined>;
  today: string;
  weekStartsOn: number;
}) {
  const { me, partner } = couple;
  const view = sp.ver === "mes" ? "mes" : "semana";
  const minMonth = addMonths(monthStartOf(today), -11);
  const month = [monthParam(sp.mes, today), minMonth].sort()[1];
  const win = windows(view, today, weekStartsOn);
  const from = [
    addMonths(monthStartOf(today), -5),
    addDays(weekStartOf(today, weekStartsOn), -49),
    month,
    win.prevFrom,
  ].sort()[0];

  const [rows, streaks, subjects, goals, challenges, achievements, photos] = await Promise.all([
    getCoupleDaily(from, today),
    getCoupleStreaks(),
    getCoupleSubjects(win.from, win.to),
    getCoupleGoals(),
    getChallenges(addDays(today, -60)),
    getAchievements(),
    avatarUrls([me.avatarPath, partner.avatarPath]),
  ]);

  const partnerTime = partner.sharing.share_study_time;
  const ids = { me: me.id, partner: partnerTime ? partner.id : null };
  const firstMe = me.name.split(" ")[0];
  const firstPartner = partner.name.split(" ")[0];
  const people = [
    { m: me, label: "Você", color: PERSON_COLORS.me, shares: true },
    { m: partner, label: firstPartner, color: PERSON_COLORS.partner, shares: partnerTime },
  ];
  const bucketCaption =
    view === "semana" ? "Horas por semana, últimas 8 semanas" : "Horas por mês, últimos 6 meses";

  // Calendário compartilhado
  const grid = monthGrid(month, today, weekStartsOn);
  const byDay = new Map<string, { me: number; partner: number }>();
  for (const r of rows) {
    const v = byDay.get(r.day) ?? { me: 0, partner: 0 };
    if (r.user_id === me.id) v.me += r.seconds;
    else v.partner += r.seconds;
    byDay.set(r.day, v);
  }
  const prevMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);
  const monthQuery = (m: string) => {
    const q = new URLSearchParams();
    if (view === "mes") q.set("ver", "mes");
    if (m !== monthStartOf(today)) q.set("mes", m.slice(0, 7));
    return `/jornada${q.size ? `?${q}` : ""}#calendario`;
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex -space-x-2" aria-hidden>
            <Avatar name={me.name} size={32} src={me.avatarPath ? photos.get(me.avatarPath) : null} />
            <Avatar
              name={partner.name}
              size={32}
              src={partner.avatarPath ? photos.get(partner.avatarPath) : null}
            />
          </span>
          <div>
            <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
              {couple.name}
            </h1>
            <p className="mt-0.5 text-[13.5px] text-fg-2">
              {firstMe} e {firstPartner}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PeriodTabs
            value={view}
            param="ver"
            defaultValue="semana"
            options={[
              { value: "semana", label: "Semana" },
              { value: "mes", label: "Mês" },
            ]}
          />
          <SpaceMenu id={couple.id} name={couple.name} partnerName={firstPartner} />
        </div>
      </div>

      <section
        aria-label={view === "semana" ? "Esta semana" : "Este mês"}
        className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2"
      >
        {people.map(({ m, label, color, shares }) => {
          const cur = sumFor(rows, m.id, win.from, win.to);
          const prev = sumFor(rows, m.id, win.prevFrom, win.prevTo);
          const st = streaks.get(m.id);
          const diff = cur.seconds - prev.seconds;
          return (
            <div key={m.id} className="bg-bg px-5 py-4" aria-label={label}>
              <p className="flex items-center gap-2 text-[13px] text-fg-2">
                <span className="size-2.5 rounded-sm" style={{ background: color }} aria-hidden />
                {label}
                <span className="text-fg-3">· {view === "semana" ? "esta semana" : "este mês"}</span>
              </p>
              {shares ? (
                <>
                  <p className="mt-1.5 text-[24px] font-semibold tracking-[-0.02em] text-fg tabular-nums">
                    {formatDuration(cur.seconds)}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-fg-3 tabular-nums">
                    {plural(cur.sessions, "sessão", "sessões")} em {plural(cur.days, "dia", "dias")}
                    {" · "}
                    {diff === 0
                      ? `igual ${view === "semana" ? "à semana passada" : "ao mês passado"}`
                      : `${diff > 0 ? "+" : "−"}${formatDuration(Math.abs(diff))} vs ${view === "semana" ? "semana passada" : "mês passado"}`}
                  </p>
                  {st && (
                    <p className="mt-2 text-[12.5px] text-fg-2">
                      Sequência: {plural(st.current, "dia", "dias")}
                      <span className="text-fg-3"> · recorde {plural(st.best, "dia", "dias")}</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed text-fg-3">
                  <EyeOff className="mt-0.5 size-3.5 shrink-0" />
                  {firstPartner} não compartilha o tempo de estudo.
                </p>
              )}
            </div>
          );
        })}
      </section>

      <section aria-labelledby="evo-title" className="mt-10">
        <h2 id="evo-title" className="mb-3 text-[14px] font-semibold text-fg">
          Evolução {view === "semana" ? "semanal" : "mensal"}
        </h2>
        <PairChart
          buckets={evolution(view, rows, ids, today, weekStartsOn)}
          names={{ me: "Você", partner: firstPartner }}
          caption={bucketCaption}
        />
      </section>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <ChallengesSection
          challenges={challenges.map((c) => ({
            ...c,
            me: c.values.get(me.id) ?? 0,
            partner: partnerTime ? (c.values.get(partner.id) ?? 0) : null,
          }))}
          people={{ me: "Você", partner: firstPartner, partnerShares: partnerTime }}
          todayISO={today}
          weekStartsOn={weekStartsOn}
        />

        <section aria-labelledby="cal-title" id="calendario" className="scroll-mt-20">
          <div className="flex items-center justify-between gap-3">
            <h2 id="cal-title" className="text-[14px] font-semibold text-fg first-letter:uppercase">
              {monthLabel(month)}
            </h2>
            <nav aria-label="Navegar entre meses" className="flex items-center gap-1">
              {month > minMonth ? (
                <Link
                  href={monthQuery(prevMonth)}
                  scroll={false}
                  aria-label="Mês anterior"
                  className="flex size-8 items-center justify-center rounded-md text-fg-2 hover:bg-surface-2 hover:text-fg"
                >
                  <ChevronLeft className="size-4" />
                </Link>
              ) : (
                <span className="size-8" />
              )}
              {month < monthStartOf(today) ? (
                <Link
                  href={monthQuery(nextMonth)}
                  scroll={false}
                  aria-label="Próximo mês"
                  className="flex size-8 items-center justify-center rounded-md text-fg-2 hover:bg-surface-2 hover:text-fg"
                >
                  <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span className="size-8" />
              )}
            </nav>
          </div>
          {!partnerTime && (
            <p className="mt-1 text-[12.5px] text-fg-3">
              Só os seus dias aparecem: {firstPartner} não compartilha o tempo.
            </p>
          )}
          <div role="grid" aria-label={`Calendário compartilhado de ${monthLabel(month)}`} className="mt-3">
            <div role="row" className="grid grid-cols-7 gap-1 pb-1">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} role="columnheader" className="text-center text-[11px] text-fg-3">
                  {WEEKDAYS_SHORT[(weekStartsOn + i) % 7]}
                </span>
              ))}
            </div>
            {grid.map((week) => (
              <div role="row" key={week[0].date} className="grid grid-cols-7 gap-1 pb-1">
                {week.map((c) => {
                  const v = byDay.get(c.date) ?? { me: 0, partner: 0 };
                  const label = `${shortDate(c.date, today)}: você ${v.me ? formatDuration(v.me) : "não estudou"}${partnerTime ? `, ${firstPartner} ${v.partner ? formatDuration(v.partner) : "não estudou"}` : ""}`;
                  return (
                    <div
                      key={c.date}
                      role="gridcell"
                      aria-label={c.inMonth && !c.future ? label : undefined}
                      title={c.inMonth && !c.future ? label : undefined}
                      className={cn(
                        "flex h-12 flex-col justify-between rounded-md px-1.5 py-1",
                        c.inMonth ? "bg-surface-1" : "opacity-40",
                        c.today && "ring-1 ring-accent",
                        c.future && "bg-transparent",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[11px] tabular-nums",
                          c.today ? "font-semibold text-fg" : "text-fg-3",
                        )}
                      >
                        {Number(c.date.slice(8))}
                      </span>
                      {!c.future && (
                        <span className="flex h-4 items-end gap-[3px]" aria-hidden>
                          {[
                            { s: v.me, color: PERSON_COLORS.me },
                            ...(partnerTime ? [{ s: v.partner, color: PERSON_COLORS.partner }] : []),
                          ].map((b, i) => (
                            <span
                              key={i}
                              className="w-1.5 rounded-t-[2px]"
                              style={{ height: `${level(b.s) * 25}%`, background: b.color }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 text-[12px] text-fg-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: PERSON_COLORS.me }} aria-hidden />
              Você
            </span>
            {partnerTime && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-sm"
                  style={{ background: PERSON_COLORS.partner }}
                  aria-hidden
                />
                {firstPartner}
              </span>
            )}
            <span>Altura: até 30 min, 1h, 2h, mais</span>
          </p>
        </section>
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="subj-title">
          <h2 id="subj-title" className="text-[14px] font-semibold text-fg">
            Matérias {view === "semana" ? "desta semana" : "deste mês"}
          </h2>
          <div className="mt-3 grid gap-6 sm:grid-cols-2">
            {people.map(({ m, label }) => {
              const list = subjects.filter((s) => s.user_id === m.id);
              const shares = m.id === me.id || m.sharing.share_subject_breakdown;
              return (
                <div key={m.id}>
                  <h3 className="mb-1.5 text-[13px] font-medium text-fg-2">{label}</h3>
                  {!shares ? (
                    <p className="text-[13px] text-fg-3">Não compartilha as matérias.</p>
                  ) : list.length === 0 ? (
                    <p className="text-[13px] text-fg-3">Sem estudo no período.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {list.slice(0, 6).map((s) => (
                        <li key={s.name} className="flex items-center gap-2 text-[13px]">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: s.color }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate text-fg">{s.name}</span>
                          <span className="text-fg-2 tabular-nums">{formatDuration(s.seconds)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="pgoals-title">
          <h2 id="pgoals-title" className="text-[14px] font-semibold text-fg">
            Metas pessoais
          </h2>
          <div className="mt-3 grid gap-6 sm:grid-cols-2">
            {people.map(({ m, label, color }) => {
              const list = goals.filter((g) => g.user_id === m.id);
              const shares = m.id === me.id || m.sharing.share_goal_progress;
              return (
                <div key={m.id}>
                  <h3 className="mb-1.5 text-[13px] font-medium text-fg-2">{label}</h3>
                  {!shares ? (
                    <p className="text-[13px] text-fg-3">Não compartilha as metas.</p>
                  ) : list.length === 0 ? (
                    <p className="text-[13px] text-fg-3">
                      {m.id === me.id ? (
                        <>
                          Nenhuma meta ativa.{" "}
                          <Link href="/metas" className="text-fg-2 underline underline-offset-[3px]">
                            Criar meta
                          </Link>
                        </>
                      ) : (
                        "Nenhuma meta ativa."
                      )}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {list.map((g) => {
                        const ratio = Math.min(1, g.value / g.target);
                        return (
                          <li key={g.goal_id}>
                            <p className="text-[13px] text-fg">
                              {goalTitle({ metric: g.metric, target: g.target })}{" "}
                              <span className="text-fg-3">
                                {g.period === "daily"
                                  ? "hoje"
                                  : g.period === "weekly"
                                    ? "na semana"
                                    : "no mês"}
                                {g.has_subject ? ` em ${g.subject_name ?? "uma matéria"}` : ""}
                              </span>
                            </p>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${ratio * 100}%`,
                                  background: g.value >= g.target ? "var(--success)" : color,
                                }}
                              />
                            </div>
                            <p className="mt-0.5 text-[12px] text-fg-3 tabular-nums">
                              {Math.round((g.value / g.target) * 100)}%
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="ach-title">
          <h2 id="ach-title" className="mb-3 text-[14px] font-semibold text-fg">
            Conquistas
          </h2>
          <AchievementsList
            items={achievements}
            meId={me.id}
            partnerName={firstPartner}
            canShare
            todayISO={today}
          />
        </section>
        <PrivacySettings mine={me.sharing} partner={partner.sharing} partnerName={firstPartner} />
      </div>
    </>
  );
}

function Title({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
        {name}
      </h1>
      <p className="mt-1 text-[14px] text-fg-2">{sub}</p>
    </div>
  );
}

function JourneySkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
        Nossa Jornada
      </h1>
      <div className="mt-2.5 h-3 w-56 rounded bg-surface-2" />
      <div className="mt-8 h-[110px] rounded-lg bg-surface-2/60" />
      <div className="mt-10 h-[220px] rounded-lg bg-surface-2/40" />
    </div>
  );
}
