"use client";

import { Pause, Play, Plus, Square, Timer as TimerIcon, PencilLine, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { clock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useElapsed, useStudy } from "../study-provider";

function useTimerView() {
  const { timer, offset, data } = useStudy();
  const elapsed = useElapsed(timer, offset);
  const subject = data?.subjects.find((s) => s.id === timer?.subject_id);
  return { timer, elapsed, subject };
}

function PauseResume({ size = "md" }: { size?: "sm" | "md" }) {
  const { timer, pause, resume, busy } = useStudy();
  if (!timer) return null;
  const running = timer.status === "running";
  return (
    <button
      type="button"
      onClick={running ? pause : resume}
      disabled={busy}
      aria-label={running ? "Pausar cronômetro" : "Continuar cronômetro"}
      className={cn(
        "flex shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg disabled:opacity-50",
        size === "sm" ? "size-9" : "size-8",
      )}
    >
      {running ? (
        <Pause className="size-4" fill="currentColor" />
      ) : (
        <Play className="size-4" fill="currentColor" />
      )}
    </button>
  );
}

function Stop({ size = "md" }: { size?: "sm" | "md" }) {
  const { openFinish } = useStudy();
  return (
    <button
      type="button"
      onClick={openFinish}
      aria-label="Finalizar sessão"
      className={cn(
        "flex shrink-0 cursor-pointer items-center justify-center rounded-md bg-accent text-accent-fg transition-colors hover:bg-accent-hover",
        size === "sm" ? "size-9" : "size-8",
      )}
    >
      <Square className="size-3.5" fill="currentColor" />
    </button>
  );
}

/** Bloco no topo da sidebar: inicia ou mostra o cronômetro em andamento. */
export function SidebarTimer() {
  const { ready, openStart, openManual, data } = useStudy();
  const { timer, elapsed, subject } = useTimerView();

  if (!ready) return <div className="mx-2 h-[76px] rounded-lg bg-surface-2/50" aria-hidden />;

  if (!timer) {
    const noSubjects = data?.subjects.length === 0;
    return (
      <div className="mx-2 flex flex-col gap-1">
        <Button
          variant="secondary"
          className="w-full justify-start"
          onClick={() => openStart()}
          disabled={noSubjects}
          title={noSubjects ? "Cadastre uma matéria primeiro" : undefined}
        >
          <TimerIcon />
          Iniciar cronômetro
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => openManual()}
          disabled={noSubjects}
        >
          <PencilLine />
          Registrar sessão
        </Button>
      </div>
    );
  }

  const running = timer.status === "running";
  return (
    <div
      className="mx-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5"
      role="timer"
      aria-label={`Cronômetro: ${subject?.name ?? ""}`}
    >
      <div className="flex items-center gap-2 text-[12.5px] text-fg-2">
        <span
          className={cn("size-2 shrink-0 rounded-full", running && "animate-pulse [animation-duration:2s]")}
          style={{ background: subject?.color }}
          aria-hidden
        />
        <span className="truncate">{subject?.name ?? "Matéria"}</span>
        {!running && <span className="ml-auto shrink-0 text-fg-3">Pausado</span>}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span
          className={cn(
            "font-mono text-[20px] font-medium tracking-tight tabular-nums",
            running ? "text-fg" : "text-fg-3",
          )}
        >
          {clock(elapsed)}
        </span>
        <div className="flex items-center gap-1">
          <PauseResume />
          <Stop />
        </div>
      </div>
    </div>
  );
}

