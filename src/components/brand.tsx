import { cn } from "@/lib/utils";

/**
 * Marca: um anel aberto que se fecha em um ponto, a ideia de "foco".
 * Desenhada à mão em 20×20 para ficar nítida em 16–28 px.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className={cn("size-5", className)}>
      <rect width="20" height="20" rx="5" fill="var(--accent)" />
      <path d="M14.2 6.9A5 5 0 1 0 15 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="10" r="1.7" fill="white" />
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Foco aí</span>
    </span>
  );
}
