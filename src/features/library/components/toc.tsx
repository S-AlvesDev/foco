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
    <nav aria-label="Sumário" className="flex flex-col gap-5">
      {chapters.map((c) => (
        <div key={c.id}>
          <p className={cn("px-2 font-semibold text-fg", dense ? "text-[12.5px]" : "text-[13.5px]")}>
            {c.number ? `${c.number}. ` : ""}
            {c.title}
          </p>
          <ul className="mt-1.5 flex flex-col">
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
        </div>
      ))}
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
          "flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2",
          dense ? "text-[13px]" : "text-[14px]",
          current ? "bg-accent-subtle text-fg" : "text-fg-2",
        )}
        style={{ paddingLeft: `${8 + t.depth * 16}px` }}
      >
        <span className="mt-[3px]">
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
