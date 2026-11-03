import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Superfície discreta para blocos do painel. */
export function Card({ children, className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

/** Cabeçalho do card: ícone, título (rotula a seção via `id`) e uma ação opcional à direita. */
export function CardHeader({
  id,
  icon: Icon,
  title,
  sub,
  action,
  className,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-steel">
          <Icon className="size-[17px]" strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id={id} className="truncate text-[15px] font-semibold tracking-[-0.01em] text-fg">
            {title}
          </h2>
          {sub && <p className="truncate text-[12.5px] text-fg-3">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
