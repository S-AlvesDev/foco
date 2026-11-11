"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  ChevronLeft,
  FileText,
  ListTree,
  MessageSquarePlus,
  NotebookPen,
  Pencil,
  Play,
  Star,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { enqueueLibrary, isOffline, type LibraryPayload } from "@/features/pwa/outbox";
import { useStudy } from "@/features/timer/study-provider";
import {
  layoutBlock,
  MARK_COLOR_LABELS,
  MARK_COLORS,
  rangeMatches,
  topicLabel,
  type Layout,
  type MarkColor,
  type Range,
  type ReadStatus,
} from "../model";
import type { Mark, ReaderBlock, TopicPage } from "../queries";
import {
  createMarkAction,
  deleteMarkAction,
  toggleTopicFavoriteAction,
  touchProgressAction,
  updateMarkAction,
  type CreateMarkInput,
} from "../actions";
import { BlockBody } from "./blocks";
import { selectionAnchors, selectionRect, type Anchor } from "./selection";
import { StatusDot, Toc, topicHref } from "./toc";

type Laid = { block: ReaderBlock; layout: Layout; anchor: string };

const SOURCES_KEY = "alpha:lib:sources";
/** Preferência "mostrar fontes" deste aparelho. */
function readSources() {
  try {
    return localStorage.getItem(SOURCES_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribeSources(fn: () => void) {
  window.addEventListener(SOURCES_KEY, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(SOURCES_KEY, fn);
    window.removeEventListener("storage", fn);
  };
}

/* ------------------------------------------------------------------ */
/* Envio com fila offline                                              */
/* ------------------------------------------------------------------ */

async function run<T extends { ok: boolean }>(
  call: () => Promise<T>,
  offline: LibraryPayload,
): Promise<T | "queued"> {
  const queue = () => (enqueueLibrary(offline) ? ("queued" as const) : Promise.reject(new Error("offline")));
  if (isOffline()) return queue();
  try {
    return await call();
  } catch {
    return queue();
  }
}

export function Reader({ page, memory }: { page: TopicPage; memory?: React.ReactNode }) {
  const { discipline, topic, chapter, index } = page;
  const total = discipline.topics.length;
  const prev = index > 0 ? discipline.topics[index - 1] : null;
  const next = index < total - 1 ? discipline.topics[index + 1] : null;

  const laid = useMemo<Laid[]>(
    () =>
      page.blocks.map((block) => {
        const { layout, anchor } = layoutBlock(block);
        return { block, layout, anchor };
      }),
    [page.blocks],
  );
  const texts = useMemo(() => new Map(laid.map((l) => [l.block.id, l.anchor])), [laid]);

  const [marks, setMarks] = useState<Mark[]>(page.marks);
  const [status, setStatus] = useState<ReadStatus>(page.progress?.status ?? "not_started");
  const [favorite, setFavorite] = useState(topic.favorite);
  const showSources = useSyncExternalStore(subscribeSources, readSources, () => false);
  const [tocOpen, setTocOpen] = useState(false);
  const [pending, setPending] = useState<{ anchors: Anchor[]; rect: DOMRect | null } | null>(null);
  const [active, setActive] = useState<{ ids: string[]; rect: DOMRect } | null>(null);
  const [noteEdit, setNoteEdit] = useState<{ anchor?: Anchor; mark?: Mark } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const toolbarHot = useRef(0);
  const [, startTransition] = useTransition();

  /* --------------------------- marcações ---------------------------- */

  const { ranges, review } = useMemo(() => {
    const ranges = new Map<string, Range[]>();
    const review: Mark[] = [];
    for (const m of marks) {
      if (!m.blockId || m.start === null || m.end === null || !m.quote) continue;
      const text = texts.get(m.blockId);
      if (
        m.status === "review" ||
        text === undefined ||
        !rangeMatches(text, { start: m.start, end: m.end, quote: m.quote })
      ) {
        review.push(m);
        continue;
      }
      const list = ranges.get(m.blockId) ?? [];
      list.push({
        id: m.id,
        start: m.start,
        end: m.end,
        color: m.kind === "highlight" ? (m.color ?? undefined) : undefined,
        note: m.kind === "note" || (m.kind === "highlight" && Boolean(m.body)) || undefined,
        favorite: m.kind === "favorite" || undefined,
      });
      ranges.set(m.blockId, list);
    }
    return { ranges, review };
  }, [marks, texts]);

  const notes = marks.filter((m) => m.kind === "note" || (m.kind === "highlight" && m.body));
  const favExcerpts = marks.filter((m) => m.kind === "favorite" && m.blockId);

  const create = (input: CreateMarkInput) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const a = "anchor" in input ? input.anchor : undefined;
    const optimistic: Mark = {
      id,
      kind: input.kind,
      topicId: topic.id,
      blockId: a?.blockId ?? null,
      start: a?.start ?? null,
      end: a?.end ?? null,
      quote: a?.quote ?? null,
      color: input.kind === "highlight" ? input.color : null,
      body: input.kind === "favorite" ? null : (input.body ?? null),
      status: "ok",
      createdAt: now,
      updatedAt: now,
    };
    setMarks((list) => [...list, optimistic]);
    const payload = { ...input, id } as CreateMarkInput;
    startTransition(async () => {
      const res = await run(() => createMarkAction(payload), {
        op: "create",
        input: payload as Record<string, unknown>,
      }).catch(() => null);
      if (res === "queued") return void toast("Sem internet: guardado no aparelho, envia sozinho depois.");
      if (!res || !res.ok) {
        setMarks((list) => list.filter((m) => m.id !== id));
        toast.error(res ? res.message : "Não foi possível salvar.");
        return;
      }
      setMarks((list) => list.map((m) => (m.id === id ? res.mark : m)));
    });
  };

  const update = (id: string, patch: { color?: MarkColor; body?: string | null }) => {
    const before = marks.find((m) => m.id === id);
    setMarks((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    startTransition(async () => {
      const res = await run(() => updateMarkAction({ id, ...patch }), {
        op: "update",
        input: { id, ...patch },
      }).catch(() => null);
      if (res === "queued") return;
      if (!res || !res.ok) {
        if (before) setMarks((list) => list.map((m) => (m.id === id ? before : m)));
        toast.error(res ? res.message : "Não foi possível salvar.");
      }
    });
  };

  const remove = (id: string) => {
    const before = marks.find((m) => m.id === id);
    setMarks((list) => list.filter((m) => m.id !== id));
    startTransition(async () => {
      const res = await run(() => deleteMarkAction(id), { op: "delete", id }).catch(() => null);
      if (res === "queued") return;
      if (!res || !res.ok) {
        if (before) setMarks((list) => [...list, before]);
        toast.error(res ? res.message : "Não foi possível excluir.");
      }
    });
  };

  /* --------------------------- seleção ------------------------------ */

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const root = contentRef.current;
        if (!root) return;
        const sel = window.getSelection();
        const anchors = selectionAnchors(root, sel, texts);
        if (anchors.length) {
          setPending({ anchors, rect: selectionRect(sel) });
          setActive(null);
        } else if (Date.now() - toolbarHot.current > 600) {
          setPending(null);
        }
      }, 140);
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", onChange);
    };
  }, [texts]);

  // a barra acompanha o trecho ao rolar a página
  const hasPending = pending !== null;
  useEffect(() => {
    if (!hasPending) return;
    const onScroll = () =>
      setPending((p) => (p ? { ...p, rect: selectionRect(window.getSelection()) ?? p.rect } : p));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasPending]);

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setPending(null);
  };

  const applyColor = (color: MarkColor) => {
    if (!pending) return;
    for (const a of pending.anchors) create({ kind: "highlight", topicId: topic.id, anchor: a, color });
    clearSelection();
  };

  const onContentClick = (e: React.MouseEvent) => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const el = (e.target as Element).closest<HTMLElement>("mark[data-mark-ids]");
    if (!el) return setActive(null);
    const ids = el.dataset.markIds!.split(" ").filter(Boolean);
    setActive({ ids, rect: el.getBoundingClientRect() });
    setPending(null);
  };

  /* --------------------------- progresso ---------------------------- */

  const seen = useRef(-1);
  const lastBlock = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedPct = useRef(page.progress?.percent ?? 0);

  const saveProgress = useCallback(
    (now = false) => {
      clearTimeout(saveTimer.current);
      const send = () => {
        const percent = laid.length ? Math.round(((seen.current + 1) / laid.length) * 100) : 100;
        if (percent <= savedPct.current && !lastBlock.current) return;
        const blockId = lastBlock.current;
        lastBlock.current = null;
        savedPct.current = Math.max(savedPct.current, percent);
        void run(() => touchProgressAction(topic.id, { percent, blockId }), {
          op: "progress",
          topicId: topic.id,
          percent,
          blockId,
        })
          .then((r) => {
            if (r !== "queued" && r.ok)
              setStatus((s) => (s === "not_started" && percent > 0 ? "in_progress" : s));
          })
          .catch(() => {});
      };
      if (now) send();
      else saveTimer.current = setTimeout(send, 2500);
    },
    [laid.length, topic.id],
  );

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    // abrir o tópico já conta como leitura (e marca "em andamento")
    void run(() => touchProgressAction(topic.id, { percent: laid.length ? 0 : 100 }), {
      op: "progress",
      topicId: topic.id,
      percent: laid.length ? 0 : 100,
    })
      .then((r) => r !== "queued" && r.ok && setStatus(r.status))
      .catch(() => {});
    const els = [...root.querySelectorAll<HTMLElement>("[data-block]")];
    const io = new IntersectionObserver(
      (entries) => {
        let changed = false;
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const i = els.indexOf(en.target as HTMLElement);
          if (i > seen.current) {
            seen.current = i;
            changed = true;
          }
        }
        const top = els.find((el) => el.getBoundingClientRect().bottom > 120);
        if (top) lastBlock.current = top.dataset.block ?? null;
        if (changed || lastBlock.current) saveProgress();
      },
      { rootMargin: "0px 0px -30% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    const onHide = () => document.visibilityState === "hidden" && saveProgress(true);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onHide);
      saveProgress(true);
    };
  }, [topic.id, laid.length, saveProgress]);

  const changeStatus = (s: ReadStatus) => {
    const before = status;
    setStatus(s);
    void run(() => touchProgressAction(topic.id, { status: s }), {
      op: "progress",
      topicId: topic.id,
      status: s,
    })
      .then((r) => {
        if (r === "queued") return;
        if (!r.ok) {
          setStatus(before);
          toast.error(r.message);
        } else if (s === "done" && before !== "done") {
          toast.success("Leitura concluída. A primeira revisão fica para amanhã, em Revisões de hoje.");
        }
      })
      .catch(() => setStatus(before));
  };

  const toggleFavorite = () => {
    const on = !favorite;
    setFavorite(on);
    startTransition(async () => {
      try {
        const r = await toggleTopicFavoriteAction(topic.id, on);
        if (!r.ok) {
          setFavorite(!on);
          toast.error(r.message);
        }
      } catch {
        setFavorite(!on);
        toast.error("Sem conexão. Tente de novo quando a internet voltar.");
      }
    });
  };

  const { openStart, timer } = useStudy();
  const studyThis = () => {
    if (timer) return toast("Já existe um cronômetro rodando. Finalize-o para começar outro.");
    openStart(undefined, { subjectName: discipline.name, topic: topicLabel(topic), studyType: "reading" });
  };

  const toggleSources = () => {
    try {
      localStorage.setItem(SOURCES_KEY, showSources ? "0" : "1");
    } catch {}
    window.dispatchEvent(new Event(SOURCES_KEY));
  };

  /* --------------------------- tela --------------------------------- */

  const activeMarks = active ? marks.filter((m) => active.ids.includes(m.id)) : [];

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pt-4 pb-16 sm:px-8 sm:pt-6 lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-12">
      {/* Sumário (desktop) */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 max-h-[calc(100dvh-48px)] overflow-y-auto pr-1 pb-6">
          <Link
            href={`/biblioteca/${encodeURIComponent(discipline.id)}`}
            className="mb-4 flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-fg-3 transition-colors hover:text-fg"
          >
            <ChevronLeft className="size-4" />
            {discipline.name}
          </Link>
          <Toc disciplineId={discipline.id} chapters={discipline.chapters} currentId={topic.id} dense />
        </div>
      </aside>

      <article className="mx-auto w-full max-w-[700px] min-w-0">
        {/* Barra do leitor */}
        <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-20 -mx-4 mb-8 flex items-center gap-1 border-b border-border/70 bg-bg/85 px-2 py-1.5 backdrop-blur-xl sm:-mx-8 sm:px-6 md:top-0 lg:mx-0 lg:px-0">
          <span aria-hidden className="read-progress" />
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setTocOpen(true)}
            aria-label="Abrir sumário"
          >
            <ListTree />
            <span className="hidden sm:inline">Sumário</span>
          </Button>
          <Link
            href={`/biblioteca/${encodeURIComponent(discipline.id)}`}
            className="hidden items-center gap-1 rounded-md px-2 text-[13px] text-fg-3 hover:text-fg sm:flex lg:hidden"
          >
            <ChevronLeft className="size-4" />
            {discipline.name}
          </Link>
          <span className="ml-1 min-w-0 flex-1 truncate text-[12.5px] text-fg-3 tabular-nums">
            Tópico {index + 1} de {total}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSources}
            aria-pressed={showSources}
            title="Mostrar as páginas dos PDFs de origem"
          >
            <FileText />
            <span className="hidden sm:inline">Fontes</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? "Tirar dos favoritos" : "Favoritar tópico"}
          >
            <Star className={cn(favorite && "fill-gold text-gold")} />
          </Button>
          <Button variant="ghost" size="sm" onClick={studyThis} title="Iniciar o cronômetro com este assunto">
            <Play />
            <span className="hidden sm:inline">Estudar</span>
          </Button>
        </div>

        <header className="mb-10">
          <p className="text-[13px] text-fg-3">
            {chapter.number && (
              <span className="num mr-2 font-semibold text-accent">Capítulo {chapter.number}</span>
            )}
            {chapter.title}
          </p>
          {topic.number && (
            <p aria-hidden className="outline-num mt-6 text-[64px] select-none sm:text-[84px]">
              {topic.number}
            </p>
          )}
          <h1 className="font-display mt-4 text-[32px] leading-[1.08] font-semibold tracking-[-0.015em] text-balance text-fg sm:text-[44px]">
            {topic.number && <span className="sr-only">{topic.number} </span>}
            {topic.title}
          </h1>
          <span
            aria-hidden
            className="mt-6 block h-[3px] w-16 rounded-full bg-[linear-gradient(90deg,var(--accent),var(--gold))]"
          />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Segmented
              label="Situação da leitura"
              value={status}
              onChange={changeStatus}
              options={[
                { value: "not_started", label: "Não iniciado" },
                { value: "in_progress", label: "Em andamento" },
                { value: "done", label: "Concluído" },
              ]}
            />
            {memory}
          </div>
        </header>

        {review.length > 0 && (
          <div className="mb-6 rounded-xl border border-warning/40 bg-warning/[0.07] px-4 py-3 text-[13.5px]">
            <p className="flex items-center gap-2 font-semibold text-warning">
              <TriangleAlert className="size-4" />
              {review.length === 1 ? "1 marcação para revisar" : `${review.length} marcações para revisar`}
            </p>
            <p className="mt-1 text-fg-2">
              O material foi atualizado e o trecho não foi encontrado com segurança. Ele não aparece no texto
              para não cair no lugar errado.
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {review.map((m) => (
                <li key={m.id} className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 text-fg">
                    “{m.quote}”{m.body ? ` — ${m.body}` : ""}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(m.id)}
                    aria-label="Excluir marcação"
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {laid.length === 0 && (
          <p className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-[14px] text-fg-3">
            Este tópico não tem texto próprio: o conteúdo está nos subtópicos.
          </p>
        )}

        <div ref={contentRef} className="apostila flex flex-col gap-4" onClick={onContentClick}>
          {laid.map((l) => (
            <div key={l.block.id} id={l.block.id} data-block={l.block.id} className="relative">
              <BlockBody
                layout={l.layout}
                ranges={ranges.get(l.block.id) ?? []}
                image={
                  l.block.kind === "imagem" && l.block.data.arquivo
                    ? page.images[l.block.data.arquivo]
                    : undefined
                }
              />
              {showSources && l.block.sources.length > 0 && (
                <p
                  data-no-anchor=""
                  className="mt-1 flex flex-wrap gap-1.5 text-[11.5px] leading-snug text-fg-3 select-none"
                >
                  {l.block.sources.map((s, i) => (
                    <span key={i} className="rounded-md border border-border bg-surface-2/60 px-1.5 py-0.5">
                      {page.sources[s.fonte]?.title ?? page.sources[s.fonte]?.file ?? s.fonte}
                      {s.pagina !== undefined ? `, p. ${s.pagina}` : ""}
                      {s.secao ? ` · ${s.secao}` : ""}
                    </span>
                  ))}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Anotações do tópico */}
        <TopicNotes
          notes={notes}
          favorites={favExcerpts}
          onAdd={(body) => create({ kind: "note", topicId: topic.id, body })}
          onEdit={(m) => setNoteEdit({ mark: m })}
          onRemove={remove}
          onClearBody={(id) => update(id, { body: null })}
          onUnfavorite={remove}
        />

        {/* Fim do tópico */}
        <div className="mt-14">
          {status !== "done" ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface-1 p-5 shadow-card sm:p-6">
              <div>
                <p className="font-display text-[18px] font-semibold text-fg">Terminou de ler este tópico?</p>
                <p className="mt-0.5 text-[13px] text-fg-3">
                  Ao concluir, ele entra nas suas revisões, com a primeira amanhã.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="h-11 rounded-xl px-5 max-sm:w-full"
                onClick={() => changeStatus("done")}
              >
                <BookOpenCheck />
                Concluir leitura
              </Button>
            </div>
          ) : (
            <p className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/[0.06] p-5 text-[13.5px] leading-relaxed text-fg-2">
              <span className="mt-0.5 flex">
                <StatusDot status="done" percent={100} />
              </span>
              <span>
                <strong className="font-display block text-[16px] font-semibold text-fg">
                  Leitura concluída
                </strong>
                Isso registra que você terminou o material, não que dominou o assunto: o tópico entra nas suas
                revisões, com a primeira amanhã.
              </span>
            </p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link
                href={topicHref(discipline.id, prev.id)}
                className="group flex items-center gap-3 rounded-2xl border border-border px-4 py-4 transition-colors hover:border-border-strong hover:bg-surface-1"
              >
                <ArrowLeft className="size-4 shrink-0 text-fg-3 transition-transform group-hover:-translate-x-0.5" />
                <span className="min-w-0">
                  <span className="block text-[12px] text-fg-3">Anterior</span>
                  <span className="block truncate text-[14px] text-fg-2 group-hover:text-fg">
                    {topicLabel(prev)}
                  </span>
                </span>
              </Link>
            ) : (
              <span className="max-sm:hidden" />
            )}
            {next && (
              <Link
                href={topicHref(discipline.id, next.id)}
                className="mission-frame group flex items-center justify-end gap-3 rounded-2xl px-4 py-4 text-right"
              >
                <span className="min-w-0">
                  <span className="block text-[12px] text-fg-3">Próximo tópico</span>
                  <span className="font-display block truncate text-[16px] font-semibold text-fg">
                    {topicLabel(next)}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>
      </article>

      {/* Sumário (celular/tablet) */}
      <Dialog open={tocOpen} onOpenChange={setTocOpen}>
        <DialogContent title={discipline.name} description="Sumário">
          <DialogBody>
            <Toc
              disciplineId={discipline.id}
              chapters={discipline.chapters}
              currentId={topic.id}
              onNavigate={() => setTocOpen(false)}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Barra de ações da seleção */}
      {pending && (
        <SelectionBar
          rect={pending.rect}
          onPointerDown={() => (toolbarHot.current = Date.now())}
          onColor={applyColor}
          onNote={() => {
            const a = pending.anchors[0];
            clearSelection();
            setNoteEdit({ anchor: a });
          }}
          onFavorite={() => {
            for (const a of pending.anchors) create({ kind: "favorite", topicId: topic.id, anchor: a });
            clearSelection();
            toast.success("Trecho favoritado");
          }}
          onClose={clearSelection}
        />
      )}

      {/* Ações de uma marcação existente */}
      {active && activeMarks.length > 0 && (
        <MarkPopover
          rect={active.rect}
          marks={activeMarks}
          onColor={(m, c) => update(m.id, { color: c })}
          onNote={(m) => {
            setActive(null);
            if (m.kind === "highlight" || m.kind === "note") setNoteEdit({ mark: m });
          }}
          onRemove={(m) => {
            remove(m.id);
            setActive(null);
          }}
          onClose={() => setActive(null)}
        />
      )}

      <NoteDialog
        state={noteEdit}
        onClose={() => setNoteEdit(null)}
        onSave={(body) => {
          if (!noteEdit) return;
          if (noteEdit.mark) {
            const m = noteEdit.mark;
            if (m.kind === "note" && !body.trim()) remove(m.id);
            else update(m.id, { body: body.trim() || null });
          } else if (noteEdit.anchor) {
            create({ kind: "note", topicId: topic.id, anchor: noteEdit.anchor, body });
          }
          setNoteEdit(null);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barra de seleção e popover                                          */
/* ------------------------------------------------------------------ */

function floatStyle(rect: DOMRect | null): React.CSSProperties | undefined {
  if (!rect || typeof window === "undefined") return undefined;
  if (window.matchMedia("(pointer: coarse)").matches) return undefined; // celular: barra fixa embaixo
  const w = 300;
  const left = Math.min(window.innerWidth - w - 12, Math.max(12, rect.left + rect.width / 2 - w / 2));
  const raw = rect.top > 90 ? rect.top - 52 : rect.bottom + 10;
  const top = Math.min(window.innerHeight - 64, Math.max(8, raw));
  return { position: "fixed", top, left, width: w };
}

const floatingClass =
  "z-[60] flex items-center gap-1 rounded-xl border border-border bg-surface-1/95 p-1.5 shadow-pop backdrop-blur-xl";
/** Celular: barra presa logo abaixo da barra do leitor (embaixo ficam o cronômetro e as abas). */
const dockedClass =
  "fixed inset-x-3 top-[calc(56px+env(safe-area-inset-top)+52px)] mx-auto max-w-[420px] md:top-auto md:bottom-6";

function SelectionBar({
  rect,
  onPointerDown,
  onColor,
  onNote,
  onFavorite,
  onClose,
}: {
  rect: DOMRect | null;
  onPointerDown: () => void;
  onColor: (c: MarkColor) => void;
  onNote: () => void;
  onFavorite: () => void;
  onClose: () => void;
}) {
  const style = floatStyle(rect);
  return createPortal(
    <div
      role="toolbar"
      aria-label="Marcar trecho"
      className={cn(floatingClass, !style && dockedClass, "justify-between")}
      style={style}
      onPointerDown={(e) => {
        onPointerDown();
        e.preventDefault();
      }}
    >
      <div className="flex items-center gap-1">
        {MARK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColor(c)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg hover:bg-surface-2"
            aria-label={`Marcar em ${MARK_COLOR_LABELS[c].toLowerCase()}`}
            title={MARK_COLOR_LABELS[c]}
          >
            <span className="hl-swatch size-[18px] rounded-full ring-2 ring-black/10" data-color={c} />
          </button>
        ))}
      </div>
      <span className="mx-0.5 h-5 w-px bg-border" />
      <button
        type="button"
        onClick={onNote}
        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[13px] text-fg-2 hover:bg-surface-2 hover:text-fg"
        aria-label="Anotar este trecho"
      >
        <MessageSquarePlus className="size-4" />
        <span className="hidden sm:inline">Anotar</span>
      </button>
      <button
        type="button"
        onClick={onFavorite}
        className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-fg-2 hover:bg-surface-2 hover:text-fg"
        aria-label="Favoritar trecho"
      >
        <Star className="size-4" />
      </button>
      <button
        type="button"
        onClick={onClose}
        className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-fg-3 hover:bg-surface-2 hover:text-fg"
        aria-label="Fechar"
      >
        <X className="size-4" />
      </button>
    </div>,
    document.body,
  );
}

function MarkPopover({
  rect,
  marks,
  onColor,
  onNote,
  onRemove,
  onClose,
}: {
  rect: DOMRect;
  marks: Mark[];
  onColor: (m: Mark, c: MarkColor) => void;
  onNote: (m: Mark) => void;
  onRemove: (m: Mark) => void;
  onClose: () => void;
}) {
  const style = floatStyle(rect);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onScroll = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true, once: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [onClose]);
  return createPortal(
    <div
      role="dialog"
      aria-label="Marcação"
      className={cn(floatingClass, !style && dockedClass, "flex-col items-stretch gap-1")}
      style={style ? { ...style, width: 320 } : undefined}
    >
      {marks.map((m) => (
        <div key={m.id} className="flex flex-col gap-1 rounded-lg px-1 py-1">
          {m.kind === "highlight" && (
            <div className="flex items-center gap-1">
              {MARK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onColor(m, c)}
                  className={cn(
                    "flex size-8 cursor-pointer items-center justify-center rounded-lg hover:bg-surface-2",
                    m.color === c && "bg-surface-2",
                  )}
                  aria-label={`Trocar para ${MARK_COLOR_LABELS[c].toLowerCase()}`}
                  aria-pressed={m.color === c}
                >
                  <span className="hl-swatch size-[18px] rounded-full ring-2 ring-black/10" data-color={c} />
                </button>
              ))}
              <span className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNote(m)}
                aria-label={m.body ? "Editar anotação" : "Anotar"}
              >
                {m.body ? <Pencil /> : <MessageSquarePlus />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onRemove(m)} aria-label="Remover marcação">
                <Trash2 />
              </Button>
            </div>
          )}
          {(m.kind === "note" || (m.kind === "highlight" && m.body)) && (
            <div className="flex items-start gap-1">
              <p className="min-w-0 flex-1 px-1 py-1 text-[13px] leading-relaxed whitespace-pre-wrap text-fg">
                {m.body}
              </p>
              {m.kind === "note" && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => onNote(m)} aria-label="Editar anotação">
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onRemove(m)} aria-label="Excluir anotação">
                    <Trash2 />
                  </Button>
                </>
              )}
            </div>
          )}
          {m.kind === "favorite" && (
            <div className="flex items-center gap-2 px-1">
              <Star className="size-4 fill-gold text-gold" />
              <span className="flex-1 text-[13px] text-fg-2">Trecho favorito</span>
              <Button variant="ghost" size="sm" onClick={() => onRemove(m)}>
                Remover
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Anotações                                                           */
/* ------------------------------------------------------------------ */

function NoteDialog({
  state,
  onClose,
  onSave,
}: {
  state: { anchor?: Anchor; mark?: Mark } | null;
  onClose: () => void;
  onSave: (body: string) => void;
}) {
  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={state?.mark ? "Editar anotação" : "Nova anotação"}>
        {state && <NoteForm key={state.mark?.id ?? state.anchor?.quote} state={state} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function NoteForm({
  state,
  onSave,
}: {
  state: { anchor?: Anchor; mark?: Mark };
  onSave: (body: string) => void;
}) {
  const [body, setBody] = useState(state.mark?.body ?? "");
  const quote = state.anchor?.quote ?? state.mark?.quote ?? null;
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!state.mark && !body.trim()) return;
        onSave(body);
      }}
    >
      <DialogBody className="flex flex-col gap-3">
        {quote && (
          <blockquote className="rounded-r-lg border-l-2 border-accent/60 bg-surface-2/60 py-2 pr-3 pl-3 text-[13.5px] leading-relaxed text-fg-2">
            {quote.length > 400 ? quote.slice(0, 400) + "…" : quote}
          </blockquote>
        )}
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={20000}
          placeholder="Sua anotação (só você vê)"
          aria-label="Anotação"
          autoFocus
        />
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" variant="primary" disabled={!state.mark && !body.trim()}>
          Salvar anotação
        </Button>
      </DialogFooter>
    </form>
  );
}

function TopicNotes({
  notes,
  favorites,
  onAdd,
  onEdit,
  onRemove,
  onClearBody,
  onUnfavorite,
}: {
  notes: Mark[];
  favorites: Mark[];
  onAdd: (body: string) => void;
  onEdit: (m: Mark) => void;
  onRemove: (id: string) => void;
  onClearBody: (id: string) => void;
  onUnfavorite: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const jump = (m: Mark) => {
    if (!m.blockId) return;
    const el = document.getElementById(m.blockId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.setAttribute("data-flash", "");
    setTimeout(() => el.removeAttribute("data-flash"), 2300);
  };
  return (
    <section aria-labelledby="topic-notes" className="mt-14 border-t border-border pt-9">
      <h2 id="topic-notes" className="flex items-center gap-2 text-[19px] font-semibold text-fg">
        <NotebookPen className="size-[18px] text-fg-3" />
        Suas anotações neste tópico
      </h2>
      <p className="mt-1 text-[13px] text-fg-3">
        Ficam separadas do material e só você vê. Selecione um trecho para anotar sobre ele.
      </p>
      <form
        className="mt-4 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onAdd(draft.trim());
          setDraft("");
          toast.success("Anotação salva");
        }}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={20000}
          placeholder="Anotação geral sobre o tópico"
          aria-label="Nova anotação do tópico"
        />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" disabled={!draft.trim()}>
            Salvar anotação
          </Button>
        </div>
      </form>
      {notes.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {notes.map((m) => (
            <li key={m.id} className="rounded-xl border border-border bg-surface-1 px-4 py-3">
              {m.quote && (
                <button
                  type="button"
                  onClick={() => jump(m)}
                  className="mb-2 block w-full cursor-pointer border-l-2 border-accent/60 pl-3 text-left text-[13px] leading-relaxed text-fg-3 hover:text-fg-2"
                >
                  “{m.quote.length > 220 ? m.quote.slice(0, 220) + "…" : m.quote}”
                </button>
              )}
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-fg">{m.body}</p>
              <div className="mt-2 flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(m)}>
                  <Pencil />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (m.kind === "note" ? onRemove(m.id) : onClearBody(m.id))}
                  aria-label="Excluir anotação"
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {favorites.length > 0 && (
        <div className="mt-6">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-fg">
            <Star className="size-4 fill-gold text-gold" />
            Trechos favoritos
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {favorites.map((m) => (
              <li
                key={m.id}
                className="flex items-start gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => jump(m)}
                  className="min-w-0 flex-1 cursor-pointer text-left text-[13.5px] leading-relaxed text-fg-2 hover:text-fg"
                >
                  “{m.quote}”
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUnfavorite(m.id)}
                  aria-label="Remover dos favoritos"
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