/** Pílula flutuante no celular, acima da navegação inferior. */
export function MobileTimerPill() {
  const { timer, elapsed, subject } = useTimerView();
  if (!timer) return null;
  const running = timer.status === "running";
  return (
    <div
      className="fixed inset-x-3 bottom-[calc(64px+env(safe-area-inset-bottom)+8px)] z-30 flex items-center gap-3 rounded-xl border border-border bg-surface-3/95 py-1.5 pr-1.5 pl-4 shadow-pop backdrop-blur-md md:hidden"
      role="timer"
      aria-label={`Cronômetro: ${subject?.name ?? ""}`}
    >
      <span
        className={cn("size-2 shrink-0 rounded-full", running && "animate-pulse [animation-duration:2s]")}
        style={{ background: subject?.color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] text-fg-2">
          {subject?.name ?? "Matéria"}
          {!running && <span className="text-fg-3">, pausado</span>}
        </p>
        <p
          className={cn(
            "font-mono text-[17px] leading-tight font-medium tabular-nums",
            running ? "text-fg" : "text-fg-3",
          )}
        >
          {clock(elapsed)}
        </p>
      </div>
      <PauseResume size="sm" />
      <Stop size="sm" />
    </div>
  );
}

/** Reserva espaço no fim da página para a pílula não cobrir conteúdo. */
export function MobileTimerSpacer() {
  const { timer } = useStudy();
  return timer ? <div className="h-[68px] md:hidden" aria-hidden /> : null;
}

/** Botão central da navegação inferior: cronômetro ou registro manual. */
export function MobileAddButton() {
  const { openStart, openManual, openReview, timer, data } = useStudy();
  const noSubjects = data?.subjects.length === 0;
  return (
    <div className="flex flex-1 items-center justify-center">
      <Menu>
        <MenuTrigger
          aria-label="Estudar"
          className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-fg shadow-[0_4px_14px_-4px_var(--accent)] transition-transform active:scale-95 data-[state=open]:rotate-45"
        >
          <Plus className="size-5" strokeWidth={2.25} />
        </MenuTrigger>
        <MenuContent side="top" align="center" sideOffset={10} className="min-w-[220px]">
          <MenuItem onSelect={() => openStart()} disabled={Boolean(timer) || noSubjects}>
            <TimerIcon />
            {timer ? "Cronômetro já está rodando" : "Iniciar cronômetro"}
          </MenuItem>
          <MenuItem onSelect={() => openManual()} disabled={noSubjects}>
            <PencilLine />
            Registrar sessão
          </MenuItem>
          <MenuItem onSelect={() => openReview()} disabled={noSubjects}>
            <CalendarClock />
            Agendar revisão
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}

/** Ações de estudo para uma matéria específica (página da matéria). */
export function SubjectStudyActions({ subjectId }: { subjectId: string }) {
  const { timer, quickStart, openManual, openFinish, busy, ready } = useStudy();
  const runningHere = timer?.subject_id === subjectId;
  return (
    <div className="flex flex-wrap gap-2">
      {runningHere ? (
        <Button variant="primary" onClick={openFinish}>
          <Square fill="currentColor" className="!size-3.5" />
          Finalizar sessão
        </Button>
      ) : (
        <Button
          variant="primary"
          onClick={() => quickStart(subjectId)}
          disabled={!ready || Boolean(timer) || busy}
          title={timer ? "Já existe um cronômetro rodando" : undefined}
        >
          <Play fill="currentColor" className="!size-3.5" />
          Iniciar cronômetro
        </Button>
      )}
      <Button variant="secondary" onClick={() => openManual({ subjectId })} disabled={!ready}>
        <PencilLine />
        Registrar sessão
      </Button>
    </div>
  );
}

/** Ações do painel. */
export function DashboardStudyActions() {
  const { timer, openStart, openManual, openFinish, ready, data } = useStudy();
  const noSubjects = data?.subjects.length === 0;
  return (
    <div className="flex flex-wrap gap-2">
      {timer ? (
        <Button variant="primary" onClick={openFinish}>
          <Square fill="currentColor" className="!size-3.5" />
          Finalizar sessão
        </Button>
      ) : (
        <Button variant="primary" onClick={() => openStart()} disabled={!ready || noSubjects}>
          <Play fill="currentColor" className="!size-3.5" />
          Iniciar cronômetro
        </Button>
      )}
      <Button variant="secondary" onClick={() => openManual()} disabled={!ready || noSubjects}>
        <PencilLine />
        Registrar sessão
      </Button>
    </div>
  );
}
