import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildSnippet, MARK_COLOR_LABELS, topicLabel, type MarkColor } from "../model";
import type { MarkWithPlace, SearchHit } from "../queries";
import { topicHref } from "./toc";

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-surface-3", className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${percent}% lido`}
    >
      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function SearchBox({
  q,
  action = "/biblioteca",
  placeholder,
  hidden,
}: {
  q?: string;
  action?: string;
  placeholder?: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} role="search" className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-3"
        aria-hidden
      />
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder ?? "Buscar em todas as apostilas: termos, capítulos, tópicos…"}
        aria-label="Buscar na biblioteca"
        className="h-11 w-full rounded-xl border border-border bg-surface-1 pr-4 pl-10 text-[14.5px] text-fg placeholder:text-fg-3 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-subtle)] focus:outline-none"
      />
    </form>
  );
}

export function SearchResults({ q, hits }: { q: string; hits: SearchHit[] }) {
  if (!hits.length)
    return (
      <div className="rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center">
        <p className="text-[15px] font-semibold text-fg">Nada encontrado para “{q}”</p>
        <p className="mt-1 text-[13.5px] text-fg-2">Tente outra palavra ou só o começo dela.</p>
      </div>
    );
  return (
    <ul className="flex flex-col gap-2.5">
      {hits.map((h, i) => {
        const snip = h.text ? buildSnippet(h.text, q) : null;
        return (
          <li key={`${h.topicId}-${h.blockId ?? "t"}-${i}`}>
            <Link
              href={topicHref(h.disciplineId, h.topicId, h.blockId)}
              className="block rounded-xl border border-border bg-surface-1 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-2/40"
            >
              <p className="truncate text-[12px] text-fg-3">
                {h.disciplineName} › {h.chapterTitle}
              </p>
              <p className="mt-0.5 text-[14.5px] font-medium text-fg">{h.topicTitle}</p>
              {snip && (
                <p className="mt-1 text-[13.5px] leading-relaxed text-fg-2">
                  {snip.before}
                  {snip.parts.map((p, j) =>
                    p.hit ? (
                      <mark key={j} className="rounded-sm bg-accent-subtle px-0.5 text-fg">
                        {p.text}
                      </mark>
                    ) : (
                      <span key={j}>{p.text}</span>
                    ),
                  )}
                  {snip.after}
                </p>
              )}
              {!snip && <p className="mt-1 text-[12.5px] text-fg-3">Título do tópico ou capítulo</p>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const KIND_LABEL = { highlight: "Marcação", note: "Anotação", favorite: "Favorito" } as const;

export function MarkList({
  marks,
  showDiscipline = true,
}: {
  marks: MarkWithPlace[];
  showDiscipline?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {marks.map((m) => (
        <li key={m.id}>
          <Link
            href={topicHref(m.disciplineId, m.topicId, m.blockId)}
            className="block rounded-xl border border-border bg-surface-1 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-2/40"
          >
            <p className="flex items-center gap-2 text-[12px] text-fg-3">
              {m.color && (
                <span
                  className="hl-swatch size-2.5 rounded-full"
                  data-color={m.color}
                  aria-label={MARK_COLOR_LABELS[m.color as MarkColor]}
                />
              )}
              <span className="font-medium text-fg-2">{KIND_LABEL[m.kind]}</span>
              <span className="truncate">
                {showDiscipline ? `${m.disciplineName} › ` : ""}
                {topicLabel({ number: m.topicNumber, title: m.topicTitle })}
              </span>
              {m.status === "review" && (
                <span className="rounded bg-warning/15 px-1.5 text-warning">para revisar</span>
              )}
            </p>
            {m.quote && (
              <p className="mt-1.5 border-l-2 border-border-strong pl-3 text-[14px] leading-relaxed text-fg">
                “{m.quote.length > 300 ? m.quote.slice(0, 300) + "…" : m.quote}”
              </p>
            )}
            {m.body && (
              <p className="mt-1.5 text-[13.5px] leading-relaxed whitespace-pre-wrap text-fg-2">{m.body}</p>
            )}
            {!m.quote && !m.body && m.kind === "favorite" && (
              <p className="mt-1 text-[13.5px] text-fg-2">Tópico favorito</p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ColorFilter({
  base,
  current,
  params,
}: {
  base: string;
  current?: string;
  params?: Record<string, string>;
}) {
  const href = (color?: string) => {
    const sp = new URLSearchParams(params);
    if (color) sp.set("cor", color);
    else sp.delete("cor");
    const s = sp.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por cor">
      <Link
        href={href()}
        aria-current={!current ? "true" : undefined}
        className={cn(
          "rounded-full border px-3 py-1 text-[12.5px]",
          !current ? "border-accent bg-accent-subtle text-fg" : "border-border text-fg-2 hover:text-fg",
        )}
      >
        Todas
      </Link>
      {(Object.keys(MARK_COLOR_LABELS) as MarkColor[]).map((c) => (
        <Link
          key={c}
          href={href(c)}
          aria-current={current === c ? "true" : undefined}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px]",
            current === c
              ? "border-accent bg-accent-subtle text-fg"
              : "border-border text-fg-2 hover:text-fg",
          )}
        >
          <span className="hl-swatch size-2.5 rounded-full" data-color={c} />
          {MARK_COLOR_LABELS[c]}
        </Link>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong px-6 py-14 text-center">
      <BookOpen className="mx-auto size-6 text-fg-3" aria-hidden />
      <p className="mt-3 text-[15px] font-semibold text-fg">{title}</p>
      {children && (
        <div className="mx-auto mt-1.5 max-w-[480px] text-[13.5px] leading-relaxed text-fg-2">{children}</div>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
