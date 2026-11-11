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
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
          {title}
        </h1>
        {description && <div className="mt-1.5 text-[14px] text-fg-2">{description}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Seção com título à esquerda e conteúdo à direita no desktop; empilha no celular. */
export function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-5 border-t border-border py-8 first:border-t-0 first:pt-0 md:grid-cols-[240px_1fr] md:gap-10",
        className,
      )}
    >
      <div>
        <h2 className="text-[14px] font-semibold text-fg">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-fg-3">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
