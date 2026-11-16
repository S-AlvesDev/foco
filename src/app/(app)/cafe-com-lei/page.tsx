import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CircleCheck, Coffee, Flame, Shuffle } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { CAFE_DAYS, CAFE_PLAN_ID } from "@/features/cafe/days";
import { getTrackMarks, streakOf } from "@/features/tracks/queries";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Café com Lei" };

export default function CafePage({ searchParams }: PageProps<"/cafe-com-lei">) {
  return (
    <Page>
      <PageHeader
        title="Café com Lei"
        description="Uma dose curta de lei seca por dia, com o que mais cai e três itens para fixar."
      />
      <Suspense fallback={<div aria-hidden className="h-64 animate-pulse rounded-2xl bg-surface-2/40" />}>
        <Cafe searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Cafe({ searchParams }: { searchParams: PageProps<"/cafe-com-lei">["searchParams"] }) {
  const empty = (await searchParams).surpresa === "vazia";
  const t = await getTrackMarks(CAFE_PLAN_ID);
  const doneDay = (id: string) => t.marks.get(`${id}:0`);
  const done = CAFE_DAYS.filter((d) => doneDay(d.id)).length;
  const streak = streakOf(t.marks.values(), t.today);
  const next = CAFE_DAYS.find((d) => !doneDay(d.id));
  const doneToday = [...t.marks.values()].includes(t.today);

  return (
    <div className="flex flex-col gap-7">
      {t.missing && (
        <Notice tone="warning">
          Para guardar as doses concluídas, rode a migração <strong>0013_study_plan.sql</strong> no SQL Editor
          do Supabase.
        </Notice>
      )}
      <section
        aria-labelledby="cafe-hoje"
        className="mission-frame flex flex-col gap-5 rounded-2xl p-5 shadow-card sm:flex-row sm:items-center sm:p-7"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-subtle text-accent">
          <Coffee className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-fg-2">
            {next
              ? doneToday
                ? "Dose de hoje feita. Próxima:"
                : "Dose de hoje"
              : "Todas as doses concluídas"}
          </p>
          <h2 id="cafe-hoje" className="font-display mt-1 text-[24px] leading-tight font-semibold text-fg">
            {next ? `${next.id}. ${next.title}` : `${CAFE_DAYS.length} de ${CAFE_DAYS.length} doses`}
          </h2>
          <p className="mt-1 text-[13.5px] text-fg-2">
            {next ? next.law : "Recomece pela primeira dose para revisar a lei seca antes da prova."}
          </p>
        </div>
        <Button asChild variant="primary" className="w-full sm:w-auto">
          <Link href={`/cafe-com-lei/${next?.id ?? CAFE_DAYS[0].id}`}>
            {next ? "Tomar a dose" : "Revisar do início"}
            <ArrowRight />
          </Link>
        </Button>
      </section>

      <section
        aria-labelledby="cafe-surpresa"
        className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-1 p-5 sm:flex-row sm:items-center sm:p-6"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-fg-2">
          <Shuffle className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="cafe-surpresa" className="text-[16px] font-semibold text-fg">
            Dose surpresa
          </h2>
          <p className="mt-1 text-[13.5px] text-fg-2">
            Sem limite de dias: cada clique abre um trecho de lei seca da Biblioteca (Vade Mecum PRF, Constituição,
            Estatuto da PMPE e leis especiais), dando preferência ao que você ainda não concluiu.
          </p>
        </div>
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link href="/cafe-com-lei/lei-seca" prefetch={false}>
            Ler um trecho aleatório
            <ArrowRight />
          </Link>
        </Button>
      </section>
      {empty && (
        <Notice tone="warning">
          Ainda não há lei seca na Biblioteca para sortear. Importe o Vade Mecum PRF em Biblioteca › Importar.
        </Notice>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-2xl border border-border bg-surface-1 p-4">
          <dt className="text-[12.5px] text-fg-3">Doses concluídas</dt>
          <dd className="font-display mt-1 text-[26px] font-semibold text-fg tabular-nums">
            {done}
            <span className="text-[15px] text-fg-3">/{CAFE_DAYS.length}</span>
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-surface-1 p-4">
          <dt className="flex items-center gap-1.5 text-[12.5px] text-fg-3">
            <Flame className="size-3.5 text-gold" aria-hidden />
            Sequência
          </dt>
          <dd className="font-display mt-1 text-[26px] font-semibold text-fg tabular-nums">
            {streak}
            <span className="ml-1 text-[15px] font-normal text-fg-3">{streak === 1 ? "dia" : "dias"}</span>
          </dd>
        </div>
      </dl>

      <section aria-labelledby="cafe-todas">
        <h2 id="cafe-todas" className="mb-3 text-[15px] font-semibold text-fg">
          Todas as doses
        </h2>
        <ol className="grid gap-2.5 sm:grid-cols-2">
          {CAFE_DAYS.map((d) => {
            const at = doneDay(d.id);
            return (
              <li key={d.id}>
                <Link
                  href={`/cafe-com-lei/${d.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border bg-surface-1 p-4 transition-colors hover:border-border-strong",
                    d.id === next?.id ? "border-accent/50" : "border-border",
                  )}
                >
                  <span className="font-display w-7 text-[18px] font-semibold text-fg-3 tabular-nums">
                    {d.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold text-fg">{d.title}</span>
                    <span className="block truncate text-[12.5px] text-fg-3">{d.law}</span>
                  </span>
                  {at && <CircleCheck className="size-5 shrink-0 text-success" aria-label="Concluída" />}
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[12.5px] text-fg-3">
          {plural(CAFE_DAYS.length, "dose", "doses")} com as leis do edital da PMPE. Conclua uma por dia para
          manter a sequência.
        </p>
      </section>
    </div>
  );
}
