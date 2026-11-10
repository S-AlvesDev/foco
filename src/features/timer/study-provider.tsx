"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { toast } from "sonner";
import { clock, localDateISO, stripAccents } from "@/lib/format";
import type { StudyType } from "@/lib/study-types";
import { createClient } from "@/lib/supabase/client";
import { SessionFormDialog, type SessionDraft } from "@/features/sessions/components/session-form-dialog";
import { pauseTimerAction, resumeTimerAction, startTimerAction } from "./actions";
import { ReviewDialog, type ReviewDraft } from "@/features/reviews/components/review-dialog";
import { FinishTimerDialog } from "./components/finish-timer-dialog";
import { StartTimerDialog } from "./components/start-timer-dialog";
import { TIMER_COLUMNS, type StudyContext, type Timer, type TimerResult } from "./types";
import { currentUserId, isOffline, readOutbox } from "@/features/pwa/outbox";

const cacheKey = (uid: string) => `alpha:study:${uid}`;

/** Cronômetro já finalizado sem internet (na fila): não deve reaparecer até o envio. */
function withoutQueuedFinish(timer: Timer | null) {
  if (!timer) return null;
  const queued = readOutbox().some((i) => i.kind === "finish" && i.payload.timerId === timer.id);
  return queued ? null : timer;
}

type Snapshot = {
  ready: boolean;
  data: StudyContext | null;
  timer: Timer | null;
  /** Diferença relógio do servidor − aparelho (ms). */
  offset: number;
  busy: boolean;
};

export type StartPrefill = { topic?: string; subjectName?: string; studyType?: StudyType };

type Actions = {
  /** Abre o início do cronômetro. `opts` pré-preenche assunto/tipo e acha a matéria pelo nome. */
  openStart: (subjectId?: string, opts?: StartPrefill) => void;
  openFinish: () => void;
  openManual: (draft?: Partial<SessionDraft>) => void;
  /** Agendar revisão (opcionalmente já com matéria, assunto, anotação ou sessão). */
  openReview: (draft?: ReviewDraft) => void;
  quickStart: (subjectId: string) => void;
  pause: () => void;
  resume: () => void;
  /** Recarrega do servidor e avisa as outras abas. */
  sync: (timer?: Timer | null, serverNow?: number) => void;
};

const INITIAL: Snapshot = { ready: false, data: null, timer: null, offset: 0, busy: false };

/**
 * Estado do cronômetro fora do contexto do React.
 * O contexto só carrega objetos estáveis; quem precisa dos dados se inscreve no store.
 * Assim, carregar ou atualizar o cronômetro não força o React a recriar no navegador
 * trechos da página que ainda estão chegando do servidor (o que duplicava conteúdo).
 */
function createStore() {
  let state = INITIAL;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    getServer: () => INITIAL,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    set(patch: Partial<Snapshot>) {
      const next = { ...state, ...patch };
      if (patch.data !== undefined) next.timer = patch.data?.timer ?? null;
      next.ready = next.data !== null;
      state = next;
      listeners.forEach((l) => l());
    },
  };
}
type Store = ReturnType<typeof createStore>;

const Ctx = createContext<{ store: Store; actions: Actions } | null>(null);

export function useStudy(): Snapshot & Actions {
  const ctx = use(Ctx);
  if (!ctx) throw new Error("useStudy precisa de <StudyProvider>.");
  const snap = useSyncExternalStore(ctx.store.subscribe, ctx.store.get, ctx.store.getServer);
  return { ...snap, ...ctx.actions };
}

