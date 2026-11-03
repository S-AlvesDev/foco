"use client";

import { useEffect, useRef, useState } from "react";
import { niceScale, tickLabel } from "@/features/dashboard/components/evolution-chart";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PERSON_COLORS, type PairBucket } from "../model";

const HEIGHT = 200;
const PAD = { top: 12, right: 4, bottom: 26, left: 44 };

function column(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Colunas lado a lado: você e a outra pessoa, por semana ou por mês. */
export function PairChart({
  buckets,
  names,
  caption,
}: {
  buckets: PairBucket[];
  names: { me: string; partner: string };
  caption: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    const onOutside = (e: PointerEvent) => !el.contains(e.target as Node) && setActive(null);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      ro.disconnect();
      document.removeEventListener("pointerdown", onOutside);
    };
  }, []);

  const showPartner = buckets.some((b) => b.partner !== null);
  const max = Math.max(...buckets.map((b) => Math.max(b.me, b.partner ?? 0)), 1);
  const { top, ticks } = niceScale(max);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = buckets.length ? plotW / buckets.length : 0;
  const barW = Math.max(3, Math.min(18, (band * 0.7 - 2) / (showPartner ? 2 : 1)));
  const y = (s: number) => PAD.top + plotH - (s / top) * plotH;
  const hovered = active !== null ? buckets[active] : null;

  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-fg-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: PERSON_COLORS.me }} aria-hidden />
          {names.me}
        </span>
        {showPartner && (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: PERSON_COLORS.partner }} aria-hidden />
            {names.partner}
          </span>
        )}
      </div>
      <div ref={ref} className="relative w-full select-none" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={caption}
            className="block overflow-visible"
            onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" />
                <text
                  x={PAD.left - 8}
                  y={y(t) + 4}
                  textAnchor="end"
                  className="fill-fg-3 text-[11px] tabular-nums"
                >
                  {tickLabel(t)}
                </text>
              </g>
            ))}
            {buckets.map((b, i) => {
              const cx = PAD.left + band * i + band / 2;
              const dim = active !== null && active !== i;
              const left = showPartner ? cx - barW - 1 : cx - barW / 2;
              const hMe = (b.me / top) * plotH;
              const hP = ((b.partner ?? 0) / top) * plotH;
              return (
                <g key={b.key} opacity={dim ? 0.35 : 1} style={{ transition: "opacity 120ms" }}>
                  {b.me > 0 && (
                    <path d={column(left, PAD.top + plotH - hMe, barW, hMe)} fill={PERSON_COLORS.me} />
                  )}
                  {showPartner && (b.partner ?? 0) > 0 && (
                    <path d={column(cx + 1, PAD.top + plotH - hP, barW, hP)} fill={PERSON_COLORS.partner} />
                  )}
                  <text
                    x={cx}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    className={cn("text-[11px]", b.current ? "fill-fg font-medium" : "fill-fg-3")}
                  >
                    {b.label}
                  </text>
                  <rect
                    x={PAD.left + band * i}
                    y={PAD.top}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    onPointerEnter={() => setActive(i)}
                    onPointerDown={() => setActive(i)}
                  />
                </g>
              );
            })}
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={PAD.top + plotH}
              y2={PAD.top + plotH}
              stroke="var(--border-strong)"
            />
          </svg>
        )}
        {hovered && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 -translate-y-full rounded-lg bg-surface-3 px-3 py-2.5 text-[12.5px] shadow-pop"
            style={{
              left: Math.min(Math.max(PAD.left + band * active + band / 2 - 95, 0), Math.max(0, width - 190)),
              top: Math.max(0, y(Math.max(hovered.me, hovered.partner ?? 0)) - 12),
              width: 190,
            }}
          >
            <p className="text-fg-2 first-letter:uppercase">{hovered.title}</p>
            <p className="mt-1 flex items-center gap-2">
              <span className="size-2 rounded-sm" style={{ background: PERSON_COLORS.me }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-fg-2">{names.me}</span>
              <span className="font-medium text-fg tabular-nums">{formatDuration(hovered.me)}</span>
            </p>
            {showPartner && (
              <p className="mt-0.5 flex items-center gap-2">
                <span
                  className="size-2 rounded-sm"
                  style={{ background: PERSON_COLORS.partner }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-fg-2">{names.partner}</span>
                <span className="font-medium text-fg tabular-nums">
                  {formatDuration(hovered.partner ?? 0)}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th>Período</th>
              <th>{names.me}</th>
              {showPartner && <th>{names.partner}</th>}
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.key}>
                <td>{b.title}</td>
                <td>{formatDuration(b.me)}</td>
                {showPartner && <td>{formatDuration(b.partner ?? 0)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
