import { cn } from "@/lib/utils";

/** Container de página: largura de leitura, margens generosas, respiro no topo. */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[960px] px-4 pt-6 pb-12 sm:px-8 sm:pt-10", className)}>
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
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
          {title}
        </h1>
        {description && <div className="mt-1 text-[14px] text-fg-2">{description}</div>}
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
