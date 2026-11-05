"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpenCheck,
  ChartColumn,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  ExternalLink,
  Flag,
  Keyboard,
  Eye,
  ListFilter,
  NotebookPen,
  PenLine,
  Scissors,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { selectChevron, selectClass } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  answerQuestionAction,
  gradeDiscursiveAction,
  revealDiscursiveAction,
  reportQuestionAction,
  saveNoteAction,
  setFavoriteAction,
  type AnswerResult,
} from "../actions";
import {
  areaLabel,
  DIFICULDADE_LABELS,
  letters,
  REPORT_CATEGORIES,
  TIPO_LABELS,
  type Status,
} from "../model";
import type { MyQuestionState, PublicQuestion } from "../queries";

type Answered = Extract<AnswerResult, { ok: true }> & { answer: string };
type Tab = "solution" | "alternatives" | "stats" | "note" | "report";

const CE = [
  { value: "C", label: "Certo", icon: Check },
  { value: "E", label: "Errado", icon: X },
] as const;

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function QuestionSolver({
  question: q,
  mine,
  position,
  total,
  status,
  baseQuery,
  listHref,
}: {
  question: PublicQuestion;
  mine: MyQuestionState;
  position: number;
  total: number;
  status: Status;
  baseQuery: string;
  listHref: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [crossed, setCrossed] = useState<string[]>([]);
  const [result, setResult] = useState<Answered | null>(null);
  const [sending, startSend] = useTransition();
  const [favorite, setFavorite] = useState(mine.favorite);
  const [note, setNote] = useState(mine.note);
  const [tab, setTab] = useState<Tab | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const options = useMemo(
    () => (q.tipo === "certo_errado" ? ["C", "E"] : q.tipo === "discursiva" ? [] : letters(q.alternativas)),
    [q],
  );

  // Depois de responder, a questão pode sair da lista filtrada (ex.: "Não resolvidas").
  // Nesse caso a próxima ocupa a mesma posição.
  const dropsOut =
    (result !== null &&
      (status === "unanswered" ||
        (status === "correct" && !result.correct) ||
        (status === "wrong" && result.correct))) ||
    (status === "favorite" && !favorite) ||
    (status === "noted" && !note);
  const listTotal = dropsOut ? total - 1 : total;
  const nextPos = dropsOut ? position : position + 1;
  const hasNext = nextPos <= listTotal;
  const href = (n: number) => `/questoes/resolver?${baseQuery}${baseQuery ? "&" : ""}n=${n}`;
  const prevHref = position > 1 ? href(position - 1) : null;
  const nextHref = hasNext ? href(nextPos) : null;

  const submit = useCallback(() => {
    if (!selected || result || sending) return;
    startSend(async () => {
      const r = await answerQuestionAction(q.id, selected);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      setResult({ ...r, answer: selected });
      setTab("solution");
    });
  }, [q.id, result, selected, sending]);

  const pick = useCallback(
    (v: string) => {
      if (result) return;
      setSelected(v);
      setCrossed((c) => c.filter((x) => x !== v));
    },
    [result],
  );

  const toggleCross = (v: string) => {
    if (result) return;
    setCrossed((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));
    if (selected === v) setSelected(null);
  };

  const toggleFavorite = async () => {
    const next = !favorite;
    setFavorite(next);
    const r = await setFavoriteAction(q.id, next);
    if (!r.ok) {
      setFavorite(!next);
      toast.error(r.message);
    } else toast.success(next ? "Adicionada às favoritas" : "Removida das favoritas");
  };

  // Atalhos: letras escolhem, C/E em certo-errado, Enter responde, setas navegam.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, textarea, select, [contenteditable=true]") || t.closest("[role=dialog]")))
        return;
      const k = e.key.toUpperCase();
      if (!result && options.includes(k)) {
        e.preventDefault();
        pick(k);
      } else if (e.key === "Enter" && !result && selected) {
        e.preventDefault();
        submit();
      } else if (e.key === "ArrowRight" && nextHref) {
        router.push(nextHref);
      } else if (e.key === "ArrowLeft" && prevHref) {
        router.push(prevHref);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextHref, options, pick, prevHref, result, router, selected, submit]);

  const progress = Math.min(100, (position / Math.max(total, 1)) * 100);
  const gab = result?.solution.gabarito;

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de posição */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" className="-ml-2">
            <Link href={listHref}>
              <ListFilter />
              Filtros
            </Link>
          </Button>
          <p className="text-[13.5px] text-fg-2" aria-live="polite">
            Questão{" "}
            <strong className="font-semibold text-fg tabular-nums">{position.toLocaleString("pt-BR")}</strong>{" "}
            de <span className="tabular-nums">{listTotal.toLocaleString("pt-BR")}</span>
          </p>
          <div className="flex items-center gap-1">
            <NavButton href={prevHref} label="Questão anterior" icon={ChevronLeft} />
            <NavButton href={nextHref} label="Próxima questão" icon={ChevronRight} />
          </div>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-(image:--accent-fill)" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Cartão da questão */}
      <article
        ref={cardRef}
        aria-labelledby={`q-${q.id}`}
        className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card"
      >
        <header className="border-b border-border px-4 pt-4 pb-3.5 sm:px-6 sm:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] text-fg-2">
              <span
                id={`q-${q.id}`}
                className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[12px] font-semibold text-fg"
              >
                {q.id}
              </span>
              {q.banca && <Meta label="Banca" value={q.banca} />}
              <Meta label="Concurso" value={q.concurso} />
              {q.cargo && <Meta label="Cargo" value={q.cargo} />}
            </div>
            <button
              type="button"
              onClick={toggleFavorite}
              aria-pressed={favorite}
              aria-label={favorite ? "Remover das favoritas" : "Favoritar questão"}
              className={cn(
                "-mt-1 -mr-1.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-surface-2",
                favorite ? "text-gold" : "text-fg-3 hover:text-fg",
              )}
            >
              <Star className="size-[18px]" fill={favorite ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Chip strong>{q.disciplina}</Chip>
            <ChevronRight className="size-3.5 text-fg-3" aria-hidden />
            <Chip>{q.assunto}</Chip>
            {q.subassunto && <Chip>{q.subassunto}</Chip>}
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            <Difficulty value={q.dificuldade} />
            <span className="text-[12px] text-fg-3">{TIPO_LABELS[q.tipo]}</span>
            <span className="text-[12px] text-fg-3">· {areaLabel(q.area)}</span>
          </div>
        </header>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-[16.5px] leading-[1.7] whitespace-pre-line text-fg sm:text-[17px]">
            {q.enunciado}
          </p>

          {mine.last && !result && (
            <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-fg-3">
              {mine.last.isCorrect ? (
                <CircleCheck className="size-3.5 text-success" aria-hidden />
              ) : (
                <CircleX className="size-3.5 text-danger" aria-hidden />
              )}
              Você já resolveu {mine.attempts === 1 ? "uma vez" : `${mine.attempts} vezes`} ({mine.correct}{" "}
              {mine.correct === 1 ? "acerto" : "acertos"}). Última em {dm(mine.last.on)}:{" "}
              {mine.last.isCorrect ? "acertou" : "errou"}.
            </p>
          )}

          {q.tipo === "discursiva" ? (
            <Discursive
              id={q.id}
              result={result}
              onGraded={(r) => {
                setResult(r);
                setTab("solution");
              }}
              nextHref={nextHref}
              listHref={listHref}
              lastResponse={mine.last?.response ?? null}
            />
          ) : (
            <>
              {/* Alternativas */}
              <div
                role="radiogroup"
                aria-label="Resposta"
                className={cn(
                  "mt-6",
                  q.tipo === "certo_errado" ? "grid grid-cols-2 gap-3" : "flex flex-col gap-2",
                )}
              >
                {q.tipo === "certo_errado"
                  ? CE.map((o) => (
                      <CeOption
                        key={o.value}
                        label={o.label}
                        icon={o.icon}
                        selected={selected === o.value}
                        state={stateOf(o.value, result, gab)}
                        disabled={!!result || sending}
                        onSelect={() => pick(o.value)}
                        share={result ? share(result, o.value) : null}
                      />
                    ))
                  : options.map((l) => (
                      <McOption
                        key={l}
                        letter={l}
                        text={q.alternativas?.[l] ?? ""}
                        selected={selected === l}
                        crossed={crossed.includes(l)}
                        state={stateOf(l, result, gab)}
                        disabled={!!result || sending}
                        onSelect={() => pick(l)}
                        onCross={() => toggleCross(l)}
                        share={result ? share(result, l) : null}
                      />
                    ))}
              </div>
              {!result ? (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowKeys((v) => !v)}
                    aria-expanded={showKeys}
                    className="hidden cursor-pointer items-center gap-1.5 text-[12.5px] text-fg-3 hover:text-fg-2 md:flex"
                  >
                    <Keyboard className="size-4" aria-hidden />
                    Atalhos
                  </button>
                  <Button
                    variant="primary"
                    size="lg"
                    className="min-w-[160px] max-md:w-full"
                    disabled={!selected}
                    loading={sending}
                    onClick={submit}
                  >
                    Responder
                  </Button>
                  {showKeys && (
                    <p className="w-full text-[12.5px] text-fg-3">
                      {q.tipo === "certo_errado" ? "C ou E escolhem" : `${options.join(", ")} escolhem`} ·
                      Enter responde · ← → mudam de questão. Na múltipla escolha, a tesoura risca uma
                      alternativa.
                    </p>
                  )}
                </div>
              ) : (
                <ResultBanner result={result} tipo={q.tipo} nextHref={nextHref} listHref={listHref} />
              )}
            </>
          )}
        </div>

        <Panels
          key={result ? "answered" : "open"}
          q={q}
          result={result}
          tab={tab}
          setTab={setTab}
          note={note}
          onNoteSaved={setNote}
        />
      </article>

      <div className="flex items-center justify-between gap-3">
        <Button asChild={!!prevHref} variant="secondary" disabled={!prevHref}>
          {prevHref ? (
            <Link href={prevHref}>
              <ChevronLeft />
              Anterior
            </Link>
          ) : (
            <>
              <ChevronLeft />
              Anterior
            </>
          )}
        </Button>
        {nextHref ? (
          <Button asChild variant={result ? "primary" : "secondary"}>
            <Link href={nextHref}>
              Próxima
              <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <Link href={listHref}>
              <ArrowLeft />
              Fim da lista: voltar aos filtros
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type OptState = "idle" | "right" | "wrong" | "missed";

function stateOf(value: string, result: Answered | null, gab: string | null | undefined): OptState {
  if (!result || !gab) return "idle";
  if (value === gab) return value === result.answer ? "right" : "missed";
  return value === result.answer ? "wrong" : "idle";
}

/** % das respostas registradas no app que marcaram esta opção. */
function share(result: Answered, value: string) {
  const t = result.community.total;
  return t > 0 ? Math.round(((result.community.byAnswer[value] ?? 0) / t) * 100) : null;
}

function NavButton({
  href,
  label,
  icon: Icon,
}: {
  href: string | null;
  label: string;
  icon: typeof ChevronLeft;
}) {
  const cls =
    "flex size-9 items-center justify-center rounded-lg border border-border bg-surface-1 text-fg-2 transition-colors";
  return href ? (
    <Link href={href} aria-label={label} className={cn(cls, "hover:border-border-strong hover:text-fg")}>
      <Icon className="size-4" />
    </Link>
  ) : (
    <span aria-hidden className={cn(cls, "opacity-40")}>
      <Icon className="size-4" />
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="truncate">
      <span className="text-fg-3">{label}:</span> <span className="font-medium text-fg-2">{value}</span>
    </span>
  );
}

function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[12.5px]",
        strong ? "bg-accent-subtle font-semibold text-accent" : "bg-surface-2 text-fg-2",
      )}
    >
      {children}
    </span>
  );
}

