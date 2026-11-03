"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { clock } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { localDateISO } from "@/lib/format";
import { pauseTimerAction, resumeTimerAction, startTimerAction } from "./actions";
import { TIMER_COLUMNS, type StudyContext, type Timer } from "./types";
import { FinishTimerDialog } from "./components/finish-timer-dialog";
import { StartTimerDialog } from "./components/start-timer-dialog";
import { SessionFormDialog, type SessionDraft } from "@/features/sessions/components/session-form-dialog";

type Api = {
  ready: boolean;
  data: StudyContext | null;
  timer: Timer | null;
  /** Diferença relógio do servidor − aparelho (ms). */
  offset: number;
  busy: boolean;
  openStart: (subjectId?: string) => void;
  openFinish: () => void;
  openManual: (draft?: Partial<SessionDraft>) => void;
  quickStart: (subjectId: string) => void;
  pause: () => void;
  resume: () => void;
  /** Recarrega do servidor e avisa as outras abas. */
  sync: (timer?: Timer | null, serverNow?: number) => void;
};

const Ctx = createContext<Api | null>(null);

export function useStudy() {
  const api = use(Ctx);
  if (!api) throw new Error("useStudy precisa de <StudyProvider>.");
  return api;
}

const CHANNEL = "foco-timer";

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StudyContext | null>(null);
  const [offset, setOffset] = useState(0);
  const [busy, startTransition] = useTransition();
  const [startOpen, setStartOpen] = useState<{ subjectId?: string } | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [manual, setManual] = useState<Partial<SessionDraft> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);

  const supabase = useMemo(() => createClient(), []);

  /**
   * Lê direto do Supabase no navegador (o RLS limita aos dados do usuário).
   * Não usa Server Action de propósito: renovar cookies dentro de uma action
   * faz o Next.js renderizar a página de novo no meio do carregamento.
   */
  const load = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user.id;
      if (!userId) return;
      const sent = Date.now();
      const [timer, subjects, last, profile, clockRes] = await Promise.all([
        supabase.from("active_timers").select(TIMER_COLUMNS).maybeSingle(),
        supabase
          .from("subjects")
          .select("id, name, color")
          .is("archived_at", null)
          .order("position")
          .order("created_at"),
        supabase
          .from("study_sessions")
          .select("subject_id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("profiles").select("timezone").eq("id", userId).single(),
        fetch("/api/agora", { cache: "no-store" }).then((r) => r.json() as Promise<{ now: number }>),
      ]);
      if (timer.error || subjects.error || profile.error) return;
      const received = Date.now();
      const serverNow = clockRes.now;
      setOffset(serverNow - (sent + received) / 2);
      setData({
        timer: timer.data,
        subjects: subjects.data ?? [],
        timezone: profile.data.timezone,
        todayISO: localDateISO(profile.data.timezone, new Date(serverNow)),
        lastSubjectId: last.data?.subject_id ?? null,
        serverNow,
      });
    } catch {
      // Sem rede: mantém o último estado conhecido; tenta de novo no próximo foco.
    }
  }, [supabase]);

  // Carga inicial, ao voltar para a aba e quando outra aba mexe no cronômetro.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    if ("BroadcastChannel" in window) {
      channel.current = new BroadcastChannel(CHANNEL);
      channel.current.onmessage = () => void load();
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      channel.current?.close();
    };
  }, [load]);

  const sync = useCallback(
    (timer?: Timer | null, serverNow?: number) => {
      if (timer !== undefined) {
        setData((d) => (d ? { ...d, timer } : d));
        if (serverNow) setOffset(serverNow - Date.now());
      }
      channel.current?.postMessage("changed");
      void load();
    },
    [load],
  );

  const run = useCallback(
    (
      fn: () => Promise<
        { ok: true; timer: Timer | null; serverNow: number } | { ok: false; message: string }
      >,
    ) =>
      startTransition(async () => {
        const res = await fn();
        if (res.ok) sync(res.timer, res.serverNow);
        else {
          toast.error(res.message);
          sync();
        }
      }),
    [sync],
  );

  const api = useMemo<Api>(
    () => ({
      ready: data !== null,
      data,
      timer: data?.timer ?? null,
      offset,
      busy,
      openStart: (subjectId) => setStartOpen({ subjectId }),
      openFinish: () => setFinishOpen(true),
      openManual: (draft) => setManual(draft ?? {}),
      quickStart: (subjectId) => run(() => startTimerAction({ subjectId })),
      pause: () => run(pauseTimerAction),
      resume: () => run(resumeTimerAction),
      sync,
    }),
    [data, offset, busy, run, sync],
  );

  return (
    <Ctx value={api}>
      {children}
      <TitleClock />
      {data && (
        <>
          <StartTimerDialog
            open={startOpen !== null}
            onOpenChange={(o) => !o && setStartOpen(null)}
            subjects={data.subjects}
            defaultSubjectId={startOpen?.subjectId ?? data.lastSubjectId ?? undefined}
          />
          <FinishTimerDialog open={finishOpen} onOpenChange={setFinishOpen} />
          <SessionFormDialog
            open={manual !== null}
            onOpenChange={(o) => !o && setManual(null)}
            subjects={data.subjects}
            todayISO={data.todayISO}
            draft={{ subjectId: data.lastSubjectId ?? data.subjects[0]?.id, ...manual }}
          />
        </>
      )}
    </Ctx>
  );
}

/** Segundos cronometrados, atualizando a cada segundo enquanto roda. */
export function useElapsed(timer: Timer | null, offset: number) {
  const compute = useCallback(() => {
    if (!timer) return 0;
    const running =
      timer.status === "running" && timer.segment_started_at
        ? (Date.now() + offset - Date.parse(timer.segment_started_at)) / 1000
        : 0;
    return Math.max(0, Math.floor(timer.accumulated_seconds + running));
  }, [timer, offset]);

  const [, tick] = useState(0);
  useEffect(() => {
    if (timer?.status !== "running") return;
    // Alinha cada atualização ao instante em que o tempo decorrido vira de segundo
    // (a fração de segundo em que o cronômetro começou), para o relógio não atrasar.
    const start = timer.segment_started_at ? Date.parse(timer.segment_started_at) : Date.now();
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const since = Date.now() + offset - start;
      id = setTimeout(
        () => {
          tick((n) => n + 1);
          schedule();
        },
        1000 - (((since % 1000) + 1000) % 1000) + 5,
      );
    };
    schedule();
    return () => clearTimeout(id);
  }, [timer, offset]);

  return compute();
}

const OURS = /^(\d+:\d{2}:\d{2}|Pausado) — /;

/** Mostra o tempo no título da aba enquanto o cronômetro existe; devolve o título da página ao parar. */
function TitleClock() {
  const { timer, offset, data } = useStudy();
  const elapsed = useElapsed(timer, offset);
  const pageTitle = useRef("");
  const subject = data?.subjects.find((s) => s.id === timer?.subject_id)?.name ?? "Foco aí";

  useEffect(() => {
    // Um título que não é nosso foi definido pela página (navegação): guarda para restaurar depois.
    if (!OURS.test(document.title)) pageTitle.current = document.title;
    if (!timer) {
      if (OURS.test(document.title) && pageTitle.current) document.title = pageTitle.current;
      return;
    }
    document.title = `${timer.status === "running" ? clock(elapsed) : "Pausado"} — ${subject}`;
  }, [timer, elapsed, subject]);

  return null;
}
