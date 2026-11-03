"use client";

import { useEffect, useRef, useState } from "react";
import { niceScale, tickLabel } from "@/features/dashboard/components/evolution-chart";
import { formatDuration } from "@/lib/format";
import type { CumulativePoint } from "../compute";

const HEIGHT = 200;
const PAD = { top: 12, right: 8, bottom: 26, left: 44 };

/** Linha do total acumulado, mês a mês. */
export function CumulativeChart({ points, caption }: { points: CumulativePoint[]; caption: string }) {
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

  const max = Math.max(...points.map((p) => p.total), 1);
  const { top, ticks } = niceScale(max);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const step = points.length > 1 ? plotW / (points.length - 1) : 0;
  const x = (i: number) => PAD.left + (points.length > 1 ? step * i : plotW / 2);
  const y = (s: number) => PAD.top + plotH - (s / top) * plotH;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.total)}`).join("");
  const area = points.length
    ? `${line}L${x(points.length - 1)},${PAD.top + plotH}L${x(0)},${PAD.top + plotH}Z`
    : "";
  const labelEvery = Math.max(1, Math.ceil(40 / Math.max(step, 1)));
  const hovered = active !== null ? points[active] : null;

  return (
    <figure className="m-0">
      <div ref={ref} className="relative w-full select-none" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={caption}
            className="block overflow-visible"
            onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
            onPointerMove={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const px = e.clientX - box.left;
              const i = Math.round((px - PAD.left) / Math.max(step, 1));
              setActive(Math.min(points.length - 1, Math.max(0, points.length > 1 ? i : 0)));
            }}
            onPointerDown={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const i = Math.round((e.clientX - box.left - PAD.left) / Math.max(step, 1));
              setActive(Math.min(points.length - 1, Math.max(0, points.length > 1 ? i : 0)));
            }}
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
            <path d={area} fill="var(--accent)" opacity={0.1} />
            <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
            {points.map((p, i) =>
              i === points.length - 1 || (points.length - 1 - i) % labelEvery === 0 ? (
                <text
                  key={p.month}
                  x={x(i)}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-fg-3 text-[11px]"
                >
                  {p.label}
                </text>
              ) : null,
            )}
            {hovered && active !== null && (
              <g>
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={PAD.top}
                  y2={PAD.top + plotH}
                  stroke="var(--border-strong)"
                />
                <circle
                  cx={x(active)}
                  cy={y(hovered.total)}
                  r={4.5}
                  fill="var(--accent)"
                  stroke="var(--bg)"
                  strokeWidth={2}
                />
              </g>
            )}
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
              left: Math.min(Math.max(x(active) - 90, 0), Math.max(0, width - 180)),
              top: Math.max(0, y(hovered.total) - 12),
              width: 180,
            }}
          >
            <p className="text-fg-2 first-letter:uppercase">{hovered.title}</p>
            <p className="mt-0.5 text-[14px] font-semibold text-fg tabular-nums">
              {formatDuration(hovered.total)}
            </p>
            <p className="text-fg-3">+{formatDuration(hovered.seconds)} no mês</p>
          </div>
        )}
      </div>
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th>Mês</th>
              <th>No mês</th>
              <th>Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.month}>
                <td>{p.title}</td>
                <td>{formatDuration(p.seconds)}</td>
                <td>{formatDuration(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
