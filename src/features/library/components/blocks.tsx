"use client";

import { memo, useEffect, useRef, useState } from "react";
import { AlertTriangle, BookMarked, Info, Lightbulb, Quote, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CALLOUT_LABELS,
  splitByRanges,
  type CalloutVariant,
  type Field,
  type LaidItem,
  type Layout,
  type Range,
} from "../model";

/* ------------------------------------------------------------------ */
/* Fórmulas: KaTeX só é baixado quando a página tem fórmula            */
/* ------------------------------------------------------------------ */

let katexPromise: Promise<typeof import("katex")> | null = null;
function loadKatex() {
  if (!katexPromise) {
    katexPromise = Promise.all([import("katex"), import("katex/dist/katex.min.css")]).then(([k]) => k);
  }
  return katexPromise;
}

export function MathView({ latex, display = false }: { latex: string; display?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadKatex()
      .then((k) => {
        if (!alive || !ref.current) return;
        (k.default ?? k).render(latex, ref.current, {
          displayMode: display,
          throwOnError: false,
          output: "htmlAndMathml",
        });
        setReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [latex, display]);
  return (
    <span
      ref={ref}
      data-no-anchor=""
      className={cn(
        display ? "block overflow-x-auto py-1 text-center" : "inline",
        !ready && "font-mono text-[0.9em] text-fg-2",
      )}
      aria-label={latex}
    >
      {latex}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Texto com marcações                                                 */
/* ------------------------------------------------------------------ */

function Text({ field, ranges }: { field: Field; ranges: Range[] }) {
  const local = ranges.filter((r) => r.end > field.start && r.start < field.end);
  return (
    <>
      {field.tokens.map((t, i) => {
        if (t.type === "math") return <MathView key={i} latex={t.latex} />;
        const pieces = local.length
          ? splitByRanges(t.text, t.start, local)
          : [{ text: t.text, start: t.start, ranges: [] as Range[] }];
        const content = pieces.map((p, j) => {
          if (!p.ranges.length) return p.text;
          const colored = [...p.ranges].reverse().find((r) => r.color);
          const note = p.ranges.find((r) => r.note);
          const top = colored ?? note ?? p.ranges[p.ranges.length - 1];
          return (
            <mark
              key={j}
              data-mark-id={top.id}
              data-mark-ids={p.ranges.map((r) => r.id).join(" ")}
              data-color={colored?.color ?? "none"}
              data-note={note ? "" : undefined}
            >
              {p.text}
            </mark>
          );
        });
        const styled = t.bold ? <strong className="font-semibold">{content}</strong> : <>{content}</>;
        return <span key={i}>{t.italic ? <em>{styled}</em> : styled}</span>;
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Blocos                                                              */
/* ------------------------------------------------------------------ */

const CALLOUT_STYLE: Record<CalloutVariant, { icon: typeof Info; box: string; title: string }> = {
  atencao: { icon: AlertTriangle, box: "border-warning/70 bg-warning/[0.06]", title: "text-warning" },
  importante: { icon: Star, box: "border-danger/70 bg-danger/[0.06]", title: "text-danger" },
  observacao: { icon: Info, box: "border-steel/70 bg-steel/[0.06]", title: "text-steel" },
  dica: { icon: Lightbulb, box: "border-success/70 bg-success/[0.06]", title: "text-success" },
  exemplo: { icon: Sparkles, box: "border-accent/70 bg-accent/[0.06]", title: "text-accent" },
  lembre: { icon: BookMarked, box: "border-gold/70 bg-gold/[0.06]", title: "text-gold" },
};

function Items({ items, ordered, ranges }: { items: LaidItem[]; ordered: boolean; ranges: Range[] }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag>
      {items.map((it, i) => (
        <li key={i}>
          <Text field={it.field} ranges={ranges} />
          {it.items.length > 0 && <Items items={it.items} ordered={ordered} ranges={ranges} />}
        </li>
      ))}
    </Tag>
  );
}

export const BlockBody = memo(function BlockBody({
  layout,
  ranges,
  image,
}: {
  layout: Layout;
  ranges: Range[];
  image?: string;
}) {
  switch (layout.kind) {
    case "titulo": {
      const cls =
        layout.level === 2
          ? "font-display mt-7 border-t border-border pt-8 text-[24px] leading-[1.2] font-semibold text-balance sm:text-[27px] [div:first-child>&]:mt-0 [div:first-child>&]:border-t-0 [div:first-child>&]:pt-0"
          : layout.level === 3
            ? "font-display mt-4 text-[19.5px] leading-snug font-semibold"
            : "font-display mt-2 text-[17px] leading-snug font-semibold text-fg-2";
      const H = `h${layout.level + 1}` as "h3" | "h4" | "h5";
      return (
        <H className={cls}>
          <Text field={layout.text} ranges={ranges} />
        </H>
      );
    }
    case "paragrafo":
      return (
        <p>
          <Text field={layout.text} ranges={ranges} />
        </p>
      );
    case "lista":
      return <Items items={layout.items} ordered={layout.ordered} ranges={ranges} />;
    case "tabela":
      return (
        <figure>
          {layout.title && (
            <figcaption className="font-display mb-2.5 text-[16px] font-semibold text-fg">
              <Text field={layout.title} ranges={ranges} />
            </figcaption>
          )}
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface-1">
            <table className="w-full min-w-[420px] border-collapse text-left text-[14.5px] leading-relaxed">
              {layout.head && (
                <thead className="font-display bg-surface-2 text-[13.5px] font-semibold text-fg">
                  <tr>
                    {layout.head.map((c, i) => (
                      <th key={i} className="border-b border-border px-3.5 py-2.5 align-bottom">
                        <Text field={c} ranges={ranges} />
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {layout.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0 even:bg-surface-2/40">
                    {row.map((c, j) => (
                      <td
                        key={j}
                        className={cn("px-3.5 py-2.5 align-top", j === 0 && layout.head && "font-medium")}
                      >
                        <Text field={c} ranges={ranges} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {layout.caption && (
            <p className="mt-2 text-[13px] text-fg-3">
              <Text field={layout.caption} ranges={ranges} />
            </p>
          )}
        </figure>
      );
    case "comparativo":
      return (
        <figure>
          {layout.title && (
            <figcaption className="font-display mb-2.5 text-[16px] font-semibold text-fg">
              <Text field={layout.title} ranges={ranges} />
            </figcaption>
          )}
          <div
            className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
            style={{ "--cols": layout.columns.length } as React.CSSProperties}
          >
            {layout.columns.map((col, i) => (
              <div key={i} className="bg-surface-1">
                <p className="font-display border-b border-border bg-surface-2 px-4 py-2.5 text-[15px] font-semibold text-fg">
                  <Text field={col.title} ranges={ranges} />
                </p>
                <ul className="!list-none space-y-2 !pl-0 px-4 py-3 text-[14.5px] leading-relaxed">
                  {col.items.map((it, j) => (
                    <li
                      key={j}
                      className="relative pl-4 before:absolute before:top-[0.7em] before:left-0 before:size-1.5 before:rounded-full before:bg-fg-3"
                    >
                      <Text field={it} ranges={ranges} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </figure>
      );
    case "destaque": {
      const s = CALLOUT_STYLE[layout.variant];
      const Icon = s.icon;
      return (
        <aside
          className={cn("rounded-l-[3px] rounded-r-2xl border-l-[3px] px-5 py-4 sm:px-6 sm:py-5", s.box)}
        >
          <p className={cn("font-display flex items-center gap-2 text-[14.5px] font-semibold", s.title)}>
            <Icon className="size-4 shrink-0" aria-hidden />
            <span data-no-anchor="">{CALLOUT_LABELS[layout.variant]}</span>
            {layout.title && (
              <>
                <span data-no-anchor="" className="text-fg-3">
                  ·
                </span>
                <span className="text-fg">
                  <Text field={layout.title} ranges={ranges} />
                </span>
              </>
            )}
          </p>
          <div className="mt-2 space-y-2.5 text-[16px] leading-[1.7]">
            {layout.paragraphs.map((p, i) => (
              <p key={i}>
                <Text field={p} ranges={ranges} />
              </p>
            ))}
          </div>
        </aside>
      );
    }
    case "citacao":
      return (
        <blockquote className="relative rounded-l-[3px] rounded-r-2xl border-l-[3px] border-accent/70 bg-surface-2/50 py-4 pr-5 pl-6">
          <Quote className="absolute top-3 right-3 size-4 text-fg-3/60" aria-hidden />
          <div className="space-y-2 font-serif text-[16px] leading-relaxed text-fg">
            {layout.paragraphs.map((p, i) => (
              <p key={i}>
                <Text field={p} ranges={ranges} />
              </p>
            ))}
          </div>
          {layout.reference && (
            <p className="mt-2 text-[13px] text-fg-3">
              <Text field={layout.reference} ranges={ranges} />
            </p>
          )}
        </blockquote>
      );
    case "formula":
      return (
        <figure className="rounded-xl border border-border bg-surface-2/40 px-4 py-3">
          <MathView latex={layout.latex} display />
          {layout.caption && (
            <figcaption className="mt-1 text-center text-[13px] text-fg-3">
              <Text field={layout.caption} ranges={ranges} />
            </figcaption>
          )}
        </figure>
      );
    case "imagem": {
      const src = layout.url ?? image;
      return (
        <figure>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={layout.alt}
              loading="lazy"
              className="mx-auto max-h-[70vh] rounded-xl border border-border bg-white/95"
            />
          ) : (
            <div
              data-no-anchor=""
              className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-[13px] text-fg-3"
            >
              Imagem indisponível: {layout.alt}
            </div>
          )}
          {layout.caption && (
            <figcaption className="mt-2 text-center text-[13px] text-fg-3">
              <Text field={layout.caption} ranges={ranges} />
            </figcaption>
          )}
        </figure>
      );
    }
  }
});