function Difficulty({ value }: { value: string }) {
  const level = value === "facil" ? 1 : value === "intermediaria" ? 2 : 3;
  return (
    <span
      className="flex items-center gap-1.5 text-[12px] text-fg-2"
      title={`Dificuldade: ${DIFICULDADE_LABELS[value]}`}
    >
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-1 rounded-full",
              i <= level
                ? level === 3
                  ? "bg-danger"
                  : level === 2
                    ? "bg-warning"
                    : "bg-success"
                : "bg-surface-3",
            )}
          />
        ))}
      </span>
      {DIFICULDADE_LABELS[value]}
    </span>
  );
}

const stateRing: Record<OptState, string> = {
  idle: "",
  right: "border-success bg-success/10",
  missed: "border-success border-dashed bg-success/5",
  wrong: "border-danger bg-danger/10",
};

function CeOption({
  label,
  icon: Icon,
  selected,
  state,
  disabled,
  onSelect,
  share,
}: {
  label: string;
  icon: typeof Check;
  selected: boolean;
  state: OptState;
  disabled: boolean;
  onSelect: () => void;
  share: number | null;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative flex h-[60px] cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-xl border-2 text-[16px] font-semibold transition-[border-color,background-color,transform] duration-150",
        "disabled:cursor-default",
        state === "idle" &&
          (selected
            ? "border-accent bg-accent-subtle text-fg"
            : "border-border bg-surface-2 text-fg-2 enabled:hover:border-border-strong enabled:hover:text-fg"),
        state !== "idle" && stateRing[state],
        state === "idle" && disabled && !selected && "opacity-60",
      )}
    >
      {state === "right" || state === "missed" ? (
        <CircleCheck className="size-5 text-success" aria-hidden />
      ) : state === "wrong" ? (
        <CircleX className="size-5 text-danger" aria-hidden />
      ) : (
        <Icon className={cn("size-5", selected ? "text-accent" : "text-fg-3")} aria-hidden />
      )}
      {label}
      {share !== null && <span className="text-[12.5px] font-medium text-fg-3 tabular-nums">{share}%</span>}
    </button>
  );
}

