import { useId } from "react";

export { OrbitArcs } from "@/components/orbit-arcs";

/*
 * Artes da tela de entrada. Tudo em SVG: nítido em qualquer tela e sem arquivo para baixar.
 * São decorativas (aria-hidden); o texto ao lado carrega a mensagem.
 */

const BOOKS = [
  { label: "Evolução", end: 560, y: 262, tilt: -1.2 },
  { label: "Conhecimento", end: 548, y: 196, tilt: -2.2 },
  { label: "Faculdade", end: 512, y: 132, tilt: -3.4 },
  { label: "Concursos públicos", end: 470, y: 66, tilt: -5.2 },
];

/** Pilha de livros diante de um gráfico subindo: estudo que vira resultado. */
export function StudyStack({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const bars = [
    { x: 520, h: 120 },
    { x: 574, h: 170 },
    { x: 628, h: 150 },
    { x: 682, h: 230 },
    { x: 736, h: 290 },
  ];
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 800 340"
      fill="none"
      preserveAspectRatio="xMinYMax meet"
    >
      <defs>
        <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7b5cff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7b5cff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-arrow`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#7b5cff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#7b5cff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#a48cff" />
        </linearGradient>
        <linearGradient id={`${id}-spine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2f72" />
          <stop offset="0.5" stopColor="#272055" />
          <stop offset="1" stopColor="#1a1540" />
        </linearGradient>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2c2560" />
          <stop offset="1" stopColor="#4a3f8f" />
        </linearGradient>
        <linearGradient id={`${id}-pages`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a4fa0" />
          <stop offset="1" stopColor="#2a2358" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.35" cy="1" r="0.75">
          <stop offset="0" stopColor="#6d4bff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#6d4bff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect x="0" y="120" width="800" height="220" fill={`url(#${id}-glow)`} />

      {/* Gráfico ao fundo */}
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={330 - b.h} width="38" height={b.h} rx="4" fill={`url(#${id}-bar)`} />
      ))}
      <path
        d="M430 250 L560 175 L620 196 L760 40"
        stroke={`url(#${id}-arrow)`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
        filter={`url(#${id}-blur)`}
      />
      <path
        d="M430 250 L560 175 L620 196 L760 40"
        stroke={`url(#${id}-arrow)`}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M786 12 L732 26 L772 66 Z" fill="#a48cff" />

      {/* Livros, de baixo para cima */}
      {BOOKS.map((b) => {
        const h = 58;
        return (
          <g key={b.label} transform={`rotate(${b.tilt} ${b.end} ${b.y + h})`}>
            {/* capa de cima */}
            <path
              d={`M-40 ${b.y} L${b.end - 22} ${b.y} L${b.end - 4} ${b.y - 9} L-40 ${b.y - 9} Z`}
              fill={`url(#${id}-top)`}
            />
            {/* lombada */}
            <rect x="-40" y={b.y} width={b.end + 40} height={h} rx="6" fill={`url(#${id}-spine)`} />
            <rect x="-40" y={b.y} width={b.end + 40} height="1.5" fill="#8c7fe0" opacity="0.35" />
            {/* páginas */}
            <path
              d={`M${b.end - 22} ${b.y + 4} Q${b.end + 2} ${b.y + 2} ${b.end + 2} ${b.y + h / 2} Q${b.end + 2} ${b.y + h - 2} ${b.end - 22} ${b.y + h - 4} Z`}
              fill={`url(#${id}-pages)`}
            />
            <line
              x1={b.end - 60}
              y1={b.y + 8}
              x2={b.end - 60}
              y2={b.y + h - 8}
              stroke="#8c7fe0"
              strokeOpacity="0.28"
            />
            <line
              x1={b.end - 54}
              y1={b.y + 8}
              x2={b.end - 54}
              y2={b.y + h - 8}
              stroke="#8c7fe0"
              strokeOpacity="0.18"
            />
            <text
              x="80"
              y={b.y + h / 2 + 7}
              fill="#a99fe6"
              fillOpacity="0.72"
              fontSize="19"
              fontWeight="600"
              letterSpacing="3.6"
              style={{ textTransform: "uppercase" }}
            >
              {b.label}
            </text>
          </g>
        );
      })}
      <rect x="0" y="322" width="800" height="18" fill="#0b0a1c" opacity="0.6" />
    </svg>
  );
}

/** Borda curva entre o painel escuro e o claro, com um brilho violeta do lado escuro. */
export function CurvedSeam({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const curve = "M118 0 C40 250 2 420 2 540 C2 690 58 850 138 1000";
  return (
    <svg aria-hidden className={className} viewBox="0 0 150 1000" preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7b5cff" stopOpacity="0.1" />
          <stop offset="0.65" stopColor="#7b5cff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#9b7bff" stopOpacity="0.9" />
        </linearGradient>
        <filter id={`${id}-b`} x="-50%" y="-5%" width="200%" height="110%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <path d={curve} stroke={`url(#${id}-g)`} strokeWidth="26" filter={`url(#${id}-b)`} />
      <path d={`${curve} H150 V0 Z`} fill="var(--auth-light)" />
      <path d={curve} stroke={`url(#${id}-g)`} strokeWidth="1.5" />
    </svg>
  );
}

/** Faixas diagonais claras no fundo do lado do formulário. */
export function LightBands({ className }: { className?: string }) {
  const band = (x: number, w: number) => `${x},1000 ${x + w},1000 ${x + w + 760},0 ${x + 760},0`;
  return (
    <svg aria-hidden className={className} viewBox="0 0 800 1000" preserveAspectRatio="xMaxYMid slice">
      <polygon points={band(-260, 170)} fill="#ffffff" opacity="0.65" />
      <polygon points={band(60, 80)} fill="#ffffff" opacity="0.55" />
      <polygon points={band(330, 230)} fill="#ffffff" opacity="0.5" />
      <polygon points={band(700, 120)} fill="#e6e4f3" opacity="0.6" />
    </svg>
  );
}
