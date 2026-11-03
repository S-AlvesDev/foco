import { useId } from "react";

/**
 * Arte padrão do banner: cordilheira em camadas ao anoitecer, nas cores do app.
 * Gerada de forma determinística (mesmo desenho sempre), sem arquivo para baixar.
 * Ancorada embaixo: em telas verticais o céu é cortado, as montanhas não.
 */

const W = 1600;
const H = 640;

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Linha de cume: soma de ondas + ruído, suavizada com curvas. */
function ridge(seed: number, base: number, amp: number, step: number, sharp = 1) {
  const r = rng(seed);
  const phase = [r() * 6, r() * 6, r() * 6];
  const pts: [number, number][] = [];
  for (let x = -step; x <= W + step; x += step) {
    const t = x / W;
    const wave =
      Math.sin(t * 3.1 + phase[0]) * 0.55 +
      Math.sin(t * 7.3 + phase[1]) * 0.3 +
      Math.sin(t * 17 + phase[2]) * 0.15;
    const noise = (r() - 0.5) * 0.5 * sharp;
    pts.push([x, base - (wave + noise) * amp]);
  }
  let d = `M${pts[0][0]},${H} L${pts[0][0]},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    d += ` Q${x0.toFixed(1)},${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)},${((y0 + y1) / 2).toFixed(1)}`;
  }
  d += ` L${W + step},${H} Z`;
  return d;
}

const STARS = (() => {
  const r = rng(7);
  return Array.from({ length: 70 }, () => ({
    x: r() * W,
    y: r() * H * 0.45,
    s: r() < 0.12 ? 1.4 : 0.8,
    o: 0.15 + r() * 0.45,
  }));
})();

const LAYERS = [
  { d: ridge(11, 300, 80, 80, 0.6), fill: "#4a4690", opacity: 0.55 },
  { d: ridge(23, 380, 95, 64, 0.9), fill: "#2f2d66", opacity: 0.9 },
  { d: ridge(37, 465, 80, 48, 1.2), fill: "#1c1b40", opacity: 1 },
  { d: ridge(41, 550, 60, 40, 1.4), fill: "#0e0e1d", opacity: 1 },
];

export function DefaultBannerArt({ className }: { className?: string }) {
  // IDs únicos: a mesma arte aparece no painel e na prévia das configurações.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (n: string) => `${uid}-${n}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={id("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#07080d" />
          <stop offset="0.55" stopColor="#141533" />
          <stop offset="1" stopColor="#2a2350" />
        </linearGradient>
        <radialGradient id={id("glow")} cx="0.74" cy="0.62" r="0.5">
          <stop offset="0" stopColor="#8a7cff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#7366ef" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("glow2")} cx="0.2" cy="0.7" r="0.45">
          <stop offset="0" stopColor="#5b8de6" stopOpacity="0.25" />
          <stop offset="1" stopColor="#5b8de6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("mist")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8f88ff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#8f88ff" stopOpacity="0.09" />
          <stop offset="1" stopColor="#8f88ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id("sky")})`} />
      <rect width={W} height={H} fill={`url(#${id("glow")})`} />
      <rect width={W} height={H} fill={`url(#${id("glow2")})`} />
      <g fill="#dfe3ff">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r={s.s} opacity={s.o.toFixed(2)} />
        ))}
      </g>
      {LAYERS.map((l, i) => (
        <g key={i}>
          <path d={l.d} fill={l.fill} opacity={l.opacity} />
          {/* Contorno de luz no cume */}
          {i < 3 && (
            <path d={l.d} fill="none" stroke="#a9a2ff" strokeOpacity={0.16 - i * 0.04} strokeWidth={1.5} />
          )}
          {i < 3 && <rect y={300 + i * 70} width={W} height={120} fill={`url(#${id("mist")})`} />}
        </g>
      ))}
    </svg>
  );
}
