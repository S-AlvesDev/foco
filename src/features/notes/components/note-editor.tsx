"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import Highlight from "@tiptap/extension-highlight";
import { Command } from "cmdk";
import { Popover } from "radix-ui";
import {
  ArrowLeft,
  Bold,
  CalendarClock,
  Check,
  Code,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  MoreHorizontal,
  Plus,
  Quote,
  Redo2,
  Star,
  Strikethrough,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { useStudy } from "@/features/timer/study-provider";
import { Spinner } from "@/components/ui/spinner";
import { selectChevron as chevron, selectClass } from "@/components/ui/select";
import type { Json } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import type { StudySubject } from "@/features/timer/types";
import { SUBJECT_COLORS } from "@/features/subjects/colors";
import {
  createLabelAction,
  deleteNoteAction,
  discardIfEmptyAction,
  setNoteTagsAction,
  updateNoteAction,
  type NotePatch,
} from "../actions";
import type { Label, Note } from "../queries";

type Status = "saved" | "pending" | "saving" | "error";

/** Editores montados agora. Evita descartar uma anotação que foi só remontada (ex.: StrictMode). */
const mountedNotes = new Set<string>();

/** Salvamento automático: junta mudanças e envia depois de uma pausa na digitação. */
function useAutosave(id: string) {
  const [status, setStatus] = useState<Status>("saved");
  const pending = useRef<NotePatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (inflight.current) await inflight.current;
    const patch = pending.current;
    if (Object.keys(patch).length === 0) return;
    pending.current = {};
    setStatus("saving");
    inflight.current = updateNoteAction(id, patch).then((res) => {
      inflight.current = null;
      if (res.ok) setStatus(Object.keys(pending.current).length ? "pending" : "saved");
      else {
        // Devolve o que não foi salvo para tentar de novo na próxima mudança.
        pending.current = { ...patch, ...pending.current };
        setStatus("error");
        toast.error(res.message);
      }
    });
    await inflight.current;
  }, [id]);

  const queue = useCallback(
    (patch: NotePatch, delay = 700) => {
      pending.current = { ...pending.current, ...patch };
      setStatus("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [flush],
  );

  return { status, queue, flush, hasPending: () => Object.keys(pending.current).length > 0 };
}

export function NoteEditor({
  note,
  subjects,
  labels: initialLabels,
}: {
  note: Note;
  subjects: StudySubject[];
  labels: Label[];
}) {
  const router = useRouter();
  const { openReview } = useStudy();
  const { status, queue, flush, hasPending } = useAutosave(note.id);
  const [title, setTitle] = useState(note.title);
  const [topic, setTopic] = useState(note.topic ?? "");
  const [subjectId, setSubjectId] = useState(note.subject_id);
  const [categoryId, setCategoryId] = useState(note.category_id);
  const [favorite, setFavorite] = useState(note.is_favorite);
  const [tagIds, setTagIds] = useState(note.tagIds);
  const [labels, setLabels] = useState(initialLabels);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const emptyRef = useRef({ title: note.title, topic: note.topic ?? "", text: note.content_text });

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      Placeholder.configure({
        placeholder: "Escreva aqui. Use ## para título, - para lista e [ ] para tarefa.",
      }),
    ],
    content: note.content && Object.keys(note.content as object).length ? (note.content as object) : "",
    editorProps: {
      attributes: { class: "prose-note", "aria-label": "Conteúdo da anotação" },
    },
    onUpdate: ({ editor: e }) => {
      const text = e.getText({ blockSeparator: "\n" });
      emptyRef.current.text = text.trim();
      queue({ content: e.getJSON() as Json, content_text: text });
    },
  });

  // Ao sair: salva o que falta e descarta a anotação se ela ficou vazia.
  useEffect(() => {
    mountedNotes.add(note.id);
    const onHide = () => document.visibilityState === "hidden" && void flush();
    document.addEventListener("visibilitychange", onHide);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPending()) {
        void flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      mountedNotes.delete(note.id);
      void flush().then(() => {
        const { title: t, topic: tp, text } = emptyRef.current;
        if (mountedNotes.has(note.id) || t.trim() || tp.trim() || text) return;
        void discardIfEmptyAction(note.id);
      });
    };
  }, [flush, hasPending, note.id]);

  // Título novo e vazio: foco direto no título.
  useEffect(() => {
    if (!note.title && !note.content_text) titleRef.current?.focus();
  }, [note.title, note.content_text]);

  const categories = labels.filter((l) => l.kind === "category");
  const tags = labels.filter((l) => l.kind === "tag");

  const changeTags = (next: string[]) => {
    setTagIds(next);
    void setNoteTagsAction(note.id, next).then((res) => !res.ok && toast.error(res.message));
  };

  const remove = async () => {
    const res = await deleteNoteAction(note.id);
    if (!res.ok) return void toast.error(res.message);
    emptyRef.current = { title: "x", topic: "", text: "x" }; // evita o descarte duplicado
    toast.success("Anotação excluída");
    router.push("/anotacoes");
  };

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/anotacoes"
          className="inline-flex items-center gap-1.5 rounded-md text-[13px] text-fg-2 transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Anotações
        </Link>
        <div className="flex items-center gap-1">
          <SaveStatus status={status} />
          <button
            type="button"
            onClick={() => {
              setFavorite(!favorite);
              queue({ is_favorite: !favorite }, 0);
            }}
            aria-pressed={favorite}
            aria-label={favorite ? "Remover dos favoritos" : "Marcar como favorita"}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-surface-2",
              favorite ? "text-warning" : "text-fg-3 hover:text-fg",
            )}
          >
            <Star className="size-4" fill={favorite ? "currentColor" : "none"} />
          </button>
          <Menu>
            <MenuTrigger
              aria-label="Ações da anotação"
              className="flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-3 outline-none transition-colors hover:bg-surface-2 hover:text-fg data-[state=open]:bg-surface-2"
            >
              <MoreHorizontal className="size-4" />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem
                onSelect={() =>
                  openReview({
                    subjectId,
                    topic: topic.trim() || title.trim() || null,
                    noteId: note.id,
                  })
                }
              >
                <CalendarClock />
                Agendar revisão
              </MenuItem>
              <MenuSeparator />
              <MenuItem destructive onSelect={() => setConfirmDelete(true)}>
                <Trash2 />
                Excluir anotação…
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>

      <textarea
        ref={titleRef}
        value={title}
        rows={1}
        maxLength={200}
        placeholder="Sem título"
        aria-label="Título"
        onChange={(e) => {
          setTitle(e.target.value);
          emptyRef.current.title = e.target.value;
          queue({ title: e.target.value });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            editor?.commands.focus("start");
          }
        }}
        className="field-sizing-content w-full resize-none bg-transparent text-[26px] leading-tight font-semibold tracking-[-0.02em] text-fg placeholder:text-fg-3 focus:outline-none sm:text-[30px]"
      />

      <div className="mt-4 grid gap-x-4 gap-y-2.5 border-y border-border py-3 text-[13px] sm:grid-cols-[96px_1fr]">
        <span className="pt-1.5 text-fg-3">Matéria</span>
        <select
          aria-label="Matéria"
          value={subjectId ?? ""}
          onChange={(e) => {
            const v = e.target.value || null;
            setSubjectId(v);
            queue({ subject_id: v }, 0);
          }}
          className={cn(selectClass, "w-fit")}
          style={{ backgroundImage: chevron }}
        >
          <option value="">Sem matéria</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <label htmlFor="note-topic" className="pt-1.5 text-fg-3">
          Assunto
        </label>
        <input
          id="note-topic"
          value={topic}
          maxLength={200}
          placeholder="Ex.: Crase"
          onChange={(e) => {
            setTopic(e.target.value);
            emptyRef.current.topic = e.target.value;
            queue({ topic: e.target.value });
          }}
          className="h-8 w-full max-w-[360px] rounded-md border border-transparent bg-transparent px-2 text-[13.5px] text-fg placeholder:text-fg-3 hover:border-border focus:border-accent focus:bg-surface-2 focus:outline-none -ml-2"
        />

        <span className="pt-1.5 text-fg-3">Categoria</span>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Categoria">
          {categories.map((c) => {
            const on = c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  const v = on ? null : c.id;
                  setCategoryId(v);
                  queue({ category_id: v }, 0);
                }}
                className={cn(
                  "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-[12.5px] transition-colors",
                  on
                    ? "border-border-strong bg-surface-3 text-fg"
                    : "border-transparent text-fg-2 hover:bg-surface-2 hover:text-fg",
                )}
              >
                <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden />
                {c.name}
              </button>
            );
          })}
        </div>

        <span className="pt-1.5 text-fg-3">Etiquetas</span>
        <TagPicker
          tags={tags}
          value={tagIds}
          onChange={changeTags}
          onCreate={async (name) => {
            const color = SUBJECT_COLORS[tags.length % SUBJECT_COLORS.length].value;
            const res = await createLabelAction({ name, color, kind: "tag" });
            if (!res.ok) return void toast.error(res.message);
            setLabels((l) => [...l, { id: res.id, name, color, kind: "tag", position: tags.length }]);
            changeTags([...tagIds, res.id]);
          }}
        />
      </div>

      {editor && <Toolbar editor={editor} />}
      <div className="pt-4 pb-24">
        <EditorContent editor={editor} />
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent title="Excluir anotação?">
          <DialogBody>
            <p className="text-[13.5px] leading-relaxed text-fg-2">
              <span className="font-medium text-fg">{title || "Sem título"}</span> será apagada de vez.
            </p>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <DeleteButton onConfirm={remove} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="danger" loading={pending} onClick={() => startTransition(onConfirm)}>
      Excluir anotação
    </Button>
  );
}

