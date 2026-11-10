import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Minutos previstos de revisão por dia, com a linha do seu limite diário. */
export function ForecastBars({
  days,
  limit,
  today,
}: {
  days: { day: string; count: number; minutes: number }[];
  limit: number;
  today: string;
}) {
  const max = Math.max(limit * 1.25, ...days.map((d) => d.minutes), 1);
  const over = days.filter((d) => d.minutes > limit).length;
  const total = days.reduce((s, d) => s + d.count, 0);
  const H = 96;
  return (
    <figure>
      <div
        className="relative"
        style={{ height: H }}
        role="img"
        aria-label={`Revisões previstas nos próximos ${days.length} dias: ${total} tópicos; ${over} dias acima do limite de ${limit} minutos`}
      >
        <div
          className="absolute inset-x-0 border-t border-dashed border-fg-3/60"
          style={{ bottom: (limit / max) * H }}
          aria-hidden
        >
          <span className="absolute -top-4 right-0 text-[11px] text-fg-3">seu limite · {limit} min</span>
        </div>
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {days.map((d, i) => (
            <div
              key={d.day}
              className={cn(
                "min-w-0 flex-1 rounded-t-[3px]",
                d.minutes > limit ? "bg-warning/80" : i === 0 ? "bg-accent" : "bg-steel/45",
              )}
              style={{ height: d.minutes ? Math.max(3, (d.minutes / max) * H) : 0 }}
              title={`${shortDate(d.day, today)}: ${d.count} ${d.count === 1 ? "tópico" : "tópicos"}, ~${d.minutes} min`}
            />
          ))}
        </div>
      </div>
      <figcaption className="mt-1.5 flex justify-between text-[11.5px] text-fg-3">
        <span>hoje</span>
        <span>{shortDate(days[Math.floor(days.length / 2)]?.day ?? today, today)}</span>
        <span>{shortDate(days.at(-1)?.day ?? today, today)}</span>
      </figcaption>
    </figure>
  );
}
