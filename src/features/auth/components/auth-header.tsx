export function AuthHeader({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em] text-fg">{title}</h1>
      {description && <p className="mt-1.5 text-[14px] leading-relaxed text-fg-2">{description}</p>}
    </div>
  );
}

export function AuthFooter({ children }: { children: React.ReactNode }) {
  return <p className="mt-8 text-center text-[13px] text-fg-2">{children}</p>;
}

export const authLinkClass =
  "font-medium text-fg underline decoration-border-strong underline-offset-[3px] transition-colors hover:decoration-fg-2";
