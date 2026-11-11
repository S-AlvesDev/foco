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
      <div className="min-w-0">
        <h2 id={id} className="font-display flex items-center gap-2 text-[15.5px] font-semibold text-fg">
          <Icon className="size-4 shrink-0 text-fg-3" strokeWidth={1.9} aria-hidden />
          <span className="truncate">{title}</span>
        </h2>
        {sub && <p className="mt-0.5 truncate text-[12.5px] text-fg-3">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
