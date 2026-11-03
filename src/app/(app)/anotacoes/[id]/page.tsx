import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Page } from "@/components/layout/page";
import { NoteEditor } from "@/features/notes/components/note-editor";
import { getNote, listLabels } from "@/features/notes/queries";
import { listSubjects } from "@/features/subjects/queries";
import { uuid } from "@/features/subjects/schemas";

export const metadata: Metadata = { title: "Anotação" };

export default function NotePage({ params }: PageProps<"/anotacoes/[id]">) {
  return (
    <Page>
      <Suspense fallback={<EditorSkeleton />}>
        <NoteLoader params={params} />
      </Suspense>
    </Page>
  );
}

async function NoteLoader({ params }: { params: PageProps<"/anotacoes/[id]">["params"] }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const [note, subjects, labels] = await Promise.all([getNote(id), listSubjects(), listLabels()]);
  if (!note) notFound();
  // Matérias ativas, mais a da anotação caso esteja arquivada.
  const options = subjects
    .filter((s) => !s.archived_at || s.id === note.subject_id)
    .map((s) => ({ id: s.id, name: s.name, color: s.color }));
  return <NoteEditor key={note.id} note={note} subjects={options} labels={labels} />;
}

function EditorSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-[760px] animate-pulse">
      <div className="h-3 w-24 rounded bg-surface-2" />
      <div className="mt-8 h-8 w-2/3 rounded bg-surface-2" />
      <div className="mt-6 h-24 rounded bg-surface-2/50" />
      <div className="mt-6 h-40 rounded bg-surface-2/30" />
    </div>
  );
}
