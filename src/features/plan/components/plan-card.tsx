import "server-only";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BookOpen, ChevronRight, RefreshCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { topicLabel } from "@/features/library/model";
import { StatusDot, topicHref } from "@/features/library/components/toc";
import { plural } from "@/lib/format";
import { getPlanPage } from "../queries";
import { nextTopic } from "./plan-view";

/**
 * Card do painel: a missão do dia. É a peça de destaque da tela (moldura violeta-dourada e o número
 * da meta em contorno). Some se a Biblioteca não estiver disponível.
 */
export async function PlanCard() {
  let page;
  try {
    page = await getPlanPage();
  } catch {
    return null;
  }
  if (!page) return null;
  const m = page.current;
  const pct = page.total ? (page.done / page.total) * 100 : 0;

  if (!m)
    return (
      <section aria-labelledby="plan-title" className="mission-frame rounded-2xl p-5 shadow-card sm:p-7">
        <p className="text-[13px] text-fg-2">Plano de metas</p>
        <h2 id="plan-title" className="font-display mt-2 text-[26px] leading-tight font-semibold text-fg">
          Todas as {page.total} metas concluídas
        </h2>
        <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-fg-2">
          Na segunda volta, priorize questões e os tópicos que as revisões marcam como frágeis.
        </p>
        <Button asChild className="mt-6">
          <Link href="/metas/plano">
            <Target />
            Abrir o plano
          </Link>
        </Button>
      </section>
    );

  const focus = m.items.find((i) => !i.done) ?? m.items[0];
  const others = m.items.filter((i) => i !== focus);
  const next = focus.kind === "read" ? nextTopic(focus) : null;
  const isReview = m.kind === "review";
  const title = isReview ? focus.title : focus.title;
  const topics = isReview ? [] : focus.topics.slice(0, 4);
  const more = isReview ? 0 : focus.topics.length - topics.length;

  return (
    <section
      aria-labelledby="plan-title"
      className="mission-frame flex flex-col overflow-hidden rounded-2xl p-5 shadow-card sm:p-7"
    >
      <span
        aria-hidden
        className="outline-num pointer-events-none absolute top-5 right-5 text-[96px] select-none sm:top-7 sm:right-7 sm:text-[150px]"
      >
        {m.id}
      </span>

      <div className="relative flex items-center gap-2 text-[13px] text-fg-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 font-medium text-fg">
          {isReview ? (
            <RefreshCcw className="size-3.5 text-accent" />
          ) : (
            <Target className="size-3.5 text-accent" />
          )}
          Missão do dia
        </span>
        <span className="num">{m.label}</span>
      </div>

      <h2
        id="plan-title"
        className="font-display relative mt-4 max-w-[20ch] text-[26px] leading-[1.12] font-semibold tracking-[-0.01em] text-balance text-fg sm:text-[32px]"
      >
        {title}
      </h2>
      <p className="relative mt-2 text-[13.5px] text-fg-2">
        {isReview
          ? `${plural(focus.topics.length, "tópico", "tópicos")} para repassar, do mais fraco para o mais forte`
          : focus.kind === "practice"
            ? `${focus.discipline} · questões e revisão dos erros`
            : `${focus.discipline} · ${focus.readDone} de ${plural(focus.topics.length, "tópico lido", "tópicos lidos")}`}
      </p>

      {topics.length > 0 && (
        <ul className="relative mt-5 flex flex-col">
          {topics.map((t) => (
            <li key={t.id}>
              <Link
                href={topicHref(t.disciplineId, t.id) as Route}
                className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
              >
                <StatusDot status={t.status as "done" | "in_progress" | "not_started"} percent={t.percent} />
                <span
                  className={
                    t.status === "done"
                      ? "min-w-0 flex-1 truncate text-[14px] text-fg-3"
                      : "min-w-0 flex-1 truncate text-[14px] text-fg"
                  }
                >
                  {topicLabel(t)}
                </span>
                <ChevronRight className="size-4 shrink-0 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </li>
          ))}
          {more > 0 && <li className="px-0 pt-1 text-[12.5px] text-fg-3">e mais {more}</li>}
        </ul>
      )}
      {others.map((i) => (
        <p key={i.index} className="relative mt-3 text-[13px] text-fg-3">
          Também nesta meta:{" "}
          <span className={i.done ? "line-through" : "text-fg-2"}>
            {i.discipline}, {i.title}
          </span>
        </p>
      ))}

      <div className="relative mt-auto pt-7">
        <div className="flex flex-col gap-4 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="primary" size="lg" className="h-11 rounded-xl px-5 text-[14.5px]">
            {next ? (
              <Link href={topicHref(next.disciplineId, next.id) as Route}>
                <BookOpen />
                {focus.readDone ? "Continuar a missão" : "Começar a missão"}
                <ArrowRight />
              </Link>
            ) : (
              <Link href="/metas/plano">
                {isReview ? <RefreshCcw /> : <Target />}
                {isReview ? "Fazer a revisão geral" : "Abrir a meta"}
                <ArrowRight />
              </Link>
            )}
          </Button>
          <Link
            href="/metas/plano"
            className="group flex min-w-0 flex-col gap-1.5 sm:w-[210px]"
            aria-label={`Plano de metas: ${page.done} de ${page.total} concluídas`}
          >
            <span className="flex items-baseline justify-between text-[12.5px] text-fg-3 group-hover:text-fg-2">
              <span>Plano de metas</span>
              <span className="num text-fg-2">
                {page.done}/{page.total}
              </span>
            </span>
            <span className="block h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <span
                className="grow-x block h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--gold))]"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
