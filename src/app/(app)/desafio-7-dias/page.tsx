import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Lock, Medal } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/page";
import { Notice } from "@/components/ui/notice";
import { CAFE_PLAN_ID } from "@/features/cafe/days";
import { CHALLENGE_DAYS, CHALLENGE_PLAN_ID } from "@/features/challenge/days";
import { getTrackMarks } from "@/features/tracks/queries";
import { RestartChallenge, TaskCheck } from "@/features/tracks/components";
import { ProgressBar } from "@/features/library/components/parts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Desafio 7 dias" };

export default function ChallengePage() {
  return (
    <Page>
      <PageHeader
        title="Desafio 7 dias"
        description="Uma semana de arrancada para a PMPE: leitura, questões, lei seca e revisão, um dia de cada vez."
      />
      <Suspense fallback={<div aria-hidden className="h-64 animate-pulse rounded-2xl bg-surface-2/40" />}>
        <Challenge />
      </Suspense>
    </Page>
  );
}

async function Challenge() {
  const [ch, cafe] = await Promise.all([getTrackMarks(CHALLENGE_PLAN_ID), getTrackMarks(CAFE_PLAN_ID)]);
  const days = CHALLENGE_DAYS.map((d) => {
    const tasks = d.tasks.map((t, i) => ({
      ...t,
      i,
      done: t.cafe ? cafe.marks.has(`${t.cafe}:0`) : ch.marks.has(`${d.id}:${i}`),
    }));
    return {
      ...d,
      tasks,
      complete: tasks.every((t) => t.done),
      doneCount: tasks.filter((t) => t.done).length,
    };
  });
  const completeDays = days.filter((d) => d.complete).length;
  const firstOpen = days.findIndex((d) => !d.complete);
  const finished = firstOpen === -1;

  return (
    <div className="flex flex-col gap-7">
      {ch.missing && (
        <Notice tone="warning">
          Para guardar o progresso do desafio, rode a migração <strong>0013_study_plan.sql</strong> no SQL
          Editor do Supabase.
        </Notice>
      )}
      <section
        aria-labelledby="desafio-resumo"
        className="mission-frame flex flex-col gap-4 rounded-2xl p-5 shadow-card sm:flex-row sm:items-center sm:p-7"
      >
        <span
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-2xl",
            finished ? "bg-gold/15 text-gold" : "bg-accent-subtle text-accent",
          )}
        >
          <Medal className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="desafio-resumo" className="font-display text-[24px] leading-tight font-semibold text-fg">
            {finished
              ? "Desafio concluído. Medalha conquistada!"
              : `Dia ${firstOpen + 1}: ${days[firstOpen].title}`}
          </h2>
          <p className="mt-1 text-[13.5px] text-fg-2">
            {finished
              ? "Você completou os 7 dias. Siga o ritmo no plano de metas da PMPE."
              : `${completeDays} de 7 dias concluídos. O próximo dia abre quando você termina o atual.`}
          </p>
          <ProgressBar percent={Math.round((completeDays / 7) * 100)} className="mt-3 max-w-[360px]" />
        </div>
      </section>

      <ol className="flex flex-col gap-3">
        {days.map((d, idx) => {
          const locked = !finished && idx > firstOpen;
          const current = idx === firstOpen;
          return (
            <li
              key={d.id}
              className={cn(
                "rounded-2xl border bg-surface-1 p-4 sm:p-5",
                current ? "border-accent/50" : "border-border",
                locked && "opacity-60",
              )}
              aria-current={current ? "step" : undefined}
            >
              <div className="flex items-start gap-3">
                <span className="font-display w-14 shrink-0 text-[13px] font-semibold text-fg-3">
                  Dia {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15.5px] font-semibold text-fg">{d.title}</h3>
                  <p className="text-[13px] text-fg-2">{d.focus}</p>
                </div>
                <span className="shrink-0 text-[12.5px] text-fg-3 tabular-nums">
                  {locked ? (
                    <span className="inline-flex items-center gap-1">
                      <Lock className="size-3.5" aria-hidden />
                      Bloqueado
                    </span>
                  ) : (
                    `${d.doneCount}/${d.tasks.length}`
                  )}
                </span>
              </div>
              {!locked && (
                <ul className="mt-4 flex flex-col gap-2.5 sm:pl-[68px]">
                  {d.tasks.map((t) => (
                    <li key={t.i} className="flex items-start gap-3">
                      <span className="mt-0.5">
                        <TaskCheck
                          day={d.id}
                          item={t.i}
                          done={t.done}
                          disabled={!!t.cafe}
                          label={t.cafe ? `${t.label} (marca sozinha ao concluir a dose)` : t.label}
                        />
                      </span>
                      <span className="min-w-0 flex-1 text-[14px] leading-snug">
                        <span className={cn(t.done ? "text-fg-3 line-through" : "text-fg")}>{t.label}</span>
                        {t.cafe && !t.done && (
                          <span className="block text-[12px] text-fg-3">
                            Marca sozinha quando você concluir a dose.
                          </span>
                        )}
                      </span>
                      {t.href && (
                        <Link
                          href={t.href}
                          className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-accent hover:underline"
                        >
                          Abrir
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      {completeDays > 0 && (
        <div>
          <RestartChallenge />
        </div>
      )}
    </div>
  );
}
