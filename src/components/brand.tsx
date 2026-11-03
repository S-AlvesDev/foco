import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Marca: um "F" inclinado, de traços retos e pontas cortadas, em degradê aço → violeta.
 * Desenhado em 24×24 para ficar nítido de 18 a 40 px.
 */
export function BrandMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-6", className)}>
      <defs>
        <linearGradient id={id} x1="3" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--steel)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <g transform="translate(5.4 0) skewX(-15)" fill={`url(#${id})`}>
        <rect x="3" y="2.5" width="4.2" height="19" rx="0.6" />
        <rect x="3" y="2.5" width="16" height="4.2" rx="0.6" />
        <rect x="3" y="10.4" width="11.5" height="3.9" rx="0.6" />
      </g>
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="text-[15px] font-semibold tracking-[0.06em] text-fg">FOCO AÍ</span>
    </span>
  );
}
