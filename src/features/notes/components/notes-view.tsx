"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, Search, Settings2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createNoteAction } from "../actions";
import type { Label, NoteListItem } from "../queries";
import { LabelsDialog } from "./labels-dialog";
import { selectChevron as chevron, selectClass } from "@/components/ui/select";

type SubjectInfo = { id: string; name: string; color: string; archived: boolean };
type Group = "nenhum" | "materia" | "assunto";

export type NoteFiltersState = {
  q: string;
  subjectId?: string;
  categoryId?: string;
  tagId?: string;
  favorites: boolean;
  group: Group;
};

export function NotesView({
  notes,
  labels,
  subjects,
  filters,
  todayISO,
  totalCount,
}: {
  notes: NoteListItem[];
  labels: Label[];
  subjects: SubjectInfo[];
  filters: NoteFiltersState;
  todayISO: string;
  totalCount: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [creating, startCreate] = useTransition();
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [q, setQ] = useState(filters.q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categories = labels.filter((l) => l.kind === "category");
  const tags = labels.filter((l) => l.kind === "tag");
  const byLabel = new Map(labels.map((l) => [l.id, l]));
  const bySubject = new Map(subjects.map((s) => [s.id, s]));

  // Última URL pedida: mudanças rápidas seguidas partem dela, não da URL ainda não aplicada.
  const paramsStr = params.toString();
  const latest = useRef(paramsStr);
  useEffect(() => {
    if (!pending) latest.current = paramsStr;
  }, [paramsStr, pending]);

  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(latest.current);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    latest.current = next.toString();
    startTransition(() => router.replace(`/anotacoes${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  useEffect(() => () => void (debounce.current && clearTimeout(debounce.current)), []);

  const newNote = () =>
    startCreate(async () => {
      const res = await createNoteAction({ subjectId: filters.subjectId, categoryId: filters.categoryId });
      if (!res.ok) return void toast.error(res.message);
      router.push(`/anotacoes/${res.id}`);
    });

  // "N" cria uma anotação.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable], [role=dialog]"))
        return;
      e.preventDefault();
      newNote();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const filtered = Boolean(
    filters.q || filters.subjectId || filters.categoryId || filters.tagId || filters.favorites,
  );

  const groups: { key: string; title: React.ReactNode; items: NoteListItem[] }[] = [];
  if (filters.group === "nenhum") groups.push({ key: "all", title: null, items: notes });
  else {
    const map = new Map<string, NoteListItem[]>();
    for (const n of notes) {
      const k = filters.group === "materia" ? (n.subject_id ?? "") : (n.topic?.trim().toLowerCase() ?? "");
      map.set(k, [...(map.get(k) ?? []), n]);
    }
    for (const [k, items] of map) {
      const s = bySubject.get(k);
      groups.push({
        key: k || "—",
        title:
          filters.group === "materia" ? (
            s ? (
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.name}
              </span>
            ) : (
              "Sem matéria"
            )
          ) : (
            items[0].topic?.trim() || "Sem assunto"
          ),
        items,
      });
    }
    groups.sort((a, b) => (a.key === "—" ? 1 : b.key === "—" ? -1 : 0));
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
            Anotações
          </h1>
          <p className="mt-1 text-[14px] text-fg-2 tabular-nums">
            {totalCount === 0
              ? "Resumos, dúvidas e pontos importantes, organizados por matéria."
              : filtered
                ? `${notes.length} de ${totalCount} anotações`
                : `${totalCount} anotaç${totalCount === 1 ? "ão" : "ões"}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setLabelsOpen(true)}>
            <Settings2 />
            <span className="hidden sm:inline">Categorias e etiquetas</span>
            <span className="sm:hidden">Etiquetas</span>
          </Button>
          <Button variant="primary" onClick={newNote} loading={creating}>
            {!creating && <Plus />}
            Nova anotação
          </Button>
        </div>
      </div>

      <div className={cn("flex flex-col gap-3 transition-opacity", pending && "opacity-60")}>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (debounce.current) clearTimeout(debounce.current);
              const v = e.target.value;
              debounce.current = setTimeout(() => set({ q: v.trim() || undefined }), 300);
            }}
            placeholder="Buscar em títulos, assuntos e textos…"
            aria-label="Buscar anotações"
            className="h-10 w-full rounded-lg border border-border bg-surface-1 pr-3 pl-9 text-[14px] text-fg placeholder:text-fg-3 hover:border-border-strong focus:border-accent focus:outline-none"
          />
        </div>

        <div
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
          role="radiogroup"
          aria-label="Categoria"
        >
          {[{ id: undefined, name: "Todas", color: "" }, ...categories].map((c) => {
            const on = filters.categoryId === c.id;
            return (
              <button
                key={c.id ?? "all"}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set({ categoria: c.id })}
                className={cn(
                  "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors",
                  on
                    ? "border-accent bg-accent-subtle text-fg"
                    : "border-border bg-surface-2 text-fg-2 hover:border-border-strong hover:text-fg",
                )}
              >
                {c.color && (
                  <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden />
                )}
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Matéria"
            value={filters.subjectId ?? ""}
            onChange={(e) => set({ materia: e.target.value || undefined })}
            className={selectClass}
            style={{ backgroundImage: chevron }}
          >
            <option value="">Todas as matérias</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.archived ? " (arquivada)" : ""}
              </option>
            ))}
          </select>
          {tags.length > 0 && (
            <select
              aria-label="Etiqueta"
              value={filters.tagId ?? ""}
              onChange={(e) => set({ etiqueta: e.target.value || undefined })}
              className={selectClass}
              style={{ backgroundImage: chevron }}
            >
              <option value="">Todas as etiquetas</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            aria-pressed={filters.favorites}
            onClick={() => set({ favoritas: filters.favorites ? undefined : "1" })}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors",
              filters.favorites
                ? "border-accent bg-accent-subtle text-fg"
                : "border-border bg-surface-2 text-fg-2 hover:border-border-strong hover:text-fg",
            )}
          >
            <Star
              className={cn("size-3.5", filters.favorites && "text-warning")}
              fill={filters.favorites ? "currentColor" : "none"}
            />
            Favoritas
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12.5px] text-fg-3">Agrupar</span>
            <Segmented<Group>
              label="Agrupar por"
              value={filters.group}
              onChange={(g) => set({ agrupar: g === "nenhum" ? undefined : g })}
              options={[
                { value: "nenhum", label: "Não" },
                { value: "materia", label: "Matéria" },
                { value: "assunto", label: "Assunto" },
              ]}
            />
          </div>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border-strong px-6 py-12 text-center">
          <p className="text-[14px] font-medium text-fg">
            {filtered ? "Nada encontrado com esses filtros" : "Nenhuma anotação ainda"}
          </p>
          <p className="mx-auto mt-1.5 max-w-[420px] text-[13.5px] leading-relaxed text-fg-2">
            {filtered
              ? "Tente outra busca ou limpe os filtros."
              : "Registre resumos, dúvidas, pontos importantes e dificuldades. Use categorias para encontrar depois."}
          </p>
          {filtered ? (
            <Button asChild variant="secondary" className="mt-5">
              <Link href="/anotacoes">Limpar filtros</Link>
            </Button>
          ) : (
            <Button variant="secondary" className="mt-5" onClick={newNote}>
              <Plus />
              Criar a primeira anotação
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.key} aria-label={typeof g.title === "string" ? g.title : undefined}>
              {g.title && (
                <h2 className="flex items-baseline justify-between border-b border-border pb-2 text-[13px] font-semibold text-fg">
                  {g.title}
                  <span className="text-[12.5px] font-normal text-fg-3 tabular-nums">{g.items.length}</span>
                </h2>
              )}
              <ul className={cn("divide-y divide-border", !g.title && "border-t border-border")}>
                {g.items.map((n) => {
                  const cat = n.category_id ? byLabel.get(n.category_id) : undefined;
                  const subj = n.subject_id ? bySubject.get(n.subject_id) : undefined;
                  return (
                    <li key={n.id}>
                      <Link
                        href={`/anotacoes/${n.id}`}
                        className="-mx-2 block rounded-md px-2 py-3.5 transition-colors hover:bg-surface-2/60"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span
                            className={cn(
                              "min-w-0 text-[14.5px] font-medium",
                              n.title ? "text-fg" : "text-fg-3",
                            )}
                          >
                            {n.is_favorite && (
                              <Star
                                className="mr-1.5 -mt-0.5 inline size-3.5 text-warning"
                                fill="currentColor"
                                aria-label="Favorita"
                              />
                            )}
                            {n.title || "Sem título"}
                          </span>
                          <span className="shrink-0 text-[12px] text-fg-3">
                            {relativeDay(n.updated_at.slice(0, 10), todayISO)}
                          </span>
                        </span>
                        {n.snippet && (
                          <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-fg-2">
                            {n.snippet}
                          </span>
                        )}
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-3">
                          {cat && (
                            <span className="inline-flex items-center gap-1.5 text-fg-2">
                              <span
                                className="size-2 rounded-full"
                                style={{ background: cat.color }}
                                aria-hidden
                              />
                              {cat.name}
                            </span>
                          )}
                          {subj && <span>{subj.name}</span>}
                          {n.topic && filters.group !== "assunto" && <span>{n.topic}</span>}
                          {n.tagIds
                            .map((id) => byLabel.get(id))
                            .filter(Boolean)
                            .map((t) => (
                              <span key={t!.id}>#{t!.name}</span>
                            ))}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <LabelsDialog open={labelsOpen} onOpenChange={setLabelsOpen} labels={labels} />
    </>
  );
}
