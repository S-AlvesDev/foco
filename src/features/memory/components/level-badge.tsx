import { cn } from "@/lib/utils";
import { LEVEL_HINTS, LEVEL_LABELS, type Level } from "../fsrs";

export const LEVEL_DOT: Record<Level, string> = {
  critico: "bg-danger",
  fragil: "bg-warning",
  consolidando: "bg-steel",
  consolidado: "bg-accent",
  dominado: "bg-success",
  novo: "bg-fg-3/60",
};

const TEXT: Record<Level, string> = {
  critico: "text-danger",
  fragil: "text-warning",
  consolidando: "text-steel",
  consolidado: "text-accent",
  dominado: "text-success",
  novo: "text-fg-3",
};

/** Indicador de domínio de um tópico: ponto colorido + nome do nível. */
export function LevelBadge({
  level,
  className,
  compact,
}: {
  level: Level;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/60 px-2 py-0.5 text-[12px] font-medium whitespace-nowrap",
        TEXT[level],
        className,
      )}
      title={LEVEL_HINTS[level]}
    >
      <span className={cn("size-1.5 rounded-full", LEVEL_DOT[level])} aria-hidden />
      {compact && level === "novo" ? "Nova" : LEVEL_LABELS[level]}
    </span>
  );
}

/** Só o ponto (índice da disciplina), com o nome do nível para leitores de tela. */
export function LevelDot({ level }: { level: Level }) {
  return (
    <span
      className={cn("inline-block size-1.5 shrink-0 rounded-full", LEVEL_DOT[level])}
      title={LEVEL_LABELS[level]}
    >
      <span className="sr-only">{LEVEL_LABELS[level]}</span>
    </span>
  );
}
