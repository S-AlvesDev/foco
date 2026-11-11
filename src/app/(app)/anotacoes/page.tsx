import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/layout/page";
import { NotesView } from "@/features/notes/components/notes-view";
import { listLabels, listNotes, NOT_EMPTY } from "@/features/notes/queries";
import { listSubjects } from "@/features/subjects/queries";
import { uuid } from "@/features/subjects/schemas";
import { getProfile } from "@/lib/auth";
import { localDateISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Anotações" };

export default function NotesPage({ searchParams }: PageProps<"/anotacoes">) {
  return (
    <Page>
      <Suspense fallback={<NotesSkeleton />}>
        <Notes searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

const id = (v: unknown) => (typeof v === "string" && uuid.safeParse(v).success ? v : undefined);

async function Notes({ searchParams }: { searchParams: PageProps<"/anotacoes">["searchParams"] }) {
  const sp = await searchParams;
  const filters = {
    q: typeof sp.q === "string" ? sp.q.slice(0, 200) : "",
    subjectId: id(sp.materia),
    categoryId: id(sp.categoria),
    tagId: id(sp.etiqueta),
    favorites: sp.favoritas === "1",
    group: (sp.agrupar === "materia" || sp.agrupar === "assunto" ? sp.agrupar : "nenhum") as
      "nenhum" | "materia" | "assunto",
  };
  const supabase = await createClient();
  const [profile, subjects, labels, notes, count] = await Promise.all([
    getProfile(),
    listSubjects(),
    listLabels(),
    listNotes(filters),
    supabase.from("study_notes").select("id", { head: true, count: "exact" }).or(NOT_EMPTY),
  ]);
  return (
    <NotesView
      notes={notes}
      labels={labels}
      subjects={subjects.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        archived: Boolean(s.archived_at),
      }))}
      filters={filters}
      todayISO={localDateISO(profile.timezone, new Date())}
      totalCount={count.count ?? 0}
    />
  );
}

function NotesSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[34px]">
        Anotações
      </h1>
      <div className="mt-2.5 h-3 w-56 rounded bg-surface-2" />
      <div className="mt-6 h-10 rounded-lg bg-surface-2/60" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="mt-5 h-14 rounded bg-surface-2/40" />
      ))}
    </div>
  );
}
