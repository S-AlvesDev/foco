import { cn } from "@/lib/utils";

/** Container de página: largura de leitura, margens generosas, respiro no topo. */
const PAGE_SIZES = {
  /** Fluxos de foco: resolver questões, revisar, ler uma lista curta. */
  narrow: "max-w-[800px]",
  /** Todas as outras páginas: a mesma largura, para o conteúdo não "pular" ao navegar. */
  default: "max-w-[1040px]",
} as const;

export function Page({
  children,
  className,
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: keyof typeof PAGE_SIZES;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 pt-6 pb-16 sm:px-8 sm:pt-10", PAGE_SIZES[size], className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[34px]">
          {title}
        </h1>
        {description && <div className="mt-1.5 text-[14px] text-fg-2">{description}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Seção de ajustes: um painel com título, descrição e o conteúdo embaixo. */
export function Section({
  id,
  title,
  description,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      data-settings-section={id ? "" : undefined}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card",
        className,
      )}
    >
      <div className="border-b border-border px-5 py-4 sm:px-7 sm:py-5">
        <h2 className="font-display text-[18px] leading-tight font-semibold text-fg">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-fg-3">{description}</p>}
      </div>
      <div className="min-w-0 px-5 py-5 sm:px-7 sm:py-7">{children}</div>
    </section>
  );
}
