"use client";

import { useState, useTransition } from "react";
import { Check, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { addDays, weekStartOf } from "@/lib/dates";
import { minutesToInput, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GroupLabel } from "@/features/sessions/components/pickers";
import { deleteChallengeAction, saveChallengeAction, type JourneyResult } from "../actions";
import {
  CHALLENGE_METRIC_LABEL,
  PERSON_COLORS,
  challengeDone,
  challengeStatus,
  metricAmount,
  type Challenge,
  type ChallengeKind,
  type ChallengeMetric,
  type ChallengeScope,
} from "../model";

export type ChallengeView = Challenge & { me: number; partner: number | null };

type People = { me: string; partner: string; partnerShares: boolean };

export function ChallengesSection({
  challenges,
  people,
  todayISO,
  weekStartsOn,
}: {
  challenges: ChallengeView[];
  people: People;
  todayISO: string;
  weekStartsOn: number;
}) {
  const [editing, setEditing] = useState<ChallengeView | "new" | null>(null);
  const [deleting, setDeleting] = useState<ChallengeView | null>(null);
  const live = challenges.filter((c) => challengeStatus(c, todayISO) !== "ended");
  const ended = challenges.filter((c) => challengeStatus(c, todayISO) === "ended").reverse();

  return (
    <section aria-labelledby="challenges-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="challenges-title" className="text-[14px] font-semibold text-fg">
          Metas conjuntas e desafios
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setEditing("new")}>
          <Plus />
          Novo
        </Button>
      </div>
      {live.length === 0 ? (
        <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">
          Combinem um objetivo: estudar 20h juntos no mês, ou cada um resolver 100 questões nesta semana. Cada
          pessoa continua com as próprias matérias.
        </p>
      ) : (
        <ul className="mt-1 divide-y divide-border">
          {live.map((c) => (
            <ChallengeRow
              key={c.id}
              c={c}
              people={people}
              todayISO={todayISO}
              onEdit={() => setEditing(c)}
              onDelete={() => setDeleting(c)}
            />
          ))}
        </ul>
      )}
      {!people.partnerShares && live.length > 0 && (
        <p className="mt-2 text-[12.5px] text-fg-3">
          {people.partner} não compartilha o tempo de estudo, então só o seu progresso aparece.
        </p>
      )}
      {ended.length > 0 && (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-[13px] text-fg-2 select-none hover:text-fg">
            Encerrados ({ended.length})
          </summary>
          <ul className="mt-1 divide-y divide-border">
            {ended.map((c) => (
              <ChallengeRow
                key={c.id}
                c={c}
                people={people}
                todayISO={todayISO}
                onEdit={() => setEditing(c)}
                onDelete={() => setDeleting(c)}
              />
            ))}
          </ul>
        </details>
      )}
      <ChallengeDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        challenge={editing && editing !== "new" ? editing : undefined}
        todayISO={todayISO}
        weekStartsOn={weekStartsOn}
      />
      <DeleteChallenge c={deleting} onOpenChange={(o) => !o && setDeleting(null)} />
    </section>
  );
}

