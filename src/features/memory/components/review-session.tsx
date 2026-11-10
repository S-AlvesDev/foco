"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarClock,
  Check,
  CircleCheck,
  CircleX,
  Clock3,
  EllipsisVertical,
  ListChecks,
  NotebookPen,
  Play,
  RotateCcw,
  SkipForward,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { addDays, daysBetween } from "@/lib/dates";
import { plural, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { answerQuestionAction } from "@/features/questions/actions";
import { enqueueMemory, isOffline } from "@/features/pwa/outbox";
import { topicLabel } from "@/features/library/model";
import {
  finalGrade,
  GRADE_HINTS,
  GRADE_LABELS,
  GRADES,
  guessChance,
  LEVEL_HINTS,
  planReview,
  type Grade,
  type Level,
  type MemorySettings,
  type RecentReview,
} from "../fsrs";
import { loadReviewMaterialAction, postponeReviewAction, recordReviewAction } from "../actions";
import type { ReviewMaterial, ReviewQuestion } from "../queries";
import { LevelBadge } from "./level-badge";

export type SessionTopic = {
  topicId: string;
  disciplineId: string;
  disciplineName: string;
  topicNumber: string | null;
  topicTitle: string;
  dueOn: string;
  r: number | null;
  overdue: number;
  minutes: number;
  level: Level;
  stability: number | null;
  difficulty: number | null;
  lastReviewOn: string | null;
  recent: RecentReview[];
  hasQuestions: boolean;
  contentChanged: boolean;
};

type Step = "recall" | "check" | "questions" | "saving" | "result";
type Answered = { id: string; correct: boolean; chance: number };
type Outcome = {
  grade: Grade;
  source: string;
  questionGrade: Grade | null;
  dueOn: string;
  scheduledDays: number;
  level: Level | null;
  queued: boolean;
  answered: Answered[];
};

const href = (t: { disciplineId: string; topicId: string }) =>
  `/biblioteca/${encodeURIComponent(t.disciplineId)}/${encodeURIComponent(t.topicId)}`;

/** Fila de hoje + modo revisão (lembrar → conferir → questões → resultado). */
export function ReviewSession({
  today,
  now,
  later,
  settings,
  minutes,
  autoStart,
  aside,
}: {
  today: string;
  now: SessionTopic[];
  later: SessionTopic[];
  settings: MemorySettings;
  minutes: number;
  autoStart?: string | null;
  /** Previsão e disciplinas em atenção: só aparecem fora do modo revisão. */
  aside?: React.ReactNode;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<SessionTopic[] | null>(null);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<{ topic: SessionTopic; outcome: Outcome; seconds: number }[]>([]);

  const start = useCallback((list: SessionTopic[]) => {
    if (!list.length) return;
    setQueue(list);
    setIndex(0);
    setDone([]);
    window.scrollTo({ top: 0 });
  }, []);

  // Link direto para revisar um tópico (?topico=…)
  const startedFromLink = useRef(false);
  useEffect(() => {
    if (!autoStart || startedFromLink.current) return;
    const t = [...now, ...later].find((x) => x.topicId === autoStart);
    if (t) {
      startedFromLink.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- abre a revisão pedida pelo link uma vez
      start([t]);
    }
  }, [autoStart, now, later, start]);

  const finish = () => {
    setQueue(null);
    router.refresh();
  };

  if (queue) {
    const topic = queue[index];
    if (!topic) return <SessionSummary done={done} today={today} onClose={finish} remaining={later.length} />;
    return (
      <TopicReview
        key={topic.topicId}
        topic={topic}
        position={index + 1}
        total={queue.length}
        settings={settings}
        today={today}
        onExit={finish}
        onDone={(outcome, seconds) => setDone((d) => [...d, { topic, outcome, seconds }])}
        onNext={() => setIndex((i) => i + 1)}
      />
    );
  }

  return (
    <>
      <QueueList
        today={today}
        now={now}
        later={later}
        minutes={minutes}
        dailyMinutes={settings.dailyMinutes}
        onStart={start}
      />
      {aside}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Lista                                                               */
/* ------------------------------------------------------------------ */

function QueueList({
  today,
  now,
  later,
  minutes,
  dailyMinutes,
  onStart,
}: {
  today: string;
  now: SessionTopic[];
  later: SessionTopic[];
  minutes: number;
  dailyMinutes: number;
  onStart: (list: SessionTopic[]) => void;
}) {
  const overdue = now.filter((t) => t.overdue > 0);
  const due = now.filter((t) => t.overdue === 0);
  const laterMin = later.reduce((s, t) => s + t.minutes, 0);
  return (
    <section
      aria-labelledby="queue-title"
      className="rounded-2xl border border-border bg-surface-1 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 id="queue-title" className="text-[15.5px] font-semibold text-fg">
            Revisões de hoje
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-2">
            {now.length
              ? `${plural(now.length, "tópico", "tópicos")} · cerca de ${minutes} min de ${dailyMinutes} min do seu limite`
              : "Nada vencido hoje."}
          </p>
        </div>
        {now.length > 0 && (
          <Button variant="primary" size="lg" onClick={() => onStart(now)} className="w-full sm:w-auto">
            <Play />
            Começar
          </Button>
        )}
      </div>
      {overdue.length > 0 && <Group title="Atrasadas" items={overdue} today={today} onStart={onStart} />}
      {due.length > 0 && <Group title="Para hoje" items={due} today={today} onStart={onStart} />}
      {later.length > 0 && (
        <div className="border-t border-border">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5">
            <p className="text-[12.5px] font-semibold text-fg-3">
              Não couberam no tempo de hoje ({later.length}) · ficam para amanhã, na frente da fila
            </p>
            <Button variant="ghost" size="sm" onClick={() => onStart([...now, ...later])}>
              Revisar tudo (~{minutes + laterMin} min)
            </Button>
          </div>
          <ul className="px-2 pb-2 sm:px-3">
            {later.map((t) => (
              <Row key={t.topicId} t={t} today={today} onStart={onStart} muted />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Group({
  title,
  items,
  today,
  onStart,
}: {
  title: string;
  items: SessionTopic[];
  today: string;
  onStart: (l: SessionTopic[]) => void;
}) {
  return (
    <div className="pt-3">
      <p className="px-4 text-[12.5px] font-semibold text-fg-3 sm:px-5">
        {title} ({items.length})
      </p>
      <ul className="px-2 pb-2 sm:px-3">
        {items.map((t) => (
          <Row key={t.topicId} t={t} today={today} onStart={onStart} />
        ))}
      </ul>
    </div>
  );
}

function Row({
  t,
  today,
  onStart,
  muted,
}: {
  t: SessionTopic;
  today: string;
  onStart: (l: SessionTopic[]) => void;
  muted?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const postpone = () =>
    startTransition(async () => {
      const r = await postponeReviewAction(t.topicId);
      if (!r.ok) toast.error(r.message);
      else {
        toast("Adiado para amanhã.");
        router.refresh();
      }
    });
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-surface-2/50",
        muted && "opacity-80",
      )}
    >
      <button
        type="button"
        onClick={() => onStart([t])}
        className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1 text-left"
      >
        <span className="w-full truncate text-[14.5px] font-medium text-fg">
          {topicLabel({ number: t.topicNumber, title: t.topicTitle })}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-fg-3">
          <span className="truncate">{t.disciplineName}</span>
          <LevelBadge level={t.level} compact />
          {t.r != null && <span>lembrança prevista {Math.round(t.r * 100)}%</span>}
          {t.overdue > 0 && <span className="text-warning">venceu {shortDate(t.dueOn, today)}</span>}
          {t.contentChanged && <span className="text-accent">conteúdo atualizado</span>}
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" aria-hidden />~{t.minutes} min
          </span>
        </span>
      </button>
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            aria-label={`Mais opções: ${t.topicTitle}`}
            disabled={pending}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-3 hover:bg-surface-2 hover:text-fg"
          >
            <EllipsisVertical className="size-4" />
          </button>
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem onSelect={() => onStart([t])}>
            <Play />
            Revisar só este
          </MenuItem>
          <MenuItem asChild>
            <Link href={href(t)}>
              <BookOpen />
              Abrir na Biblioteca
            </Link>
          </MenuItem>
          <MenuItem onSelect={postpone}>
            <CalendarClock />
            Adiar para amanhã
          </MenuItem>
        </MenuContent>
      </Menu>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Revisão de um tópico                                                */
/* ------------------------------------------------------------------ */

function TopicReview({
  topic,
  position,
  total,
  settings,
  today,
  onExit,
  onDone,
  onNext,
}: {
  topic: SessionTopic;
  position: number;
  total: number;
  settings: MemorySettings;
  today: string;
  onExit: () => void;
  onDone: (o: Outcome, seconds: number) => void;
  onNext: () => void;
}) {
  const [step, setStep] = useState<Step>("recall");
  const [material, setMaterial] = useState<ReviewMaterial | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recall, setRecall] = useState("");
  const [selfGrade, setSelfGrade] = useState<Grade | null>(null);
  const [answered, setAnswered] = useState<Answered[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const startedAt = useRef<number>(0);
  const clientId = useRef<string>("");

  useEffect(() => {
    startedAt.current = Date.now();
    clientId.current = crypto.randomUUID();
    let alive = true;
    loadReviewMaterialAction(topic.topicId)
      .then((r) => {
        if (!alive) return;
        if (r.ok) setMaterial(r.material);
        else setLoadError(r.message);
      })
      .catch(() => alive && setLoadError("Sem conexão: dá para revisar só com a autoavaliação."));
    return () => {
      alive = false;
    };
  }, [topic.topicId]);

  const questions = material?.questions ?? [];

  const save = useCallback(
    async (grade: Grade | null, list: Answered[]) => {
      setStep("saving");
      const seconds = Math.min(86400, Math.round((Date.now() - startedAt.current) / 1000));
      const q =
        list.length > 0
          ? {
              total: list.length,
              correct: list.filter((a) => a.correct).length,
              chanceSum: list.reduce((s, a) => s + a.chance, 0),
            }
          : null;
      const payload = {
        clientId: clientId.current,
        topicId: topic.topicId,
        reviewedOn: today,
        selfGrade: grade,
        questions: q,
        seconds,
      };
      const offline = () => {
        const g = finalGrade({ selfGrade: grade, questions: q, recent: topic.recent });
        if (!g || !enqueueMemory(payload)) {
          toast.error("Não foi possível guardar a revisão neste aparelho.");
          setStep("check");
          return;
        }
        const plan = planReview({
          item: {
            topicId: topic.topicId,
            stability: topic.stability,
            difficulty: topic.difficulty,
            lastReviewOn: topic.lastReviewOn,
          },
          grade: g.grade,
          reviewedOn: today,
          settings,
        });
        const o: Outcome = {
          grade: g.grade,
          source: g.source,
          questionGrade: g.questionGrade,
          dueOn: plan.dueOn,
          scheduledDays: plan.scheduledDays,
          level: null,
          queued: true,
          answered: list,
        };
        setOutcome(o);
        onDone(o, seconds);
        setStep("result");
      };
      if (isOffline()) return offline();
      try {
        const r = await recordReviewAction(payload);
        if (!r.ok) {
          toast.error(r.message);
          setStep("check");
          return;
        }
        const o: Outcome = { ...r, queued: false, answered: list };
        setOutcome(o);
        onDone(o, seconds);
        setStep("result");
      } catch {
        offline();
      }
    },
    [onDone, settings, today, topic],
  );

  const afterSelf = (g: Grade) => {
    setSelfGrade(g);
    if (questions.length) setStep("questions");
    else void save(g, []);
  };

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-fg-2 hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-4" />
          Sair da revisão
        </button>
        <span className="text-[12.5px] text-fg-3">
          Tópico {position} de {total}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${((position - (step === "result" ? 0 : 1)) / total) * 100}%` }}
        />
      </div>

      <header className="mt-5">
        <p className="text-[12.5px] text-fg-3">{topic.disciplineName}</p>
        <h1 className="mt-0.5 text-[22px] leading-tight font-bold tracking-[-0.02em] text-fg sm:text-[24px]">
          {topicLabel({ number: topic.topicNumber, title: topic.topicTitle })}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-fg-3">
          <LevelBadge level={topic.level} />
          {topic.lastReviewOn ? (
            <span>última revisão {shortDate(topic.lastReviewOn, today)}</span>
          ) : (
            <span>primeira revisão</span>
          )}
          {topic.contentChanged && (
            <span className="text-accent">o conteúdo foi atualizado desde a última revisão</span>
          )}
        </div>
      </header>

      <Steps step={step} hasQuestions={questions.length > 0} />

      {step === "recall" && (
        <Panel>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <Brain className="size-4 text-accent" aria-hidden />
            Lembre antes de olhar
          </h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-fg-2">
            Escreva ou fale em voz alta os pontos principais deste tópico: conceitos, classificações,
            exceções, prazos. Tentar lembrar é o que fixa; não precisa estar completo.
          </p>
          <textarea
            value={recall}
            onChange={(e) => setRecall(e.target.value)}
            rows={6}
            placeholder="O que você lembra… (fica só nesta tela)"
            className="mt-3 w-full resize-y rounded-xl border border-border bg-surface-2/40 px-3 py-2.5 text-[15px] leading-relaxed text-fg placeholder:text-fg-3 focus:border-accent focus:outline-none"
          />
          <div className="mt-3 flex justify-end">
            <Button variant="primary" size="lg" onClick={() => setStep("check")}>
              Conferir
              <ArrowRight />
            </Button>
          </div>
        </Panel>
      )}

      {step === "check" && (
        <Panel>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <ListChecks className="size-4 text-accent" aria-hidden />
            Compare com o tópico
          </h2>
          {recall.trim() && (
            <div className="mt-3 rounded-xl border border-border bg-surface-2/40 px-3 py-2.5">
              <p className="text-[12px] font-semibold text-fg-3">O que você escreveu</p>
              <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-wrap text-fg-2">{recall}</p>
            </div>
          )}
          {!material && !loadError && <p className="mt-3 text-[13.5px] text-fg-3">Carregando o esquema…</p>}
          {loadError && <p className="mt-3 text-[13.5px] text-warning">{loadError}</p>}
          {material && <MaterialView material={material} />}
          <a
            href={href(topic)}
            target="_blank"
            rel="noopener"
            className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-accent hover:underline"
          >
            <BookOpen className="size-4" />
            Abrir o tópico completo (nova aba)
          </a>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-[14px] font-semibold text-fg">Quanto você lembrou?</p>
            {questions.length > 0 && (
              <p className="mt-0.5 text-[12.5px] text-fg-3">
                Depois vêm {plural(questions.length, "questão", "questões")}. Se elas mostrarem menos do que
                você acha, vale a nota das questões.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => afterSelf(g)}
                  className={cn(
                    "flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    "border-border hover:border-border-strong hover:bg-surface-2",
                    selfGrade === g && "border-accent bg-accent-subtle",
                  )}
                >
                  <span className={cn("text-[14px] font-semibold", g === 1 ? "text-danger" : "text-fg")}>
                    {GRADE_LABELS[g]}
                  </span>
                  <span className="text-[12px] leading-snug text-fg-3">{GRADE_HINTS[g]}</span>
                </button>
              ))}
            </div>
          </div>
        </Panel>
      )}

      {step === "questions" && (
        <QuestionsStep
          questions={questions}
          onFinish={(list) => void save(selfGrade, list)}
          onSkip={(list) => void save(selfGrade, list)}
          onAnswered={setAnswered}
          answered={answered}
        />
      )}

      {step === "saving" && (
        <Panel>
          <p className="text-[14px] text-fg-2">Calculando a próxima revisão…</p>
        </Panel>
      )}

      {step === "result" && outcome && (
        <ResultView
          outcome={outcome}
          today={today}
          questions={questions}
          topic={topic}
          last={position === total}
          onNext={onNext}
        />
      )}
    </div>
  );
}

function Steps({ step, hasQuestions }: { step: Step; hasQuestions: boolean }) {
  const list: { key: Step[]; label: string }[] = [
    { key: ["recall"], label: "Lembrar" },
    { key: ["check"], label: "Conferir" },
    ...(hasQuestions ? [{ key: ["questions"] as Step[], label: "Questões" }] : []),
    { key: ["saving", "result"], label: "Resultado" },
  ];
  const current = list.findIndex((s) => s.key.includes(step));
  return (
    <ol className="mt-5 mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]" aria-label="Etapas">
      {list.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5",
              i === current ? "font-semibold text-fg" : i < current ? "text-fg-2" : "text-fg-3",
            )}
            aria-current={i === current ? "step" : undefined}
          >
            {i < current ? <Check className="size-3.5 text-success" aria-hidden /> : <span>{i + 1}.</span>}
            {s.label}
          </span>
          {i < list.length - 1 && <span className="text-fg-3">·</span>}
        </li>
      ))}
    </ol>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-5">{children}</div>
  );
}

function MaterialView({ material }: { material: ReviewMaterial }) {
  const highlights = material.marks.filter((m) => m.kind === "highlight" && m.quote);
  const notes = material.marks.filter((m) => m.body);
  return (
    <div className="mt-3 flex flex-col gap-4">
      {material.outline.length > 0 ? (
        <div>
          <p className="text-[12.5px] font-semibold text-fg-3">Esquema do tópico</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {material.outline.map((o, i) => (
              <li
                key={i}
                className="text-[14px] leading-snug text-fg"
                style={{ paddingLeft: `${o.depth * 14}px` }}
              >
                <span className="mr-1.5 text-fg-3">•</span>
                {o.text}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[13.5px] text-fg-3">
          Este tópico não tem subtítulos. Confira pelas suas marcações ou abra o tópico.
        </p>
      )}
      {(highlights.length > 0 || notes.length > 0) && (
        <div>
          <p className="text-[12.5px] font-semibold text-fg-3">Suas marcações e anotações</p>
          <ul className="mt-1.5 flex flex-col gap-2">
            {highlights.map((m, i) => (
              <li key={`h${i}`} className="flex gap-2 text-[14px] leading-relaxed text-fg">
                <span
                  className="hl-swatch w-1 shrink-0 rounded-full"
                  data-color={m.color ?? "yellow"}
                  aria-hidden
                />
                <span>
                  {m.quote}
                  {m.body && <span className="mt-0.5 block text-[13px] text-fg-2">{m.body}</span>}
                </span>
              </li>
            ))}
            {notes
              .filter((m) => m.kind === "note")
              .map((m, i) => (
                <li key={`n${i}`} className="flex gap-2 text-[13.5px] leading-relaxed text-fg-2">
                  <NotebookPen className="mt-0.5 size-3.5 shrink-0 text-fg-3" aria-hidden />
                  <span className="whitespace-pre-wrap">{m.body}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Questões                                                            */
/* ------------------------------------------------------------------ */

function QuestionsStep({
  questions,
  answered,
  onAnswered,
  onFinish,
  onSkip,
}: {
  questions: ReviewQuestion[];
  answered: Answered[];
  onAnswered: (a: Answered[]) => void;
  onFinish: (a: Answered[]) => void;
  onSkip: (a: Answered[]) => void;
}) {
  const [i, setI] = useState(answered.length);
  const q = questions[i];
  const [choice, setChoice] = useState<string | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    gabarito: string | null;
    text: string | null;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const options = useMemo(
    () =>
      !q
        ? []
        : q.tipo === "certo_errado"
          ? [
              { value: "C", label: "Certo" },
              { value: "E", label: "Errado" },
            ]
          : Object.entries(q.alternativas ?? {})
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => ({ value: k, label: v })),
    [q],
  );
  if (!q) return null;
  const last = i === questions.length - 1;
  const correctSoFar = answered.filter((a) => a.correct).length;

  const submit = () => {
    if (!choice || result) return;
    startTransition(async () => {
      const r = await answerQuestionAction(q.id, choice, { inReview: true }).catch(() => null);
      if (!r || !r.ok) {
        toast.error(r ? r.message : "Sem conexão: continue pela autoavaliação.");
        return;
      }
      const next = [...answered, { id: q.id, correct: r.correct, chance: guessChance(q.tipo, q.choices) }];
      onAnswered(next);
      setResult({
        correct: r.correct,
        gabarito: r.solution.gabarito,
        text: r.solution.justificativa || r.solution.comentario,
      });
    });
  };

  const go = () => {
    if (last) return onFinish(answered);
    setI(i + 1);
    setChoice(null);
    setResult(null);
  };

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-fg-3">
          Questão {i + 1} de {questions.length}
          {answered.length > 0 && ` · ${correctSoFar} de ${answered.length} certas`}
        </p>
        <button
          type="button"
          onClick={() => onSkip(answered)}
          className="inline-flex cursor-pointer items-center gap-1 text-[12.5px] text-fg-3 hover:text-fg"
        >
          <SkipForward className="size-3.5" />
          {answered.length ? "Encerrar questões" : "Pular questões"}
        </button>
      </div>
      <p className="mt-1 text-[12px] text-fg-3">
        {[q.banca, q.concurso, q.assunto].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-3 text-[15.5px] leading-[1.7] whitespace-pre-wrap break-words text-fg">
        {q.enunciado}
      </p>
      <div className={cn("mt-4 grid gap-2", q.tipo === "certo_errado" && "grid-cols-2")} role="radiogroup">
        {options.map((o) => {
          const isGab = result && result.gabarito === o.value;
          const isWrongPick = result && choice === o.value && !result.correct;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={choice === o.value}
              disabled={Boolean(result) || pending}
              onClick={() => setChoice(o.value)}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[14.5px] leading-relaxed transition-colors disabled:cursor-default",
                choice === o.value && !result
                  ? "border-accent bg-accent-subtle"
                  : "border-border hover:bg-surface-2",
                isGab && "border-success bg-success/10",
                isWrongPick && "border-danger bg-danger-subtle",
              )}
            >
              {q.tipo !== "certo_errado" && (
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[11.5px] font-semibold text-fg-2">
                  {o.value}
                </span>
              )}
              <span className={cn("min-w-0 break-words", q.tipo === "certo_errado" && "font-medium")}>
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
      {result && (
        <div
          className={cn(
            "mt-4 rounded-xl border px-3 py-3",
            result.correct ? "border-success/40 bg-success/5" : "border-danger/40 bg-danger-subtle",
          )}
        >
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-fg">
            {result.correct ? (
              <CircleCheck className="size-4 text-success" aria-hidden />
            ) : (
              <CircleX className="size-4 text-danger" aria-hidden />
            )}
            {result.correct
              ? "Certa"
              : `Errada · gabarito ${q.tipo === "certo_errado" ? (result.gabarito === "C" ? "Certo" : "Errado") : result.gabarito}`}
          </p>
          {result.text && (
            <p className="mt-1.5 text-[14px] leading-relaxed whitespace-pre-wrap text-fg-2">{result.text}</p>
          )}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        {result ? (
          <Button variant="primary" size="lg" onClick={go}>
            {last ? "Ver resultado" : "Próxima"}
            <ArrowRight />
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={submit} disabled={!choice} loading={pending}>
            Responder
          </Button>
        )}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Resultado                                                           */
/* ------------------------------------------------------------------ */

const SOURCE_TEXT: Record<string, string> = {
  self: "pela sua autoavaliação",
  questions: "pelas questões",
  both: "pela pior entre a autoavaliação e as questões",
  practice: "pelas questões",
};

function reason(o: Outcome) {
  if (o.grade === 1) return "Você esqueceu parte do tópico: ele volta logo, até fixar.";
  if (o.grade === 2) return "Lembrou com esforço: o intervalo cresce pouco.";
  if (o.grade === 3) return "Lembrou bem: o intervalo cresce.";
  return "Lembrou com folga: o intervalo cresce bastante.";
}

function ResultView({
  outcome,
  today,
  questions,
  topic,
  last,
  onNext,
}: {
  outcome: Outcome;
  today: string;
  questions: ReviewQuestion[];
  topic: SessionTopic;
  last: boolean;
  onNext: () => void;
}) {
  const days = daysBetween(today, outcome.dueOn);
  const wrong = outcome.answered.filter((a) => !a.correct);
  const qById = new Map(questions.map((q) => [q.id, q]));
  return (
    <Panel>
      <p className="text-[12.5px] text-fg-3">Nota da revisão {SOURCE_TEXT[outcome.source] ?? ""}</p>
      <p
        className={cn(
          "mt-0.5 text-[22px] font-bold tracking-[-0.02em]",
          outcome.grade === 1 ? "text-danger" : "text-fg",
        )}
      >
        {GRADE_LABELS[outcome.grade]}
      </p>
      {outcome.answered.length > 0 && (
        <p className="mt-1 text-[13.5px] text-fg-2">
          {outcome.answered.filter((a) => a.correct).length} de {outcome.answered.length} questões certas
          {outcome.answered.length < 5 && " (com menos de 5, a nota vem da autoavaliação)"}
        </p>
      )}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 px-3 py-3">
        <CalendarClock className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="text-[15px] font-semibold text-fg">
            Próxima revisão: {days <= 1 ? "amanhã" : `${shortDate(outcome.dueOn, today)} (em ${days} dias)`}
          </p>
          <p className="mt-0.5 text-[13.5px] leading-relaxed text-fg-2">{reason(outcome)}</p>
          {outcome.queued && (
            <p className="mt-1 text-[12.5px] text-warning">
              Sem internet: guardada neste aparelho. A data final é confirmada quando enviar.
            </p>
          )}
        </div>
      </div>
      {outcome.level && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-fg-2">
          <LevelBadge level={outcome.level} />
          <span>{LEVEL_HINTS[outcome.level]}</span>
        </p>
      )}
      {wrong.length > 0 && (
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-fg">Releia só o que errou</p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {wrong.map((a) => {
              const q = qById.get(a.id);
              return (
                <li key={a.id} className="text-[13.5px] leading-snug text-fg-2">
                  <span className="text-fg-3">{q?.assunto ?? "Questão"} · </span>
                  {(q?.enunciado ?? "").slice(0, 140)}
                  {(q?.enunciado.length ?? 0) > 140 ? "…" : ""}
                </li>
              );
            })}
          </ul>
          <a
            href={href(topic)}
            target="_blank"
            rel="noopener"
            className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-accent hover:underline"
          >
            <BookOpen className="size-4" />
            Abrir o tópico (nova aba)
          </a>
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Button variant="primary" size="lg" onClick={onNext}>
          {last ? "Concluir" : "Próximo tópico"}
          <ArrowRight />
        </Button>
      </div>
    </Panel>
  );
}

function SessionSummary({
  done,
  today,
  onClose,
  remaining,
}: {
  done: { topic: SessionTopic; outcome: Outcome; seconds: number }[];
  today: string;
  onClose: () => void;
  remaining: number;
}) {
  const minutes = Math.max(1, Math.round(done.reduce((s, d) => s + d.seconds, 0) / 60));
  return (
    <div className="mx-auto max-w-[720px]">
      <Panel>
        <h1 className="flex items-center gap-2 text-[20px] font-bold tracking-[-0.02em] text-fg">
          <CircleCheck className="size-5 text-success" aria-hidden />
          Revisão concluída
        </h1>
        <p className="mt-1 text-[14px] text-fg-2">
          {done.length
            ? `${plural(done.length, "tópico", "tópicos")} em cerca de ${minutes} min.`
            : "Nenhum tópico revisado."}
        </p>
        {done.length > 0 && (
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {done.map((d) => (
              <li key={d.topic.topicId} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate text-[14px] text-fg">
                  {topicLabel({ number: d.topic.topicNumber, title: d.topic.topicTitle })}
                </span>
                <span className="shrink-0 text-[12.5px] text-fg-3">
                  {GRADE_LABELS[d.outcome.grade]} · volta{" "}
                  {d.outcome.dueOn === addDays(today, 1) ? "amanhã" : shortDate(d.outcome.dueOn, today)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {remaining > 0 && (
          <p className="mt-3 text-[13px] text-fg-3">
            {plural(remaining, "tópico ficou", "tópicos ficaram")} para amanhã porque não couberam no seu
            tempo diário.
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" asChild>
            <Link href="/revisoes/desempenho">
              <RotateCcw />
              Ver desempenho
            </Link>
          </Button>
          <Button variant="primary" onClick={onClose}>
            Voltar à fila
          </Button>
        </div>
      </Panel>
    </div>
  );
}
