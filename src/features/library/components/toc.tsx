import Link from "next/link";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadStatus } from "../model";
import type { TocChapter, TocTopic } from "../queries";
import type { Level } from "@/features/memory/fsrs";
import { LevelDot } from "@/features/memory/components/level-badge";

export function topicHref(disciplineId: string, topicId: string, blockId?: string | null) {
  return `/biblioteca/${encodeURIComponent(disciplineId)}/${encodeURIComponent(topicId)}${blockId ? `#${blockId}` : ""}`;
}

export function StatusDot({ status, percent }: { status: ReadStatus; percent: number }) {
  if (status === "done")
    return (
      <span
        className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success/90 text-bg"
        aria-label="Leitura concluída"
      >
        <Check className="size-2.5" strokeWidth={3.5} />
      </span>
    );
  if (status === "in_progress" || percent > 0)
    return (
      <span
        className="size-4 shrink-0 rounded-full border-2 border-accent/40"
        style={{
          background: `conic-gradient(var(--accent) ${Math.max(8, percent) * 3.6}deg, transparent 0)`,
        }}
        aria-label={`Em andamento, ${percent}% lido`}
      />
    );
  return (
    <span className="size-4 shrink-0 rounded-full border-2 border-border-strong" aria-label="Não iniciado" />
  );
}

/** Sumário da disciplina: capítulos com tópicos e subtópicos, situação e o tópico atual. */
export function Toc({
  disciplineId,
  chapters,
  currentId,
  onNavigate,
  dense = false,
  levels,
}: {
  disciplineId: string;
  chapters: TocChapter[];
  /** Nível de domínio por tópico (revisão adaptativa), quando houver. */
  levels?: Record<string, Level>;
  currentId?: string;
  onNavigate?: () => void;
  dense?: boolean;
}) {
  return (
    <nav aria-label="Sumário" className={cn("flex flex-col", dense ? "gap-0.5" : "gap-4")}>
      {chapters.map((c) => {
        const done = c.topics.filter((t) => t.status === "done").length;
        const rows = (
          <ul className={cn("flex flex-col", dense ? "" : "mt-2")}>
            {c.topics.map((t) => (
              <TocRow
                key={t.id}
                t={t}
                disciplineId={disciplineId}
                current={t.id === currentId}
                onNavigate={onNavigate}
                dense={dense}
                level={levels?.[t.id]}
              />
            ))}
          </ul>
        );
        if (dense) {
          const here = c.topics.some((t) => t.id === currentId);
          // No leitor, só o capítulo atual abre: o tópico em leitura fica sempre à vista.
          return (
            <details key={c.id} open={here} className="group/ch">
              <summary className="flex cursor-pointer list-none items-baseline gap-2 rounded-lg px-2 py-1.5 transition-colors select-none hover:bg-surface-2/70 [&::-webkit-details-marker]:hidden">
                {c.number && (
                  <span className={cn("num w-5 shrink-0 text-[12.5px]", here ? "text-accent" : "text-fg-3")}>
                    {String(c.number).padStart(2, "0")}
                  </span>
                )}
                <span
                  className={cn(
                    "min-w-0 flex-1 text-[13px] leading-snug",
                    here ? "font-semibold text-fg" : "text-fg-2 group-open/ch:text-fg",
                  )}
                >
                  {c.title}
                </span>
                <span
                  className={cn(
                    "num shrink-0 text-[11.5px]",
                    done === c.topics.length && done > 0 ? "text-success" : "text-fg-3",
                  )}
                >
                  {done}/{c.topics.length}
                </span>
              </summary>
              <div className="mt-0.5 mb-2 ml-[11px] border-l border-border pl-2">{rows}</div>
            </details>
          );
        }
        return (
          <section key={c.id} className="list-box px-3 py-4 sm:px-4">
            <div className="flex items-baseline gap-3 px-2">
              {c.number && (
                <span
                  aria-hidden
                  className="num w-7 shrink-0 text-[22px] leading-none font-semibold text-fg-3"
                >
                  {String(c.number).padStart(2, "0")}
                </span>
              )}
              <h3 className="font-display min-w-0 flex-1 text-[16.5px] leading-snug font-semibold text-fg">
                <span className="sr-only">{c.number ? `Capítulo ${c.number}: ` : ""}</span>
                {c.title}
              </h3>
              <span
                className={cn(
                  "num shrink-0 text-[12.5px]",
                  done === c.topics.length && done > 0 ? "text-success" : "text-fg-3",
                )}
              >
                {done}/{c.topics.length}
              </span>
            </div>
            {rows}
          </section>
        );
      })}
    </nav>
  );
}

function TocRow({
  t,
  disciplineId,
  current,
  onNavigate,
  dense,
  level,
}: {
  level?: Level;
  t: TocTopic;
  disciplineId: string;
  current: boolean;
  onNavigate?: () => void;
  dense: boolean;
}) {
  return (
    <li>
      <Link
        href={topicHref(disciplineId, t.id)}
        onClick={onNavigate}
        aria-current={current ? "page" : undefined}
        className={cn(
          "relative flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2",
          dense ? "text-[13px]" : "text-[14px]",
          current
            ? "bg-accent-subtle font-medium text-fg before:absolute before:inset-y-1.5 before:-left-[9px] before:w-[2px] before:rounded-full before:bg-accent"
            : "text-fg-2 hover:text-fg",
        )}
        style={{ paddingLeft: `${8 + t.depth * 16}px` }}
      >
        <span className="mt-[3px] flex">
          <StatusDot status={t.status} percent={t.percent} />
        </span>
        <span className="min-w-0 flex-1 leading-snug">
          {t.number && <span className="mr-1.5 text-fg-3 tabular-nums">{t.number}</span>}
          {t.title}
        </span>
        {level && (
          <span className="mt-[7px]">
            <LevelDot level={level} />
          </span>
        )}
        {t.favorite && (
          <Star className="mt-[3px] size-3.5 shrink-0 fill-gold text-gold" aria-label="Favorito" />
        )}
      </Link>
    </li>
  );
}
