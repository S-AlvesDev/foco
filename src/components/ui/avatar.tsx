import { initials } from "@/lib/utils";

/** Avatar: a foto, quando existe; senão, as iniciais numa cor derivada do nome (estável entre aparelhos). */
const HUES = [248, 210, 172, 140, 28, 330, 280, 196];

export function Avatar({ name, size = 28, src }: { name: string; size?: number; src?: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário do Storage
      <img
        src={src}
        alt=""
        aria-hidden
        width={size}
        height={size}
        className="shrink-0 rounded-full bg-surface-2 object-cover"
        style={{ width: size, height: size }}
        decoding="async"
      />
    );
  }
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
