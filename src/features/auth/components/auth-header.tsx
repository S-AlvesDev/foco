export function AuthHeader({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[28px] leading-[1.1] font-bold tracking-[-0.03em] text-fg sm:text-[36px] lg:text-[40px]">
        {title}
      </h1>
      {description && (
        <p className="mt-2.5 text-[15px] leading-relaxed text-fg-2 sm:text-[16px]">{description}</p>
      )}
    </div>
  );
}

export function AuthFooter({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-7 flex items-center gap-3 text-[13.5px] whitespace-nowrap text-fg-2 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
      <span>{children}</span>
    </p>
  );
}

export const authLinkClass =
  "font-semibold text-accent underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-current";

/** Botão principal das telas de entrada: alto, largo, com o ícone sumindo durante o envio. */
export const authSubmitClass =
  "mt-3 h-12 w-full rounded-[10px] text-[15px] [&_svg]:size-[18px] aria-busy:[&_.lucide:not(.animate-spin)]:hidden";