const CHANNEL = "foco-timer";

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(createStore);
  const [busy, startTransition] = useTransition();
  const [startOpen, setStartOpen] = useState<({ subjectId?: string } & StartPrefill) | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [manual, setManual] = useState<Partial<SessionDraft> | null>(null);
  const [review, setReview] = useState<ReviewDraft | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const snap = useSyncExternalStore(store.subscribe, store.get, store.getServer);

  useEffect(() => store.set({ busy }), [busy, store]);

  /** Lê direto do Supabase no navegador (o RLS limita aos dados do usuário). */
  const load = useCallback(async () => {
    /** Sem rede: usa a última cópia salva neste aparelho (matérias e cronômetro). */
    const restore = (uid: string | null | undefined) => {
      if (!uid || store.get().data) return;
      try {
        const saved = JSON.parse(localStorage.getItem(cacheKey(uid)) ?? "null") as {
          data: StudyContext;
          offset: number;
        } | null;
        if (!saved?.data) return;
        const serverNow = Date.now() + saved.offset;
        store.set({
          offset: saved.offset,
          data: {
            ...saved.data,
            timer: withoutQueuedFinish(saved.data.timer),
            todayISO: localDateISO(saved.data.timezone, new Date(serverNow)),
            serverNow,
          },
        });
      } catch {}
    };
    let userId: string | undefined;
    try {
      const { data: auth } = await supabase.auth.getSession();
      userId = auth.session?.user.id;
      if (!userId) return;
      if (isOffline()) return restore(userId);
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
      if (timer.error || subjects.error || profile.error) return restore(userId);
      const received = Date.now();
      const serverNow = clockRes.now;
      const data: StudyContext = {
        timer: withoutQueuedFinish(timer.data),
        subjects: subjects.data ?? [],
        timezone: profile.data.timezone,
        todayISO: localDateISO(profile.data.timezone, new Date(serverNow)),
        lastSubjectId: last.data?.subject_id ?? null,
        serverNow,
      };
      const offset = serverNow - (sent + received) / 2;
      store.set({ offset, data });
      try {
        localStorage.setItem(
          cacheKey(userId),
          JSON.stringify({ data: { ...data, timer: timer.data }, offset }),
        );
      } catch {}
    } catch {
      // Sem rede: mantém o último estado conhecido (ou a cópia salva); tenta de novo no próximo foco.
      restore(userId ?? currentUserId());
    }
  }, [supabase, store]);

  // Carga inicial, ao voltar para a aba e quando outra aba mexe no cronômetro.
  useEffect(() => {
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

  const actions = useMemo<Actions>(() => {
    const sync: Actions["sync"] = (timer, serverNow) => {
      const cur = store.get();
      if (timer !== undefined && cur.data) {
        store.set({
          data: { ...cur.data, timer },
          ...(serverNow ? { offset: serverNow - Date.now() } : {}),
        });
      }
      channel.current?.postMessage("changed");
      void load();
    };
    const run = (fn: () => Promise<TimerResult>) =>
      startTransition(async () => {
        if (isOffline()) {
          toast.error(
            "Sem conexão. Iniciar, pausar e continuar precisam de internet; o tempo continua contando.",
          );
          return;
        }
        let res: TimerResult;
        try {
          res = await fn();
        } catch {
          toast.error("Sem conexão. Tente de novo quando a internet voltar.");
          return;
        }
        if (res.ok) sync(res.timer, res.serverNow);
        else {
          toast.error(res.message);
          sync();
        }
      });
    return {
      openStart: (subjectId, opts) => setStartOpen({ subjectId, ...opts }),
      openFinish: () => setFinishOpen(true),
      openManual: (draft) => setManual(draft ?? {}),
      openReview: (draft) => setReview(draft ?? {}),
      quickStart: (subjectId) => run(() => startTimerAction({ subjectId })),
      pause: () => run(pauseTimerAction),
      resume: () => run(resumeTimerAction),
      sync,
    };
  }, [store, load]);

  // Valor estável: nunca muda depois da montagem.
  const value = useMemo(() => ({ store, actions }), [store, actions]);
  const data = snap.data;

  return (
    <Ctx value={value}>
      {children}
      <TitleClock />
      {data && (
        <>
          <StartTimerDialog
            open={startOpen !== null}
            onOpenChange={(o) => !o && setStartOpen(null)}
            subjects={data.subjects}
            defaultSubjectId={
              startOpen?.subjectId ??
              matchSubject(data.subjects, startOpen?.subjectName) ??
              (startOpen?.subjectName ? undefined : (data.lastSubjectId ?? undefined))
            }
            defaultTopic={startOpen?.topic}
            defaultStudyType={startOpen?.studyType}
          />
          <FinishTimerDialog open={finishOpen} onOpenChange={setFinishOpen} />
          <ReviewDialog
            open={review !== null}
            onOpenChange={(o) => !o && setReview(null)}
            subjects={data.subjects}
            todayISO={data.todayISO}
            draft={{ subjectId: data.lastSubjectId ?? undefined, ...review }}
          />
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
  const subject = data?.subjects.find((s) => s.id === timer?.subject_id)?.name ?? "Missão Alpha-01";

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

/** Matéria da pessoa com o mesmo nome (sem diferenciar maiúsculas e acentos). */
function matchSubject(subjects: { id: string; name: string }[], name?: string) {
  if (!name) return undefined;
  const fold = (v: string) => stripAccents(v).toLowerCase().replace(/\s+/g, " ").trim();
  const target = fold(name);
  return subjects.find((s) => fold(s.name) === target)?.id;
}