function SaveStatus({ status }: { status: Status }) {
  return (
    <span className="mr-2 flex items-center gap-1.5 text-[12.5px] text-fg-3" aria-live="polite">
      {status === "saving" || status === "pending" ? (
        <>
          <Spinner className="size-3" />
          Salvando
        </>
      ) : status === "error" ? (
        <span className="text-danger">Não salvou</span>
      ) : (
        <>
          <Check className="size-3.5" />
          Salvo
        </>
      )}
    </span>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      highlight: e.isActive("highlight"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      code: e.isActive("codeBlock"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  const groups: {
    label: string;
    icon: React.ReactNode;
    active?: boolean;
    disabled?: boolean;
    run: () => void;
  }[][] = [
    [
      { label: "Título", icon: <Heading2 />, active: s.h2, run: () => c().toggleHeading({ level: 2 }).run() },
      {
        label: "Subtítulo",
        icon: <Heading3 />,
        active: s.h3,
        run: () => c().toggleHeading({ level: 3 }).run(),
      },
    ],
    [
      { label: "Negrito", icon: <Bold />, active: s.bold, run: () => c().toggleBold().run() },
      { label: "Itálico", icon: <Italic />, active: s.italic, run: () => c().toggleItalic().run() },
      { label: "Riscado", icon: <Strikethrough />, active: s.strike, run: () => c().toggleStrike().run() },
      {
        label: "Destacar",
        icon: <Highlighter />,
        active: s.highlight,
        run: () => c().toggleHighlight().run(),
      },
    ],
    [
      { label: "Lista", icon: <List />, active: s.bullet, run: () => c().toggleBulletList().run() },
      {
        label: "Lista numerada",
        icon: <ListOrdered />,
        active: s.ordered,
        run: () => c().toggleOrderedList().run(),
      },
      { label: "Tarefas", icon: <ListChecks />, active: s.task, run: () => c().toggleTaskList().run() },
      { label: "Citação", icon: <Quote />, active: s.quote, run: () => c().toggleBlockquote().run() },
      { label: "Código", icon: <Code />, active: s.code, run: () => c().toggleCodeBlock().run() },
    ],
    [
      { label: "Desfazer", icon: <Undo2 />, disabled: !s.canUndo, run: () => c().undo().run() },
      { label: "Refazer", icon: <Redo2 />, disabled: !s.canRedo, run: () => c().redo().run() },
    ],
  ];
  return (
    <div
      role="toolbar"
      aria-label="Formatação"
      className="sticky top-[calc(52px+env(safe-area-inset-top))] z-20 -mx-1 flex items-center gap-0.5 overflow-x-auto border-b border-border bg-bg/90 px-1 py-1.5 backdrop-blur-md lg:top-0"
    >
      {groups.map((g, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />}
          {g.map((b) => (
            <button
              key={b.label}
              type="button"
              title={b.label}
              aria-label={b.label}
              aria-pressed={b.active}
              disabled={b.disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={b.run}
              className={cn(
                "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors disabled:cursor-default disabled:opacity-35 [&_svg]:size-4",
                b.active ? "bg-surface-3 text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
              )}
            >
              {b.icon}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function TagPicker({
  tags,
  value,
  onChange,
  onCreate,
}: {
  tags: Label[];
  value: string[];
  onChange: (ids: string[]) => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = tags.filter((t) => value.includes(t.id));
  const exact = tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((t) => (
        <span
          key={t.id}
          className="inline-flex h-7 items-center gap-1.5 rounded-md bg-surface-2 pr-1 pl-2 text-[12.5px] text-fg"
        >
          <span className="size-1.5 rounded-full" style={{ background: t.color }} aria-hidden />
          {t.name}
          <button
            type="button"
            aria-label={`Remover etiqueta ${t.name}`}
            onClick={() => onChange(value.filter((id) => id !== t.id))}
            className="flex size-5 cursor-pointer items-center justify-center rounded text-fg-3 hover:bg-surface-3 hover:text-fg"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Popover.Root open={open} onOpenChange={(o) => (setOpen(o), setQuery(""))}>
        <Popover.Trigger className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[12.5px] text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg">
          <Plus className="size-3.5" />
          Etiqueta
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 w-[240px] overflow-hidden rounded-lg bg-surface-3 shadow-pop data-[state=open]:animate-pop"
          >
            <Command loop>
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Buscar ou criar…"
                className="h-9 w-full border-b border-border bg-transparent px-3 text-[13.5px] text-fg placeholder:text-fg-3 focus:outline-none"
              />
              <Command.List className="max-h-[240px] overflow-y-auto p-1">
                {tags.map((t) => {
                  const on = value.includes(t.id);
                  return (
                    <Command.Item
                      key={t.id}
                      value={t.name}
                      onSelect={() => onChange(on ? value.filter((id) => id !== t.id) : [...value, t.id])}
                      className="flex h-8 cursor-pointer items-center gap-2 rounded-[5px] px-2 text-[13px] text-fg-2 data-[selected=true]:bg-surface-2 data-[selected=true]:text-fg"
                    >
                      <span className="size-2 rounded-full" style={{ background: t.color }} aria-hidden />
                      <span className="flex-1 truncate">{t.name}</span>
                      {on && <Check className="size-3.5 text-accent" />}
                    </Command.Item>
                  );
                })}
                {query.trim() && !exact && (
                  <Command.Item
                    value={`criar ${query}`}
                    onSelect={() => {
                      void onCreate(query.trim());
                      setQuery("");
                    }}
                    className="flex h-8 cursor-pointer items-center gap-2 rounded-[5px] px-2 text-[13px] text-fg-2 data-[selected=true]:bg-surface-2 data-[selected=true]:text-fg"
                  >
                    <Plus className="size-3.5" />
                    Criar “{query.trim()}”
                  </Command.Item>
                )}
                {tags.length === 0 && !query.trim() && (
                  <p className="px-2 py-3 text-[12.5px] text-fg-3">Digite para criar a primeira etiqueta.</p>
                )}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
