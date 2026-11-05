"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronRight, GripVertical, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDuration, plural, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { reorderSubjectsAction } from "../actions";
import { nextFreeColor } from "../colors";
import { ColorDot } from "./color-picker";
import { SubjectActions } from "./subject-actions";
import { SubjectFormDialog } from "./subject-form-dialog";

export type SubjectItem = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  archived: boolean;
  seconds: number;
  sessions: number;
  lastDate: string | null;
};

export function SubjectsView({ subjects, todayISO }: { subjects: SubjectItem[]; todayISO: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const active = subjects.filter((s) => !s.archived);
  const archived = subjects.filter((s) => s.archived);
  const defaultColor = nextFreeColor(active.map((s) => s.color));

  // Atalho "N" para nova matéria (fora de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable], [role=dialog], [role=menu]")) return;
      e.preventDefault();
      setCreateOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
            Matérias
          </h1>
          <p className="mt-1 text-[14px] text-fg-2">
            {active.length === 0
              ? "Cadastre o que você estuda."
              : `${plural(active.length, "matéria ativa", "matérias ativas")}. Arraste para mudar a ordem.`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus />
          Nova matéria
          <kbd className="ml-1 hidden rounded border border-white/25 px-1 text-[11px] leading-4 font-medium text-white/80 sm:inline">
            N
          </kbd>
        </Button>
      </div>

      {active.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} hasArchived={archived.length > 0} />
      ) : (
        <SortableList subjects={active} todayISO={todayISO} />
      )}

      {archived.length > 0 && <ArchivedList subjects={archived} todayISO={todayISO} />}

      <SubjectFormDialog open={createOpen} onOpenChange={setCreateOpen} defaultColor={defaultColor} />
    </>
  );
}

function EmptyState({ onCreate, hasArchived }: { onCreate: () => void; hasArchived: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong px-6 py-12 text-center">
      <p className="text-[14px] font-medium text-fg">
        {hasArchived ? "Nenhuma matéria ativa" : "Nenhuma matéria ainda"}
      </p>
      <p className="mx-auto mt-1.5 max-w-[380px] text-[13.5px] leading-relaxed text-fg-2">
        Cada matéria tem nome, cor e descrição. A ordem que você definir aqui é a mesma em todo o app.
      </p>
      <Button variant="secondary" className="mt-5" onClick={onCreate}>
        <Plus />
        Criar a primeira matéria
      </Button>
    </div>
  );
}

function ColumnHeads({ withHandle }: { withHandle: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "hidden h-8 items-center gap-3 border-b border-border px-2 text-[12px] text-fg-3 md:grid",
        withHandle
          ? "grid-cols-[20px_minmax(0,1fr)_96px_96px_88px_32px]"
          : "grid-cols-[minmax(0,1fr)_96px_96px_88px_32px]",
      )}
    >
      {withHandle && <span />}
      <span>Matéria</span>
      <span className="text-right">Estudado</span>
      <span className="text-right">Sessões</span>
      <span className="text-right">Última</span>
      <span />
    </div>
  );
}

function useSyncedOrder(subjects: SubjectItem[]) {
  // Ordem local para o arraste otimista; volta à do servidor quando ela muda.
  const serverKey = subjects.map((s) => s.id).join(",");
  const [state, setState] = useState({ key: serverKey, ids: subjects.map((s) => s.id) });
  if (state.key !== serverKey) {
    setState({ key: serverKey, ids: subjects.map((s) => s.id) });
  }
  return [state.ids, (ids: string[]) => setState((s) => ({ ...s, ids }))] as const;
}