function McOption({
  letter,
  text,
  selected,
  crossed,
  state,
  disabled,
  onSelect,
  onCross,
  share,
}: {
  letter: string;
  text: string;
  selected: boolean;
  crossed: boolean;
  state: OptState;
  disabled: boolean;
  onSelect: () => void;
  onCross: () => void;
  share: number | null;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-stretch overflow-hidden rounded-xl border-2 transition-[border-color,background-color] duration-150",
        state === "idle" &&
          (selected
            ? "border-accent bg-accent-subtle"
            : "border-border bg-surface-1 hover:border-border-strong"),
        state !== "idle" && stateRing[state],
      )}
    >
      {share !== null && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-fg/[0.045]"
          style={{ width: `${share}%` }}
        />
      )}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={onSelect}
        onContextMenu={(e) => {
          if (disabled) return;
          e.preventDefault();
          onCross();
        }}
        className="relative flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-3.5 py-3 text-left disabled:cursor-default"
      >
        <span
          className={cn(
            "mt-px flex size-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold transition-colors",
            state === "right" || state === "missed"
              ? "border-success bg-success text-white"
              : state === "wrong"
                ? "border-danger bg-danger text-white"
                : selected
                  ? "border-accent bg-accent text-white"
                  : "border-border-strong text-fg-2",
          )}
        >
          {state === "right" || state === "missed" ? (
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          ) : state === "wrong" ? (
            <X className="size-3.5" strokeWidth={3} aria-hidden />
          ) : (
            letter
          )}
          <span className="sr-only">{letter}</span>
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 pt-0.5 text-[15.5px] leading-relaxed",
            crossed ? "text-fg-3 line-through decoration-fg-3" : "text-fg",
          )}
        >
          {text}
        </span>
        {share !== null && (
          <span className="pt-1 text-[12.5px] font-medium text-fg-3 tabular-nums">{share}%</span>
        )}
      </button>
      {!disabled && (
        <button
          type="button"
          onClick={onCross}
          aria-pressed={crossed}
          aria-label={crossed ? `Desfazer risco da alternativa ${letter}` : `Riscar alternativa ${letter}`}
          title={crossed ? "Desfazer risco" : "Riscar alternativa"}
          className={cn(
            "relative flex w-11 shrink-0 cursor-pointer items-center justify-center text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg",
            crossed ? "text-accent" : "md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
          )}
        >
          <Scissors className="size-4" />
        </button>
      )}
    </div>
  );
}