function ChallengeRow({
  c,
  people,
  todayISO,
  onEdit,
  onDelete,
}: {
  c: ChallengeView;
  people: People;
  todayISO: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = challengeStatus(c, todayISO);
  const done = challengeDone(c, { me: c.me, partner: c.partner });
  const showPartner = c.partner !== null;
  const period = `${shortDate(c.starts_on, todayISO)} a ${shortDate(c.ends_on, todayISO)}`;
  const remaining = Math.max(0, Math.round((Date.parse(c.ends_on) - Date.parse(todayISO)) / 86_400_000));

  return (
    <li className="py-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-[14px] text-fg">
            {c.title}
            {done && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-success">
                <Check className="size-3.5" />
                Cumprido
              </span>
            )}
            {status === "ended" && !done && <span className="text-[12px] text-fg-3">Não cumprido</span>}
          </p>
          <p className="mt-0.5 text-[12.5px] text-fg-3">
            {c.kind === "weekly_challenge" ? "Desafio da semana" : "Meta conjunta"}:{" "}
            {c.scope === "combined" ? "juntos, " : "cada um, "}
            {metricAmount(c.metric, c.target)} · {period}
            {status === "active" &&
              remaining > 0 &&
              ` · faltam ${remaining} ${remaining === 1 ? "dia" : "dias"}`}
            {status === "upcoming" && " · começa em breve"}
          </p>
          {c.description && <p className="mt-1 text-[13px] text-fg-2">{c.description}</p>}
        </div>
        <Menu>
          <MenuTrigger
            aria-label={`Ações de ${c.title}`}
            className="-mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-3 outline-none hover:bg-surface-2 hover:text-fg data-[state=open]:bg-surface-2"
          >
            <MoreHorizontal className="size-4" />
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem onSelect={onEdit}>
              <Pencil />
              Editar
            </MenuItem>
            <MenuSeparator />
            <MenuItem destructive onSelect={onDelete}>
              <Trash2 />
              Excluir
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      {c.scope === "combined" ? (
        <div className="mt-2.5">
          <div
            className="flex h-2 gap-[2px] overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label={`Progresso de ${c.title}`}
            aria-valuemin={0}
            aria-valuemax={c.target}
            aria-valuenow={c.me + (c.partner ?? 0)}
          >
            {c.me > 0 && (
              <div
                style={{ width: `${Math.min(100, (c.me / c.target) * 100)}%`, background: PERSON_COLORS.me }}
              />
            )}
            {showPartner && (c.partner ?? 0) > 0 && (
              <div
                style={{
                  width: `${Math.min(100 - Math.min(100, (c.me / c.target) * 100), ((c.partner ?? 0) / c.target) * 100)}%`,
                  background: PERSON_COLORS.partner,
                }}
              />
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] text-fg-2 tabular-nums">
            {metricAmount(c.metric, c.me + (c.partner ?? 0))} de {metricAmount(c.metric, c.target)}
            <span className="text-fg-3">
              {" "}
              ({people.me}: {metricAmount(c.metric, c.me)}
              {showPartner && `; ${people.partner}: ${metricAmount(c.metric, c.partner ?? 0)}`})
            </span>
          </p>
        </div>
      ) : (
        <div className="mt-2.5 flex flex-col gap-2">
          {[
            { who: people.me, v: c.me, color: PERSON_COLORS.me },
            ...(showPartner
              ? [{ who: people.partner, v: c.partner ?? 0, color: PERSON_COLORS.partner }]
              : []),
          ].map((p) => (
            <div
              key={p.who}
              className="grid grid-cols-[minmax(0,90px)_1fr_auto] items-center gap-3 text-[12.5px]"
            >
              <span className="truncate text-fg-2">{p.who}</span>
              <div
                className="h-2 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-label={`Progresso de ${p.who} em ${c.title}`}
                aria-valuemin={0}
                aria-valuemax={c.target}
                aria-valuenow={p.v}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, (p.v / c.target) * 100)}%`, background: p.color }}
                />
              </div>
              <span className="text-fg tabular-nums">{metricAmount(c.metric, p.v)}</span>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

const chip =
  "inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-[13px] transition-colors select-none";
const on = "border-accent bg-accent-subtle text-fg";
const off = "border-border bg-surface-2 text-fg-2 hover:border-border-strong hover:text-fg";

const SUGGEST: Record<ChallengeMetric, Record<ChallengeKind, string>> = {
  minutes: { weekly_challenge: "10h", joint_goal: "40h" },
  sessions: { weekly_challenge: "10", joint_goal: "40" },
  study_days: { weekly_challenge: "5", joint_goal: "20" },
  questions: { weekly_challenge: "100", joint_goal: "500" },
};

function ChallengeDialog({
  open,
  onOpenChange,
  challenge,
  todayISO,
  weekStartsOn,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  challenge?: ChallengeView;
  todayISO: string;
  weekStartsOn: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={challenge ? "Editar" : "Nova meta conjunta ou desafio"}
        description={challenge ? undefined : "O progresso vem das sessões de cada um, nas próprias matérias."}
      >
        {open && (
          <ChallengeForm
            challenge={challenge}
            todayISO={todayISO}
            weekStartsOn={weekStartsOn}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChallengeForm({
  challenge,
  todayISO,
  weekStartsOn,
  onDone,
}: {
  challenge?: ChallengeView;
  todayISO: string;
  weekStartsOn: number;
  onDone: () => void;
}) {
  const thisWeek = weekStartOf(todayISO, weekStartsOn);
  const [kind, setKind] = useState<ChallengeKind>(challenge?.kind ?? "weekly_challenge");
  const [title, setTitle] = useState(challenge?.title ?? "");
  const [metric, setMetric] = useState<ChallengeMetric>(challenge?.metric ?? "minutes");
  const [scope, setScope] = useState<ChallengeScope>(challenge?.scope ?? "combined");
  const [target, setTarget] = useState(
    challenge
      ? challenge.metric === "minutes"
        ? minutesToInput(challenge.target)
        : String(challenge.target)
      : "",
  );
  const [week, setWeek] = useState<"this" | "next">(
    challenge && challenge.starts_on > thisWeek ? "next" : "this",
  );
  const [startsOn, setStartsOn] = useState(challenge?.starts_on ?? todayISO);
  const [endsOn, setEndsOn] = useState(challenge?.ends_on ?? addDays(todayISO, 29));
  const [error, setError] = useState<Extract<JourneyResult, { ok: false }> | null>(null);
  const [pending, startTransition] = useTransition();
  const placeholder = SUGGEST[metric][kind];

  const weekFrom = week === "this" ? thisWeek : addDays(thisWeek, 7);
  const dates =
    kind === "weekly_challenge" ? { startsOn: weekFrom, endsOn: addDays(weekFrom, 6) } : { startsOn, endsOn };

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await saveChallengeAction({
        id: challenge?.id,
        kind,
        title: title.trim() || defaultTitle(kind, metric, scope),
        metric,
        scope,
        target: target || placeholder,
        ...dates,
      });
      if (!res.ok) return setError(res);
      toast.success(
        challenge ? "Atualizado" : kind === "weekly_challenge" ? "Desafio criado" : "Meta conjunta criada",
      );
      onDone();
    });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
    >
      <DialogBody className="flex flex-col gap-5">
        {error && !error.field && <Notice tone="error">{error.message}</Notice>}
        <div className="flex flex-col gap-2">
          <GroupLabel id="ch-kind">Tipo</GroupLabel>
          <Segmented<ChallengeKind>
            label="Tipo"
            value={kind}
            onChange={setKind}
            options={[
              { value: "weekly_challenge", label: "Desafio da semana" },
              { value: "joint_goal", label: "Meta conjunta" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <GroupLabel id="ch-metric">O que contar</GroupLabel>
          <div role="radiogroup" aria-labelledby="ch-metric" className="flex flex-wrap gap-1.5">
            {(Object.keys(CHALLENGE_METRIC_LABEL) as ChallengeMetric[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={metric === m}
                onClick={() => {
                  setMetric(m);
                  setTarget("");
                }}
                className={cn(chip, metric === m ? on : off)}
              >
                {CHALLENGE_METRIC_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <GroupLabel id="ch-scope">Como contar</GroupLabel>
          <div role="radiogroup" aria-labelledby="ch-scope" className="flex flex-wrap gap-1.5">
            <button
              type="button"
              role="radio"
              aria-checked={scope === "combined"}
              onClick={() => setScope("combined")}
              className={cn(chip, scope === "combined" ? on : off)}
            >
              Juntos (soma dos dois)
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={scope === "each"}
              onClick={() => setScope("each")}
              className={cn(chip, scope === "each" ? on : off)}
            >
              Cada um
            </button>
          </div>
        </div>

        <Field
          label={metric === "minutes" ? "Tempo" : CHALLENGE_METRIC_LABEL[metric]}
          error={error?.field === "target" ? error.message : undefined}
          hint={metric === "minutes" ? "Ex.: 10h, 90 ou 1:30." : undefined}
          className="max-w-[220px]"
        >
          {(p) => (
            <Input
              {...p}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={placeholder}
              inputMode="numeric"
              autoComplete="off"
              className="tabular-nums"
            />
          )}
        </Field>

        {kind === "weekly_challenge" ? (
          <div className="flex flex-col gap-2">
            <GroupLabel id="ch-week">Semana</GroupLabel>
            <Segmented<"this" | "next">
              label="Semana"
              value={week}
              onChange={setWeek}
              options={[
                { value: "this", label: "Esta semana" },
                { value: "next", label: "Próxima" },
              ]}
            />
            <p className="text-[12.5px] text-fg-3">
              De {shortDate(dates.startsOn, todayISO)} a {shortDate(dates.endsOn, todayISO)}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início">
              {(p) => (
                <Input {...p} type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
              )}
            </Field>
            <Field label="Fim" error={error?.field === "dates" ? error.message : undefined}>
              {(p) => <Input {...p} type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />}
            </Field>
          </div>
        )}
        {kind === "weekly_challenge" && error?.field === "dates" && (
          <p className="text-[12.5px] text-danger" role="alert">
            {error.message}
          </p>
        )}

        <Field
          label="Nome (opcional)"
          error={error?.field === "title" ? error.message : undefined}
          hint={title.trim() ? undefined : `Se ficar vazio: “${defaultTitle(kind, metric, scope)}”`}
        >
          {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />}
        </Field>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          {challenge ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function defaultTitle(kind: ChallengeKind, metric: ChallengeMetric, scope: ChallengeScope) {
  const what = {
    minutes: "Horas de estudo",
    sessions: "Sessões",
    study_days: "Dias de estudo",
    questions: "Questões",
  }[metric];
  return `${what} ${scope === "combined" ? "juntos" : "de cada um"}${kind === "weekly_challenge" ? " na semana" : ""}`;
}

function DeleteChallenge({
  c,
  onOpenChange,
}: {
  c: ChallengeView | null;
  onOpenChange: (o: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={c !== null} onOpenChange={onOpenChange}>
      <DialogContent title="Excluir?">
        <DialogBody>
          <p className="text-[13.5px] leading-relaxed text-fg-2">
            <span className="font-medium text-fg">{c?.title}</span> some para vocês dois. As sessões não são
            afetadas.
          </p>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              c &&
              startTransition(async () => {
                const res = await deleteChallengeAction(c.id);
                if (!res.ok) return void toast.error(res.message);
                toast.success("Excluído");
                onOpenChange(false);
              })
            }
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
