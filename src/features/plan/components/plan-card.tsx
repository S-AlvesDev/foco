import "server-only";
import Link from "next/link";
import type { Route } from "next";
import { BookOpen, ChevronRight, RefreshCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { topicHref } from "@/features/library/components/toc";
import { getPlanPage } from "../queries";
import { nextTopic } from "./plan-view";

/** Card do painel: a meta do dia e o avanço no plano. Some se a Biblioteca não estiver disponível. */
export async function PlanCard() {
  let page;
  try {
    page = await getPlanPage();
  } catch {
    return null;
  }
  if (!page) return null;
  const m = page.current;
  const firstRead = m?.items.find((i) => i.kind === "read" && !i.done);
  const next = firstRead ? nextTopic(firstRead) : null;
  return (
    <Card aria-labelledby="plan-title">
      <CardHeader
        id="plan-title"
        icon={Target}
        title={m ? `Meta do dia · ${m.label}` : "Plano de metas concluído"}
        sub={`${page.done} de ${page.total} metas concluídas`}
        action={
          <Link
            href="/metas/plano"
            aria-label="Abrir plano de metas"
            className="-mr-1.5 flex size-8 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ChevronRight className="size-[18px]" />
          </Link>
        }
      />
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-label="Progresso no plano"
        aria-valuenow={page.done}
        aria-valuemin={0}
        aria-valuemax={page.total}
      >
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${(page.done / page.total) * 100}%` }}
        />
      </div>
      {m && (
        <>
          <ul className="mt-4 flex flex-col gap-2">
            {m.items.map((i) => (
              <li key={i.index} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[12px] text-fg-3">{i.discipline}</span>
                  <span
                    className={
                      i.done ? "text-[14px] text-fg-3 line-through" : "text-[14px] font-medium text-fg"
                    }
                  >
                    {i.title}
                  </span>
                </span>
                {i.kind === "read" && i.topics.length > 0 && (
                  <span className="shrink-0 text-[12.5px] text-fg-3 tabular-nums">
                    {i.readDone}/{i.topics.length}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {next ? (
              <Button asChild size="sm" variant="primary">
                <Link href={topicHref(next.disciplineId, next.id) as Route}>
                  <BookOpen />
                  {firstRead && firstRead.readDone ? "Continuar a meta" : "Começar a meta"}
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="primary">
                <Link href="/metas/plano">
                  {m.kind === "review" ? <RefreshCcw /> : <Target />}
                  {m.kind === "review" ? "Fazer a revisão geral" : "Abrir a meta"}
                </Link>
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