function ResultBanner({
  result,
  tipo,
  nextHref,
  listHref,
}: {
  result: Answered;
  tipo: PublicQuestion["tipo"];
  nextHref: string | null;
  listHref: string;
}) {
  const gab = result.solution.gabarito;
  const gabLabel = tipo === "certo_errado" ? (gab === "C" ? "Certo" : "Errado") : gab;
  const c = result.community;
  return (
    <div
      role="status"
      className={cn(
        "mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border px-4 py-3.5",
        result.correct ? "border-success/35 bg-success/10" : "border-danger/35 bg-danger/10",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full text-white",
          result.correct ? "bg-success" : "bg-danger",
        )}
      >
        {result.correct ? (
          <Check className="size-5" strokeWidth={3} />
        ) : (
          <X className="size-5" strokeWidth={3} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15.5px] font-semibold text-fg">
          {tipo === "discursiva"
            ? result.correct
              ? "Você marcou que acertou."
              : "Você marcou que errou. Revise a resposta esperada."
            : `${result.correct ? "Você acertou!" : "Você errou."} Gabarito: ${gabLabel}`}
        </p>
        <p className="text-[12.5px] text-fg-2">
          {c.total > 1
            ? `${Math.round((c.correct / c.total) * 100)}% ${tipo === "discursiva" ? "marcaram acerto" : "de acerto"} entre ${c.total} respostas no app`
            : "Primeira resposta registrada no app para esta questão"}
        </p>
      </div>
      {nextHref ? (
        <Button asChild variant="primary" className="max-sm:w-full">
          <Link href={nextHref}>
            Próxima questão
            <ChevronRight />
          </Link>
        </Button>
      ) : (
        <Button asChild variant="secondary" className="max-sm:w-full">
          <Link href={listHref}>Voltar aos filtros</Link>
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Abas: gabarito comentado, por alternativa, estatísticas, anotação, erro */
/* ------------------------------------------------------------------ */

function Panels({
  q,
  result,
  tab,
  setTab,
  note,
  onNoteSaved,
}: {
  q: PublicQuestion;
  result: Answered | null;
  tab: Tab | null;
  setTab: (t: Tab | null) => void;
  note: string | null;
  onNoteSaved: (n: string | null) => void;
}) {
  const id = useId();
  const tabs: { value: Tab; label: string; icon: typeof Flag }[] = [
    ...(result
      ? [
          { value: "solution" as const, label: "Gabarito comentado", icon: BookOpenCheck },
          ...(q.tipo === "multipla_escolha" && result.solution.explicacoes
            ? [{ value: "alternatives" as const, label: "Por alternativa", icon: ListFilter }]
            : []),
          { value: "stats" as const, label: "Estatísticas", icon: ChartColumn },
        ]
      : []),
    { value: "note", label: note ? "Anotação (1)" : "Anotação", icon: NotebookPen },
    { value: "report", label: "Reportar erro", icon: Flag },
  ];

  return (
    <div className="border-t border-border bg-surface-2/40">
      <div
        role="tablist"
        aria-label="Detalhes da questão"
        className="flex gap-1 overflow-x-auto px-2 pt-2 sm:px-4"
      >
        {tabs.map((t) => {
          const on = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              id={`${id}-${t.value}`}
              aria-selected={on}
              aria-controls={`${id}-panel`}
              onClick={() => setTab(on ? null : t.value)}
              className={cn(
                "relative flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors [&_svg]:size-4",
                on ? "bg-surface-1 text-fg" : "text-fg-2 hover:text-fg",
              )}
            >
              <t.icon aria-hidden className={on ? "text-accent" : "text-fg-3"} />
              {t.label}
              {on && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent" aria-hidden />}
            </button>
          );
        })}
      </div>
      {tab && (
        <div
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-${tab}`}
          className="bg-surface-1 px-4 py-5 sm:px-6"
        >
          {tab === "solution" && result && <SolutionPanel result={result} tipo={q.tipo} />}
          {tab === "alternatives" && result && <AlternativesPanel q={q} result={result} />}
          {tab === "stats" && result && <StatsPanel q={q} result={result} />}
          {tab === "note" && <NotePanel id={q.id} note={note} onSaved={onNoteSaved} />}
          {tab === "report" && <ReportPanel id={q.id} onDone={() => setTab(null)} />}
        </div>
      )}
    </div>
  );
}

function SolutionPanel({ result, tipo }: { result: Answered; tipo: PublicQuestion["tipo"] }) {
  const s = result.solution;
  const gabLabel =
    tipo === "certo_errado" ? (s.gabarito === "C" ? "Certo" : "Errado") : `Alternativa ${s.gabarito}`;
  return (
    <div className="flex flex-col gap-4">
      {tipo === "discursiva" ? (
        s.respostaEsperada && <ExpectedAnswer text={s.respostaEsperada} />
      ) : (
        <p className="flex items-center gap-2 text-[14px] font-semibold text-fg">
          <CircleCheck className="size-4 text-success" aria-hidden />
          Gabarito: {gabLabel}
        </p>
      )}
      {s.justificativa && !s.justificativaIsLead && (
        <div className="rounded-xl border-l-[3px] border-accent bg-accent-subtle px-4 py-3">
          <p className="text-[12px] font-semibold text-accent">Em uma frase</p>
          <p className="mt-0.5 text-[14.5px] leading-relaxed text-fg">{s.justificativa}</p>
        </div>
      )}
      {s.comentario && (
        <div>
          <p className="text-[12.5px] font-semibold text-fg-2">Comentário</p>
          <p className="mt-1 text-[15px] leading-[1.7] whitespace-pre-line text-fg">{s.comentario}</p>
        </div>
      )}
      {!s.comentario && !s.justificativa && (
        <p className="text-[14px] text-fg-2">Esta questão ainda não tem comentário.</p>
      )}
      {s.referencias.length > 0 && (
        <div>
          <p className="text-[12.5px] font-semibold text-fg-2">Para conferir na fonte</p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {s.referencias.map((r, i) => (
              <li key={i} className="text-[13.5px]">
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
                  >
                    {r.titulo || r.url}
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                ) : (
                  <span className="text-fg">{r.titulo}</span>
                )}
                {r.localizador && <span className="text-fg-3"> · {r.localizador}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {s.licenca && <p className="text-[12px] text-fg-3">{s.licenca}</p>}
    </div>
  );
}

function AlternativesPanel({ q, result }: { q: PublicQuestion; result: Answered }) {
  const s = result.solution;
  return (
    <ul className="flex flex-col gap-3">
      {letters(q.alternativas).map((l) => {
        const right = l === s.gabarito;
        const why = right ? s.justificativa : s.explicacoes?.[l];
        return (
          <li key={l} className="flex gap-3">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                right ? "bg-success text-white" : "bg-surface-2 text-fg-2",
              )}
            >
              {l}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-fg">
                {right ? "Correta" : l === result.answer ? "Sua resposta, incorreta" : "Incorreta"}
              </p>
              <p className="mt-0.5 text-[14.5px] leading-relaxed text-fg-2">
                {why || "Sem explicação para esta alternativa."}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StatsPanel({ q, result }: { q: PublicQuestion; result: Answered }) {
  const c = result.community;
  const opts = q.tipo === "multipla_escolha" ? letters(q.alternativas) : ["C", "E"];
  const label = (v: string) =>
    q.tipo === "discursiva"
      ? v === "C"
        ? "Acertei"
        : "Errei"
      : q.tipo === "certo_errado"
        ? v === "C"
          ? "Certo"
          : "Errado"
        : v;
  return (
    <div>
      <p className="text-[13.5px] text-fg-2">
        {c.total.toLocaleString("pt-BR")} {c.total === 1 ? "resposta registrada" : "respostas registradas"} no
        app ·{" "}
        <strong className="font-semibold text-fg">
          {c.total ? Math.round((c.correct / c.total) * 100) : 0}% de acerto
        </strong>
      </p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {opts.map((v) => {
          const n = c.byAnswer[v] ?? 0;
          const pct = c.total ? Math.round((n / c.total) * 100) : 0;
          const right = q.tipo === "discursiva" ? v === "C" : v === result.solution.gabarito;
          return (
            <li key={v} className="grid grid-cols-[72px_1fr_72px] items-center gap-3 text-[13px]">
              <span className={cn("font-semibold", right ? "text-success" : "text-fg-2")}>{label(v)}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-3">
                <span
                  className={cn("block h-full rounded-full", right ? "bg-success" : "bg-fg-3/60")}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="text-right text-fg-2 tabular-nums">
                {pct}% <span className="text-fg-3">({n})</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12px] text-fg-3">
        Conta todas as respostas dadas no app, sem identificar quem respondeu.
      </p>
    </div>
  );
}

function NotePanel({
  id,
  note,
  onSaved,
}: {
  id: string;
  note: string | null;
  onSaved: (n: string | null) => void;
}) {
  const [value, setValue] = useState(note ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveNoteAction(id, value);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      onSaved(r.note);
      toast.success(r.note ? "Anotação salva" : "Anotação apagada");
    });
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={`note-${id}`} className="text-[13px] font-medium text-fg-2">
        Sua anotação nesta questão (só você vê)
      </label>
      <Textarea
        id={`note-${id}`}
        value={value}
        maxLength={5000}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ex.: confundi oração adverbial com sujeito. Revisar pontuação."
        className="min-h-[96px]"
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex justify-end gap-2">
        {note && (
          <Button variant="ghost" disabled={pending} onClick={() => setValue("")}>
            Limpar texto
          </Button>
        )}
        <Button variant="primary" loading={pending} disabled={value.trim() === (note ?? "")} onClick={save}>
          Salvar anotação
        </Button>
      </div>
    </div>
  );
}

function ReportPanel({ id, onDone }: { id: string; onDone: () => void }) {
  const [category, setCategory] = useState<keyof typeof REPORT_CATEGORIES>("gabarito");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const send = () =>
    start(async () => {
      setError(null);
      const r = await reportQuestionAction({ id, category, message });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      toast.success("Erro reportado. A conta administradora vai revisar.");
      onDone();
    });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`cat-${id}`} className="text-[13px] font-medium text-fg-2">
          O que está errado?
        </label>
        <select
          id={`cat-${id}`}
          value={category}
          onChange={(e) => setCategory(e.target.value as keyof typeof REPORT_CATEGORIES)}
          className={cn(selectClass, "h-9 w-full max-w-[360px] text-[14px]")}
          style={{ backgroundImage: selectChevron }}
        >
          {Object.entries(REPORT_CATEGORIES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`msg-${id}`} className="text-[13px] font-medium text-fg-2">
          Detalhes (opcional)
        </label>
        <Textarea
          id={`msg-${id}`}
          value={message}
          maxLength={2000}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Explique o problema e, se puder, a fonte."
        />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex justify-end">
        <Button variant="primary" loading={pending} onClick={send}>
          <Flag />
          Enviar relato
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Discursiva: escrever, ver a resposta esperada e se autoavaliar      */
/* ------------------------------------------------------------------ */

function ExpectedAnswer({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-success/30 bg-success/[0.07] px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-success">
        <BookOpenCheck className="size-4" aria-hidden />
        Resposta esperada
      </p>
      <p className="mt-1.5 text-[15px] leading-[1.7] whitespace-pre-line text-fg">{text}</p>
    </div>
  );
}

function Discursive({
  id,
  result,
  onGraded,
  nextHref,
  listHref,
  lastResponse,
}: {
  id: string;
  result: Answered | null;
  onGraded: (r: Answered) => void;
  nextHref: string | null;
  listHref: string;
  lastResponse: string | null;
}) {
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [grading, setGrading] = useState<"C" | "E" | null>(null);

  const reveal = () =>
    start(async () => {
      const r = await revealDiscursiveAction(id);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      setRevealed(r.solution.respostaEsperada ?? "");
    });

  const grade = (correct: boolean) => {
    setGrading(correct ? "C" : "E");
    start(async () => {
      const r = await gradeDiscursiveAction(id, correct, draft);
      setGrading(null);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      onGraded({ ...r, answer: correct ? "C" : "E" });
    });
  };

  if (result) {
    return (
      <>
        {draft.trim() && (
          <div className="mt-6 rounded-xl border border-border bg-surface-2/60 px-4 py-3.5">
            <p className="text-[12.5px] font-semibold text-fg-2">Sua resposta</p>
            <p className="mt-1.5 text-[15px] leading-[1.7] whitespace-pre-line text-fg">{draft.trim()}</p>
          </div>
        )}
        <ResultBanner result={result} tipo="discursiva" nextHref={nextHref} listHref={listHref} />
      </>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`resp-${id}`} className="flex items-center gap-1.5 text-[13px] font-medium text-fg-2">
          <PenLine className="size-4 text-fg-3" aria-hidden />
          Sua resposta
        </label>
        <Textarea
          id={`resp-${id}`}
          value={draft}
          maxLength={10000}
          readOnly={revealed !== null}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva sua resposta. Depois compare com a resposta esperada."
          className="min-h-[140px] text-[15px] read-only:opacity-80"
        />
        {lastResponse && revealed === null && (
          <details className="text-[12.5px] text-fg-3">
            <summary className="cursor-pointer hover:text-fg-2">Ver sua última resposta</summary>
            <p className="mt-1.5 whitespace-pre-line text-fg-2">{lastResponse}</p>
          </details>
        )}
      </div>

      {revealed === null ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-fg-3">
            Escrever é opcional; dá para responder de cabeça e conferir.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="min-w-[200px] max-md:w-full"
            loading={pending}
            onClick={reveal}
          >
            <Eye />
            Ver resposta esperada
          </Button>
        </div>
      ) : (
        <>
          <ExpectedAnswer text={revealed} />
          <div className="rounded-xl border border-border bg-surface-2/50 px-4 py-3.5">
            <p className="text-[14px] font-semibold text-fg">Como foi sua resposta?</p>
            <p className="mt-0.5 text-[12.5px] text-fg-3">
              Compare com a resposta esperada. Isso entra no seu desempenho e no filtro “Errei”.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="h-12 border-success/40 hover:border-success hover:bg-success/10"
                loading={pending && grading === "C"}
                disabled={pending}
                onClick={() => grade(true)}
              >
                <CircleCheck className="text-success" />
                Acertei
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="h-12 border-danger/40 hover:border-danger hover:bg-danger/10"
                loading={pending && grading === "E"}
                disabled={pending}
                onClick={() => grade(false)}
              >
                <CircleX className="text-danger" />
                Errei
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
