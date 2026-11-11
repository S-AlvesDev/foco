"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Command } from "cmdk";
import { Popover } from "radix-ui";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  ListChecks,
  Play,
  RotateCcw,
  Search,
  Shuffle,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { setAreaAction } from "../actions";
import {
  activeFilterCount,
  areaLabel,
  emptyLists,
  filtersToParams,
  LIST_FILTER_LABELS,
  LIST_FILTERS,
  STATUS,
  STATUS_LABELS,
  valueLabel,
  type Filters,
  type ListFilter,
  type Status,
} from "../model";
import type { Facets } from "../queries";

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;

export function QuestionFilters({
  filters,
  facets,
  catalog,
}: {
  filters: Filters;
  facets: Facets;
  catalog: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setOptimistic] = useOptimistic(filters);
  const [order, setOrder] = useState<"seq" | "random">("seq");
  const [seed, setSeed] = useState("");

  const go = (next: Filters) => {
    start(() => {
      setOptimistic(next);
      router.replace(`/questoes?${filtersToParams(next)}`, { scroll: false });
    });
  };

  const toggle = (key: ListFilter, value: string) => {
    const cur = f.lists[key];
    const nextList = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    go({ ...f, lists: { ...f.lists, [key]: nextList } });
  };

  const setArea = (area: string) => {
    if (area === f.area) return;
    // Concurso, disciplina e assunto mudam de uma área para outra: recomeça os filtros.
    go({ area, lists: emptyLists(), status: f.status, text: "" });
    setAreaAction(area).then((r) => !r.ok && toast.error(r.message));
  };

  const total = facets.status[f.status] ?? 0;
  const answered = facets.status.answered;
  const rate = answered > 0 ? Math.round((facets.status.correct / answered) * 100) : null;
  const solveHref = `/questoes/resolver?${filtersToParams(f, { n: 1, s: order === "random" ? seed : null })}`;
  const active = activeFilterCount(f);

  const areaOptions = [
    ...facets.area.map((a) => ({ value: a.value, label: `${areaLabel(a.value)}`, n: a.n })),
    { value: "todas", label: "Todas", n: catalog },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Área */}
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Área">
        {areaOptions.map((a) => {
          const on = (f.area ?? "todas") === a.value;
          return (
            <button
              key={a.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setArea(a.value)}
              className={cn(
                "flex h-9 cursor-pointer items-center gap-2 rounded-full border px-4 text-[13.5px] font-medium transition-colors",
                on
                  ? "border-transparent bg-accent bg-(image:--accent-fill) text-accent-fg"
                  : "border-border bg-surface-1 text-fg-2 hover:border-border-strong hover:text-fg",
              )}
            >
              {a.label}
              <span className={cn("text-[12px] tabular-nums", on ? "text-white/75" : "text-fg-3")}>
                {a.n.toLocaleString("pt-BR")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Resumo da pessoa nestes filtros */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={ListChecks}
          label="Questões no filtro"
          value={facets.status.all.toLocaleString("pt-BR")}
        />
        <Stat
          icon={CircleCheck}
          label="Resolvidas"
          value={answered.toLocaleString("pt-BR")}
          sub={
            facets.status.all > 0
              ? `${Math.round((answered / facets.status.all) * 100)}% do filtro`
              : undefined
          }
        />
        <Stat
          icon={Check}
          label="Acertos"
          value={rate === null ? "—" : `${rate}%`}
          sub={answered > 0 ? plural(facets.status.correct, "acerto", "acertos") : "Resolva para medir"}
          tone={rate === null ? undefined : rate >= 70 ? "good" : rate >= 50 ? "mid" : "low"}
        />
        <Stat
          icon={CircleX}
          label="Para refazer"
          value={facets.status.wrong.toLocaleString("pt-BR")}
          sub={facets.status.wrong > 0 ? "Última resposta errada" : "Nenhuma pendente"}
          action={
            facets.status.wrong > 0 && f.status !== "wrong" ? (
              <button
                type="button"
                onClick={() => go({ ...f, status: "wrong" })}
                className="cursor-pointer text-[12.5px] font-semibold text-accent hover:underline"
              >
                Refazer erradas
              </button>
            ) : undefined
          }
        />
      </div>

      {/* Filtros */}
      <section
        aria-labelledby="filters-title"
        className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="filters-title" className="text-[15px] font-semibold text-fg">
            Filtros
          </h2>
          <div className="flex items-center gap-3 text-[12.5px] text-fg-3">
            {pending && <Spinner className="text-accent" />}
            {active > 0 && (
              <button
                type="button"
                onClick={() =>
                  go({
                    area: f.area,
                    lists: emptyLists(),
                    status: "all",
                    text: "",
                  })
                }
                className="flex cursor-pointer items-center gap-1 font-medium text-fg-2 hover:text-fg"
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {LIST_FILTERS.map((k) => (
            <FilterPicker
              key={k}
              field={k}
              options={facets.lists[k]}
              selected={f.lists[k]}
              onToggle={(v) => toggle(k, v)}
              onClear={() => go({ ...f, lists: { ...f.lists, [k]: [] } })}
            />
          ))}
        </div>

        <TextSearch key={filters.text} initial={f.text} onSearch={(text) => go({ ...f, text })} />

        <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Situação">
          {STATUS.map((s) => (
            <StatusChip
              key={s}
              status={s}
              n={facets.status[s]}
              on={f.status === s}
              onClick={() => go({ ...f, status: s })}
            />
          ))}
        </div>

        {active > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-4">
            <span className="mr-1 text-[12.5px] text-fg-3">Filtros ativos:</span>
            {LIST_FILTERS.flatMap((k) =>
              f.lists[k].map((v) => (
                <ActiveChip
                  key={`${k}:${v}`}
                  label={`${LIST_FILTER_LABELS[k]}: ${valueLabel(k, v)}`}
                  onRemove={() => toggle(k, v)}
                />
              )),
            )}
            {f.status !== "all" && (
              <ActiveChip
                label={`Situação: ${STATUS_LABELS[f.status]}`}
                onRemove={() => go({ ...f, status: "all" })}
              />
            )}
            {f.text && <ActiveChip label={`Texto: “${f.text}”`} onRemove={() => go({ ...f, text: "" })} />}
          </div>
        )}
      </section>

      {/* Resultado e início */}
      <div className="z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-1/90 px-4 py-3 shadow-pop backdrop-blur-xl md:sticky md:bottom-4">
        <p className="text-[14px] text-fg-2" aria-live="polite">
          <strong className="text-[18px] font-bold text-fg tabular-nums">
            {total.toLocaleString("pt-BR")}
          </strong>{" "}
          {total === 1 ? "questão encontrada" : "questões encontradas"}
        </p>
        <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>a]:flex-1 max-sm:[&>button]:flex-1">
          <Segmented
            label="Ordem das questões"
            value={order}
            onChange={(v) => {
              setOrder(v);
              if (v === "random") setSeed(Math.random().toString(36).slice(2, 10));
            }}
            options={[
              { value: "seq", label: "Em ordem" },
              { value: "random", label: "Aleatória", icon: <Shuffle aria-hidden /> },
            ]}
          />
          {total > 0 ? (
            <Button asChild variant="primary" size="lg">
              <Link href={solveHref}>
                <Play />
                Resolver questões
              </Link>
            </Button>
          ) : (
            <Button variant="primary" size="lg" disabled>
              <Play />
              Resolver questões
            </Button>
          )}
        </div>
      </div>

      {total === 0 && (
        <p className="rounded-2xl border border-dashed border-border-strong px-5 py-8 text-center text-[13.5px] text-fg-2">
          Nenhuma questão com esses filtros. Os filtros se somam: remova um critério para ver mais questões.
        </p>
      )}

      {/* Composição do filtro */}
      {facets.lists.disciplina.length > 0 && total > 0 && (
        <Breakdown
          title="Disciplinas neste filtro"
          items={facets.lists.disciplina}
          selected={f.lists.disciplina}
          onToggle={(v) => toggle("disciplina", v)}
        />
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  action,
}: {
  icon: typeof Check;
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "mid" | "low";
  action?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface-1 p-4 shadow-card">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-fg-2">
        <Icon className="size-4 text-fg-3" aria-hidden />
        {label}
      </div>
      <p
        className={cn(
          "num mt-2 text-[26px] leading-none font-semibold text-fg",
          tone === "good" && "text-success",
          tone === "mid" && "text-warning",
          tone === "low" && "text-danger",
        )}
      >
        {value}
      </p>
      <div className="mt-1.5 flex min-h-[18px] flex-wrap items-center justify-between gap-x-2 text-[12.5px] text-fg-3">
        {sub && <span className="truncate">{sub}</span>}
        {action}
      </div>
    </div>
  );
}

function StatusChip({
  status,
  n,
  on,
  onClick,
}: {
  status: Status;
  n: number;
  on: boolean;
  onClick: () => void;
}) {
  const Icon =
    status === "favorite" ? Star : status === "correct" ? CircleCheck : status === "wrong" ? CircleX : null;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors [&_svg]:size-3.5",
        on
          ? "border-accent/50 bg-accent-subtle text-fg"
          : "border-border bg-surface-2 text-fg-2 hover:border-border-strong hover:text-fg",
      )}
    >
      {Icon && <Icon aria-hidden className={on ? "text-accent" : "text-fg-3"} />}
      {STATUS_LABELS[status]}
      <span className="text-[12px] text-fg-3 tabular-nums">{n.toLocaleString("pt-BR")}</span>
    </button>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex h-7 max-w-full items-center gap-1 rounded-full bg-surface-2 pr-1 pl-3 text-[12.5px] text-fg">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${label}`}
        className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-3 hover:bg-surface-3 hover:text-fg"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

function FilterPicker({
  field,
  options,
  selected,
  onToggle,
  onClear,
}: {
  field: ListFilter;
  options: { value: string; n: number }[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const label = LIST_FILTER_LABELS[field];
  // Opções escolhidas que sumiram das contagens (0 no filtro atual) continuam visíveis para desmarcar.
  const all = [
    ...options,
    ...selected.filter((s) => !options.some((o) => o.value === s)).map((value) => ({ value, n: 0 })),
  ];
  const summary =
    selected.length === 0
      ? "Todos"
      : selected.length === 1
        ? valueLabel(field, selected[0])
        : `${selected.length} escolhidos`;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "flex h-[52px] min-w-0 cursor-pointer flex-col items-start justify-center rounded-xl border px-3 text-left transition-colors",
          selected.length > 0
            ? "border-accent/50 bg-accent-subtle"
            : "border-border bg-surface-2 hover:border-border-strong",
          "data-[state=open]:border-accent",
        )}
      >
        <span className="text-[11.5px] font-medium text-fg-3">{label}</span>
        <span className="flex w-full items-center gap-1 text-[13.5px] text-fg">
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          <ChevronDown className="size-3.5 shrink-0 text-fg-3" aria-hidden />
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-xl bg-surface-3 shadow-pop data-[state=open]:animate-pop"
        >
          <Command loop className="flex max-h-[min(420px,60vh)] flex-col">
            {all.length > 7 && (
              <div className="flex items-center gap-2 border-b border-border px-3">
                <Search className="size-4 shrink-0 text-fg-3" aria-hidden />
                <Command.Input
                  autoFocus
                  placeholder={`Buscar ${label.toLowerCase()}…`}
                  className="h-10 w-full bg-transparent text-[14px] text-fg placeholder:text-fg-3 focus:outline-none"
                />
              </div>
            )}
            <Command.List className="overflow-y-auto overscroll-contain p-1">
              <Command.Empty className="px-3 py-6 text-center text-[13px] text-fg-3">
                Nada encontrado.
              </Command.Empty>
              {all.map((o) => {
                const on = selected.includes(o.value);
                return (
                  <Command.Item
                    key={o.value}
                    value={valueLabel(field, o.value)}
                    onSelect={() => onToggle(o.value)}
                    className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13.5px] text-fg-2 data-[selected=true]:bg-surface-2 data-[selected=true]:text-fg"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                        on ? "border-accent bg-accent text-white" : "border-border-strong",
                      )}
                      aria-hidden
                    >
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 leading-snug">{valueLabel(field, o.value)}</span>
                    <span className="text-[12px] text-fg-3 tabular-nums">{o.n.toLocaleString("pt-BR")}</span>
                  </Command.Item>
                );
              })}
            </Command.List>
          </Command>
          <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-2">
            <button
              type="button"
              onClick={onClear}
              disabled={selected.length === 0}
              className="h-8 cursor-pointer rounded-md px-2.5 text-[13px] text-fg-2 hover:bg-surface-2 hover:text-fg disabled:cursor-default disabled:opacity-40"
            >
              Limpar
            </button>
            <Button size="md" variant="primary" onClick={() => setOpen(false)}>
              Pronto
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function TextSearch({ initial, onSearch }: { initial: string; onSearch: (t: string) => void }) {
  const [value, setValue] = useState(initial);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (value.trim() !== initial) onSearch(value.trim());
    }, 450);
    return () => clearTimeout(t);
    // onSearch muda a cada render; a busca só depende do texto digitado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <label className="mt-2 flex h-10 items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 transition-colors focus-within:border-accent hover:border-border-strong">
      <Search className="size-4 shrink-0 text-fg-3" aria-hidden />
      <span className="sr-only">Buscar no enunciado</span>
      <input
        type="search"
        value={value}
        maxLength={120}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar no enunciado ou no assunto"
        className="h-full w-full bg-transparent text-[14px] text-fg placeholder:text-fg-3 focus:outline-none"
      />
    </label>
  );
}

function Breakdown({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: { value: string; n: number }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const max = Math.max(...items.map((i) => i.n), 1);
  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-5"
    >
      <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
      <p className="mt-0.5 text-[12.5px] text-fg-3">Toque numa disciplina para filtrar por ela.</p>
      <ul className="mt-4 grid gap-x-8 gap-y-1 md:grid-cols-2">
        {items.map((i) => {
          const on = selected.includes(i.value);
          return (
            <li key={i.value}>
              <button
                type="button"
                onClick={() => onToggle(i.value)}
                aria-pressed={on}
                className="group flex w-full cursor-pointer flex-col gap-1.5 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
              >
                <span className="flex w-full items-center gap-2 text-[13.5px]">
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      on ? "font-semibold text-fg" : "text-fg-2 group-hover:text-fg",
                    )}
                  >
                    {i.value}
                  </span>
                  <span className="text-[12.5px] text-fg-3 tabular-nums">{i.n.toLocaleString("pt-BR")}</span>
                </span>
                <span className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <span
                    className={cn("block h-full rounded-full", on ? "bg-accent" : "bg-accent/45")}
                    style={{ width: `${Math.max(3, (i.n / max) * 100)}%` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
