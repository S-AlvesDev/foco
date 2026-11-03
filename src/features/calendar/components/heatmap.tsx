"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MONTHS_SHORT, WEEKDAYS_SHORT, longDayLabel } from "@/lib/dates";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { intensity, type DayCell } from "../grid";

const CELL = 12;
const GAP = 3;

/** Mapa anual estilo "contribuições": uma coluna por semana, um tom por intensidade. */
export function Heatmap({
  columns,
  totals,
  dailyGoalMinutes,
  weekStartsOn,
}: {
  columns: DayCell[][];
  totals: Record<string, number>;
  dailyGoalMinutes: number | null;
  weekStartsOn: number;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ cell: DayCell; x: number; y: number } | null>(null);

  // No celular, mostra primeiro as semanas mais recentes.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const studied = columns.flat().filter((c) => !c.future && (totals[c.date] ?? 0) > 0).length;
  const total = columns.flat().reduce((s, c) => s + (totals[c.date] ?? 0), 0);

  return (
    <div>
      <p className="mb-3 text-[13px] text-fg-2 tabular-nums">
        <span className="font-medium text-fg">{formatDuration(total)}</span> em {studied} dias nas últimas 53
        semanas
      </p>
      <div ref={scroller} className="relative overflow-x-auto pb-2" onPointerLeave={() => setHover(null)}>
        <div className="relative inline-flex gap-2">
          <div className="flex flex-col pt-[18px] text-[11px] text-fg-3" style={{ gap: GAP }} aria-hidden>
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="leading-none" style={{ height: CELL }}>
                {i % 2 === 0 ? WEEKDAYS_SHORT[(weekStartsOn + i) % 7] : ""}
              </span>
            ))}
          </div>
          <div>
            <div className="relative mb-1.5 h-3 text-[11px] text-fg-3" aria-hidden>
              {columns.map((col, i) => {
                const first = col.find((c) => c.date.slice(8) === "01");
                return first ? (
                  <span key={i} className="absolute leading-none" style={{ left: i * (CELL + GAP) }}>
                    {MONTHS_SHORT[Number(first.date.slice(5, 7)) - 1]}
                  </span>
                ) : null;
              })}
            </div>
            <div
              className="flex"
              style={{ gap: GAP }}
              role="grid"
              aria-label="Dias estudados nas últimas 53 semanas"
            >
              {columns.map((col, i) => (
                <div key={i} className="flex flex-col" style={{ gap: GAP }} role="row">
                  {col.map((c) => {
                    const secs = totals[c.date] ?? 0;
                    const label = `${longDayLabel(c.date)}: ${secs ? formatDuration(secs) : "sem estudo"}`;
                    if (c.future)
                      return <span key={c.date} style={{ width: CELL, height: CELL }} aria-hidden />;
                    return (
                      <Link
                        key={c.date}
                        role="gridcell"
                        href={`/calendario?mes=${c.date.slice(0, 7)}&dia=${c.date}`}
                        scroll={false}
                        aria-label={label}
                        onPointerEnter={(e) => {
                          const box = (
                            e.currentTarget.offsetParent as HTMLElement | null
                          )?.getBoundingClientRect();
                          const r = e.currentTarget.getBoundingClientRect();
                          setHover({ cell: c, x: r.left - (box?.left ?? 0), y: r.top - (box?.top ?? 0) });
                        }}
                        className={cn(
                          "block rounded-[3px] outline-offset-1 transition-transform hover:scale-125",
                          `level-${intensity(secs, dailyGoalMinutes)}`,
                          c.today && "ring-1 ring-fg-2",
                        )}
                        style={{ width: CELL, height: CELL }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {hover && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-surface-3 px-2.5 py-1.5 text-[12px] whitespace-nowrap shadow-pop"
              style={{ left: hover.x + CELL / 2, top: hover.y - 6 }}
            >
              <span className="text-fg-2">{longDayLabel(hover.cell.date)}</span>
              <span className="ml-2 font-medium text-fg tabular-nums">
                {totals[hover.cell.date] ? formatDuration(totals[hover.cell.date]) : "sem estudo"}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[12px] text-fg-3">
        <span>
          {dailyGoalMinutes
            ? `Tons pela sua meta diária de ${formatDuration(dailyGoalMinutes * 60)}.`
            : "Tons: até 30 min, 1h, 2h e mais de 2h."}
        </span>
        <span className="flex items-center gap-1.5" aria-hidden>
          Menos
          {[0, 1, 2, 3, 4].map((l) => (
            <span
              key={l}
              className={`level-${l} inline-block rounded-[3px]`}
              style={{ width: CELL, height: CELL }}
            />
          ))}
          Mais
        </span>
      </div>
    </div>
  );
}
