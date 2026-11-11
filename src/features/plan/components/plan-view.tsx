import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BookOpen, Check, CircleDashed, RefreshCcw, ScrollText, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { plural, shortDate } from "@/lib/format";
import { topicLabel } from "@/features/library/model";
import { StatusDot, topicHref } from "@/features/library/components/toc";
import { LevelBadge } from "@/features/memory/components/level-badge";
import type { Level } from "@/features/memory/fsrs";
import type { ItemState, MetaState } from "../model";
import type { PlanPage } from "../queries";
import { MarkButton } from "./mark-button";

const LEVEL_ORDER: Record<string, number> = {
  critico: 0,
  fragil: 1,
  consolidando: 2,
  consolidado: 3,
  novo: 4,
  dominado: 5,
};

/** Próximo tópico a abrir num item de leitura: o primeiro não concluído. */
export function nextTopic(item: ItemState) {
  return item.topics.find((t) => t.status !== "done") ?? item.topics[0] ?? null;
}

function Bar({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-surface-3", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}

function MetaStatusIcon({ meta, current }: { meta: MetaState; current: boolean }) {
  if (meta.done)
    return (
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/90 text-bg"
        aria-label="Concluída"
      >
        <Check className="size-3" strokeWidth={3.5} />
      </span>
    );
  if (current)
    return (
      <span
        className="size-5 shrink-0 rounded-full border-2 border-accent bg-accent/15"
        aria-label="Meta atual"
      />
    );
  return (
    <span className="size-5 shrink-0 rounded-full border-2 border-border-strong" aria-label="Pendente" />
  );
}

/** Itens de uma meta: tópicos com situação de leitura, revisões e botões de marcar. */
export function MetaBody({ meta, page }: { meta: MetaState; page: PlanPage }) {
  return (
    <div className="flex flex-col divide-y divide-border [&>*+*]:pt-4 [&>*:not(:last-child)]:pb-4">
      {meta.items.map((item) => (
        <ItemBlock key={item.index} meta={meta} item={item} page={page} />
      ))}
    </div>
  );
}

function ItemBlock({ meta, item, page }: { meta: MetaState; item: ItemState; page: PlanPage }) {
  const isReview = item.kind !== "read" && item.kind !== "practice";
  const topics = isReview
    ? [...item.topics].sort(
        (a, b) =>
          (LEVEL_ORDER[a.memory?.level ?? "novo"] ?? 9) - (LEVEL_ORDER[b.memory?.level ?? "novo"] ?? 9) ||
          (a.memory?.dueOn ?? "9").localeCompare(b.memory?.dueOn ?? "9"),
      )
    : item.topics;
  const next = !isReview ? nextTopic(item) : null;
  const dueCount = topics.filter(
    (t) => t.memory && t.memory.state !== "suspended" && t.memory.dueOn <= page.today,
  ).length;
  const unread = topics.filter((t) => t.status !== "done").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-fg-3">
            {item.discipline}
            {item.kind === "practice" && " · questões e revisão"}
          </p>
          <h3 className="text-[15px] leading-snug font-semibold text-fg">{item.title}</h3>
          <p className="mt-0.5 text-[12.5px] text-fg-3">
            {item.kind === "read"
              ? item.topics.length
                ? `${item.readDone} de ${plural(item.topics.length, "tópico lido", "tópicos lidos")}`
                : "Apostila não importada"
              : isReview
                ? item.topics.length
                  ? `${plural(item.topics.length, "tópico", "tópicos")}${dueCount ? ` · ${dueCount} para revisar hoje` : ""}${
                      unread ? ` · ${unread} ainda não ${unread === 1 ? "lido" : "lidos"}` : ""
                    }`
                  : "Sem tópicos da Biblioteca neste intervalo"
                : "Faça questões do assunto e revise os pontos que errar"}
            {item.done && item.doneOn && ` · concluído em ${shortDate(item.doneOn, page.today)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {next && item.kind === "read" && !item.done && (
            <Button asChild size="sm" variant="primary">
              <Link href={topicHref(next.disciplineId, next.id) as Route}>
                <BookOpen />
                {item.readDone ? "Continuar" : "Começar"}
              </Link>
            </Button>
          )}
          {isReview && dueCount > 0 && !item.done && (
            <Button asChild size="sm" variant="secondary">
              <Link href="/revisoes/hoje">
                <RefreshCcw />
                Revisões de hoje
              </Link>
            </Button>
          )}
          {item.manual && (
            <MarkButton
              planId={page.plan.id}
              meta={meta.id}
              item={item.index}
              done={item.done}
              disabled={page.marksMissing}
              label={
                isReview
                  ? "Concluir revisão"
                  : item.kind === "practice"
                    ? "Marcar como feito"
                    : "Marcar como feito"
              }
            />
          )}
        </div>
      </div>

      {topics.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-border/60">
          {topics.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <StatusDot status={t.status as "done" | "in_progress" | "not_started"} percent={t.percent} />
              <Link
                href={topicHref(t.disciplineId, t.id) as Route}
                className="min-w-0 flex-1 truncate text-[13.5px] text-fg hover:text-accent"
              >
                {topicLabel(t)}
              </Link>
              {isReview && t.memory && <LevelBadge level={t.memory.level as Level} compact />}
              {isReview && t.memory && t.memory.state !== "suspended" && t.memory.dueOn <= page.today && (
                <Link
                  href={`/revisoes/hoje?topico=${encodeURIComponent(t.id)}` as Route}
                  className="shrink-0 text-[12.5px] font-medium text-accent hover:underline"
                >
                  Revisar
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {item.missing > 0 && item.topics.length > 0 && (
        <p className="mt-2 text-[12px] text-fg-3">
          {plural(item.missing, "tópico", "tópicos")} do plano não {item.missing === 1 ? "está" : "estão"} na
          Biblioteca.
        </p>
      )}
    </div>
  );
}

/** Resumo do plano: metas concluídas, ritmo e previsão de término. */
export function PlanSummary({ page }: { page: PlanPage }) {
  const pct = page.total ? page.done / page.total : 0;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12.5px] font-medium text-fg-3">Metas concluídas</p>
          <p className="text-[28px] leading-none font-bold tracking-[-0.02em] text-fg tabular-nums">
            {page.done}
            <span className="text-[17px] font-semibold text-fg-3"> de {page.total}</span>
          </p>
        </div>
        <p className="text-[13px] text-fg-2 tabular-nums">
          {page.coreDone} de {page.coreTotal} do plano do curso · {page.done - page.coreDone} de{" "}
          {page.total - page.coreTotal} extras
        </p>
      </div>
      <Bar value={pct} className="h-2" />
      <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-2">
        <div>
          <dt className="text-fg-3">Ritmo</dt>
          <dd className="font-medium text-fg tabular-nums">
            {page.pace.basis === "real"
              ? `${page.pace.perWeek.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${
                  page.pace.perWeek < 2 ? "meta" : "metas"
                } por semana`
              : "6 metas por semana (sugerido)"}
          </dd>
        </div>
        <div>
          <dt className="text-fg-3">Previsão de término</dt>
          <dd className="font-medium text-fg">
            {page.finishOn ? shortDate(page.finishOn, page.today) : "Plano concluído"}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

/** Lista de todas as metas, em grupos de dez, com detalhes recolhíveis. */
export function PlanList({ page }: { page: PlanPage }) {
  const core = page.metas.filter((m) => !m.extra);
  const extras = page.metas.filter((m) => m.extra);
  const groups: { title: string; metas: MetaState[] }[] = [];
  for (const m of core) {
    const n = Number(m.id);
    const start = Math.floor((n - 1) / 10) * 10 + 1;
    const title = `Metas ${String(start).padStart(2, "0")} a ${String(start + 9).padStart(2, "0")}`;
    const g = groups.at(-1);
    if (g?.title === title) g.metas.push(m);
    else groups.push({ title, metas: [m] });
  }
  if (extras.length) groups.push({ title: "Extras: assuntos da Biblioteca fora do plano", metas: extras });

  return (
    <div className="flex flex-col gap-7">
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h2 className="mb-2.5 text-[13px] font-semibold text-fg-2">
            {g.title}
            <span className="ml-2 font-normal text-fg-3 tabular-nums">
              {g.metas.filter((m) => m.done).length}/{g.metas.length}
            </span>
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-1">
            {g.metas.map((m) => {
              const current = page.current?.id === m.id;
              return (
                <li key={m.id}>
                  <details className={cn("group", current && "bg-accent-subtle/60")}>
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50 [&::-webkit-details-marker]:hidden">
                      <MetaStatusIcon meta={m} current={current} />
                      <span className="w-[66px] shrink-0 text-[13px] font-semibold text-fg tabular-nums">
                        {m.label}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-fg-2">
                        {m.items
                          .map((i) => (m.kind === "review" ? i.title : `${i.discipline}: ${i.title}`))
                          .join(" · ")}
                      </span>
                      {!m.done && m.progress > 0 && (
                        <span className="hidden w-16 sm:block">
                          <Bar value={m.progress} />
                        </span>
                      )}
                      {m.kind === "review" ? (
                        <RefreshCcw className="size-4 shrink-0 text-fg-3" aria-label="Revisão geral" />
                      ) : (
                        <ScrollText className="size-4 shrink-0 text-fg-3 group-open:text-fg-2" aria-hidden />
                      )}
                    </summary>
                    <div className="border-t border-border/70 bg-bg/40 px-4 py-4 sm:pl-[52px]">
                      <MetaBody meta={m} page={page} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Card da meta atual (topo da página do plano). */
export function CurrentMeta({ page }: { page: PlanPage }) {
  const m = page.current;
  if (!m)
    return (
      <Card className="flex items-center gap-3">
        <Check className="size-5 text-success" />
        <p className="text-[14px] text-fg">
          Você concluiu todas as metas. Para a segunda volta, priorize questões e os tópicos marcados como
          frágeis ou críticos nas revisões.
        </p>
      </Card>
    );
  return (
    <Card aria-labelledby="current-meta" className="border-accent/40">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            {m.kind === "review" ? (
              <RefreshCcw className="size-[17px]" />
            ) : (
              <Target className="size-[17px]" />
            )}
          </span>
          <div>
            <p className="text-[12.5px] text-fg-3">Meta atual</p>
            <h2 id="current-meta" className="text-[17px] font-semibold tracking-[-0.01em] text-fg">
              {m.label}
              {m.kind === "review" && " · revisão geral"}
            </h2>
          </div>
        </div>
        {m.progress > 0 && !m.done && (
          <span className="flex items-center gap-2 text-[12.5px] text-fg-3 tabular-nums">
            <Bar value={m.progress} className="w-24" />
            {Math.round(m.progress * 100)}%
          </span>
        )}
      </div>
      <MetaBody meta={m} page={page} />
      {m.kind === "review" && (
        <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-fg-3">
          <CircleDashed className="mt-0.5 size-3.5 shrink-0" />
          Os tópicos estão em ordem do mais fraco para o mais forte. Revise os que estão vencidos, releia os
          frágeis e conclua quando terminar.
        </p>
      )}
    </Card>
  );
}

export function PlanLink({ page }: { page: PlanPage }) {
  return (
    <Link
      href="/metas/plano"
      className="flex items-center gap-3 rounded-xl border border-border bg-surface-1 px-4 py-3 transition-colors hover:border-border-strong"
    >
      <Target className="size-5 shrink-0 text-accent" />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-fg">{page.plan.name}</span>
        <span className="block truncate text-[12.5px] text-fg-3">
          {page.done} de {page.total} metas · {page.current ? `próxima: ${page.current.label}` : "concluído"}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-fg-3" />
    </Link>
  );
}