function SortableList({ subjects, todayISO }: { subjects: SubjectItem[]; todayISO: string }) {
  const [ids, setIds] = useSyncedOrder(subjects);
  const [, startTransition] = useTransition();
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const ordered = ids.map((id) => byId.get(id)).filter((s): s is SubjectItem => Boolean(s));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const name = (id: string | number) => byId.get(String(id))?.name ?? "Matéria";
  const pos = (id: string | number) => ids.indexOf(String(id)) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Movendo ${name(active.id)}, posição ${pos(active.id)} de ${ids.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${name(active.id)} sobre a posição ${pos(over.id)} de ${ids.length}.`
        : `${name(active.id)} fora da lista.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${name(active.id)} solta na posição ${pos(over.id)} de ${ids.length}.`
        : `${name(active.id)} solta fora da lista.`,
    onDragCancel: ({ active }) => `Movimento cancelado. ${name(active.id)} voltou ao lugar.`,
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const previous = ids;
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setIds(next);
    startTransition(async () => {
      const res = await reorderSubjectsAction(next);
      if (!res.ok) {
        setIds(previous);
        toast.error(res.message);
      }
    });
  };

  return (
    <div>
      <ColumnHeads withHandle />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Para reordenar, pressione espaço ou Enter para pegar a matéria, use as setas para mover e espaço ou Enter para soltar. Esc cancela.",
          },
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="divide-y divide-border border-b border-border">
            {ordered.map((s) => (
              <SortableRow key={s.id} subject={s} todayISO={todayISO} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({ subject, todayISO }: { subject: SubjectItem; todayISO: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: subject.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
        transition,
      }}
      className={cn("relative bg-bg", isDragging && "z-10 rounded-md bg-surface-2 shadow-pop")}
    >
      <Row subject={subject} todayISO={todayISO}>
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="relative z-[1] flex h-8 w-5 cursor-grab touch-none items-center justify-center rounded text-fg-3 transition-colors hover:text-fg-2 active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          aria-label={`Reordenar ${subject.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </Row>
    </li>
  );
}

/** Linha da matéria: o nome cobre a linha inteira como link; alça e menu ficam acima. */
function Row({
  subject,
  todayISO,
  children,
}: {
  subject: SubjectItem;
  todayISO: string;
  children?: React.ReactNode;
}) {
  const withHandle = Boolean(children);
  return (
    <div
      className={cn(
        "group grid min-h-14 items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-2/60",
        withHandle
          ? "grid-cols-[20px_minmax(0,1fr)_auto] md:grid-cols-[20px_minmax(0,1fr)_96px_96px_88px_32px]"
          : "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_96px_96px_88px_32px]",
      )}
    >
      {children}
      <div className="min-w-0">
        <Link
          href={`/materias/${subject.id}`}
          className="flex items-center gap-2.5 rounded-sm text-[14px] font-medium text-fg after:absolute after:inset-0 after:content-['']"
        >
          <ColorDot color={subject.color} />
          <span className="truncate">{subject.name}</span>
        </Link>
        {subject.description && (
          <p className="mt-0.5 truncate pl-5 text-[12.5px] text-fg-3">{subject.description}</p>
        )}
        <p className="mt-0.5 flex gap-3 pl-5 text-[12.5px] text-fg-3 tabular-nums md:hidden">
          {subject.sessions === 0 ? (
            <span>Sem sessões ainda</span>
          ) : (
            <>
              <span>{formatDuration(subject.seconds)}</span>
              <span>{plural(subject.sessions, "sessão", "sessões")}</span>
            </>
          )}
        </p>
      </div>
      <span className="hidden text-right text-[13.5px] text-fg tabular-nums md:block">
        {subject.seconds ? formatDuration(subject.seconds) : <span className="text-fg-3">—</span>}
      </span>
      <span className="hidden text-right text-[13.5px] text-fg-2 tabular-nums md:block">
        {subject.sessions || <span className="text-fg-3">—</span>}
      </span>
      <span className="hidden text-right text-[13px] text-fg-2 md:block">
        {subject.lastDate ? relativeDay(subject.lastDate, todayISO) : <span className="text-fg-3">—</span>}
      </span>
      <div className="relative z-[1] flex items-center justify-end gap-1">
        <SubjectActions
          subject={{
            id: subject.id,
            name: subject.name,
            color: subject.color,
            description: subject.description,
            archived: subject.archived,
          }}
        />
        <ChevronRight className="size-4 text-fg-3 md:hidden" aria-hidden />
      </div>
    </div>
  );
}

function ArchivedList({ subjects, todayISO }: { subjects: SubjectItem[]; todayISO: string }) {
  return (
    <details className="group/archived mt-10">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md text-[13px] font-medium text-fg-2 select-none hover:text-fg [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 transition-transform group-open/archived:rotate-90" />
        Arquivadas ({subjects.length})
      </summary>
      <p className="mt-1.5 text-[12.5px] text-fg-3">
        Não aparecem ao registrar sessões, mas o histórico continua contando.
      </p>
      <div className="mt-3 opacity-80">
        <ColumnHeads withHandle={false} />
        <ul className="divide-y divide-border border-b border-border">
          {subjects.map((s) => (
            <li key={s.id} className="relative">
              <Row subject={s} todayISO={todayISO} />
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
