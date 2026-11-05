import { useId } from "react";

/** Arcos concêntricos em violeta, saindo de um canto. Eco das órbitas da marca. */
export function OrbitArcs({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden className={className} viewBox="0 0 600 600" fill="none">
      <defs>
        <linearGradient id={`${id}-arc`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b6bff" stopOpacity="0.9" />
          <stop offset="0.7" stopColor="#6a4be8" stopOpacity="0.25" />
          <stop offset="1" stopColor="#6a4be8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[230, 300, 380, 470].map((r, i) => (
        <circle
          key={r}
          cx="-40"
          cy="-60"
          r={r}
          stroke={`url(#${id}-arc)`}
          strokeWidth={i === 1 ? 2 : 1.25}
          opacity={0.75 - i * 0.14}
        />
      ))}
    </svg>
  );
}
