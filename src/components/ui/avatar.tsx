import { initials } from "@/lib/utils";

/** Avatar de iniciais. A cor é derivada do nome, então é estável entre aparelhos. */
const HUES = [248, 210, 172, 140, 28, 330, 280, 196];

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = HUES[hash % HUES.length];
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[0.01em] text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: `oklch(0.55 0.09 ${hue})`,
      }}
    >
      {initials(name)}
    </span>
  );
}
