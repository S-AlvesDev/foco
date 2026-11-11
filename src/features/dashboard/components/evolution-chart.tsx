"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatDuration, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Bucket } from "../aggregate";

type SubjectMeta = Record<string, { name: string; color: string }>;

const HEIGHT = 200;
const PAD = { top: 12, right: 4, bottom: 26, left: 40 };
const STEPS_MIN = [15, 30, 60, 120, 180, 240, 360, 480, 600, 720, 1200, 1500, 3000, 6000, 12000];

/** Escala com no máximo 4 linhas de grade, em passos "redondos" de horas. */
export function niceScale(maxSeconds: number) {
  const maxMin = Math.max(maxSeconds / 60, 1);
  const step = STEPS_MIN.find((s) => maxMin / s <= 4) ?? Math.ceil(maxMin / 4 / 60) * 60;
  const top = Math.max(step, Math.ceil(maxMin / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v * 60);
  return { top: top * 60, ticks };
}

export function tickLabel(seconds: number) {
  if (seconds === 0) return "0";
  const m = seconds / 60;
  return m < 60 ? `${m}min` : `${Math.round((m / 60) * 10) / 10}h`.replace(".", ",");
}

/** Caminho de uma coluna com cantos de 4px só no topo (base reta). */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function EvolutionChart({
  buckets,
  subjects,
  caption,
  goalSeconds,
}: {
  buckets: Bucket[];
  subjects: SubjectMeta;
  caption: string;
  /** Linha de referência opcional (ex.: meta diária). */
  goalSeconds?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const gradient = useId();
  const twoLines = buckets.some((b) => b.sublabel);
  const height = twoLines ? HEIGHT + 16 : HEIGHT;
  const bottom = twoLines ? PAD.bottom + 16 : PAD.bottom;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    // No toque, o tooltip fica até tocar fora do gráfico.
    const onOutside = (e: PointerEvent) => {
      if (!el.contains(e.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", onOutside);
    return () => {
      ro.disconnect();
      document.removeEventListener("pointerdown", onOutside);
    };
  }, []);

  const max = Math.max(...buckets.map((b) => b.seconds), goalSeconds ?? 0);
  const { top, ticks } = niceScale(max);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - bottom;
  const band = buckets.length ? plotW / buckets.length : 0;
  const barW = Math.max(2, Math.min(32, band * 0.5));
  const y = (s: number) => PAD.top + plotH - (s / top) * plotH;
  const labelEvery = Math.max(1, Math.ceil(34 / Math.max(band, 1)));
  const hovered = active !== null ? buckets[active] : null;

  return (
    <figure className="m-0">
      <div ref={ref} className="relative w-full select-none" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={caption}
            onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
            className="block overflow-visible"
          >
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--accent)" />
                <stop offset="1" stopColor="var(--accent)" stopOpacity="0.55" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
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
            {goalSeconds ? (
              <g>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(goalSeconds)}
                  y2={y(goalSeconds)}
                  stroke="var(--success)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              </g>
            ) : null}
            {buckets.map((b, i) => {
              const cx = PAD.left + band * i + band / 2;
              const h = (b.seconds / top) * plotH;
              const dim = active !== null && active !== i;
              const showLabel = i === buckets.length - 1 || (buckets.length - 1 - i) % labelEvery === 0;
              return (
                <g key={b.key}>
                  {b.seconds > 0 && (
                    <path
                      d={columnPath(cx - barW / 2, PAD.top + plotH - h, barW, h)}
                      fill={`url(#${gradient})`}
                      opacity={dim ? 0.35 : 1}
                      style={{ transition: "opacity 120ms" }}
                    />
                  )}
                  {showLabel && (
                    <text
                      x={cx}
                      y={PAD.top + plotH + 18}
                      textAnchor="middle"
                      className={cn("text-[11.5px]", b.current ? "fill-fg font-medium" : "fill-fg-2")}
                    >
                      {b.label}
                      {b.sublabel && (
                        <tspan x={cx} dy={15} className="fill-fg-3 text-[10.5px] font-normal">
                          {b.sublabel}
                        </tspan>
                      )}
                    </text>
                  )}
                  {/* Alvo de hover/toque: a faixa inteira, maior que a barra. */}
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
              strokeWidth={1}
            />
          </svg>
        )}
        {hovered && active !== null && (
          <Tooltip
            bucket={hovered}
            subjects={subjects}
            x={PAD.left + band * active + band / 2}
            y={y(hovered.seconds)}
            width={width}
          />
        )}
      </div>
      {/* Tabela para leitores de tela. */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th>Período</th>
              <th>Tempo</th>
              <th>Sessões</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.key}>
                <td>{b.title}</td>
                <td>{formatDuration(b.seconds)}</td>
                <td>{b.sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function Tooltip({
  bucket,
  subjects,
  x,
  y,
  width,
}: {
  bucket: Bucket;
  subjects: SubjectMeta;
  x: number;
  y: number;
  width: number;
}) {
  const W = 200;
  const left = Math.min(Math.max(x - W / 2, 0), Math.max(0, width - W));
  const top = Math.max(0, y - 12);
  const shown = bucket.bySubject.slice(0, 4);
  const rest = bucket.bySubject.length - shown.length;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-y-full rounded-lg bg-surface-3 px-3 py-2.5 text-[12.5px] shadow-pop"
      style={{ left, top, width: W }}
    >
      <p className="text-fg-2">{bucket.title}</p>
      <p className="mt-0.5 text-[14px] font-semibold text-fg tabular-nums">
        {formatDuration(bucket.seconds)}
        <span className="ml-1.5 text-[12px] font-normal text-fg-3">
          {bucket.sessions ? plural(bucket.sessions, "sessão", "sessões") : "sem sessões"}
        </span>
      </p>
      {shown.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-1 border-t border-border pt-1.5">
          {shown.map((s) => (
            <li key={s.subjectId} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: subjects[s.subjectId]?.color }}
              />
              <span className="min-w-0 flex-1 truncate text-fg-2">
                {subjects[s.subjectId]?.name ?? "Matéria"}
              </span>
              <span className="text-fg tabular-nums">{formatDuration(s.seconds)}</span>
            </li>
          ))}
          {rest > 0 && <li className="text-fg-3">e mais {rest}</li>}
        </ul>
      )}
    </div>
  );
}
