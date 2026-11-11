import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BookMarked, NotebookPen, Star, Upload } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/format";
import { isQuestionAdmin } from "@/features/questions/queries";
import { libraryGate } from "@/features/library/components/gate";
import { EmptyState, ProgressBar, SearchBox, SearchResults } from "@/features/library/components/parts";
import { topicHref } from "@/features/library/components/toc";
import { topicLabel } from "@/features/library/model";
import { getContinue, getOverview, searchLibrary, type DisciplineSummary } from "@/features/library/queries";

export const metadata: Metadata = { title: "Biblioteca" };

export default function LibraryPage({ searchParams }: PageProps<"/biblioteca">) {
  return (
    <Page>
      <Suspense fallback={<Skeleton />}>
        <Library searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Library({ searchParams }: { searchParams: PageProps<"/biblioteca">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 120) : "";
  const [gate, admin] = await Promise.all([libraryGate(), isQuestionAdmin().catch(() => false)]);
  const header = (
    <PageHeader
      title="Biblioteca"
      description="Apostilas organizadas por concurso e disciplina. Leia, marque trechos e anote."
      actions={
        gate ? null : (
          <>
            <Button asChild variant="ghost">
              <Link href="/biblioteca/favoritos">
                <Star />
                Favoritos
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/biblioteca/anotacoes">
                <NotebookPen />
                <span className="sm:hidden">Anotações</span>
                <span className="hidden sm:inline">Marcações e anotações</span>
              </Link>
            </Button>
            {admin && (
              <Button asChild variant="secondary">
                <Link href="/biblioteca/importar">
                  <Upload />
                  <span className="hidden sm:inline">Importar</span>
                </Link>
              </Button>
            )}
          </>
        )
      }
    />
  );
  if (gate)
    return (
      <>
        {header}
        {gate}
      </>
    );

  const [overview, cont, hits] = await Promise.all([
    getOverview(),
    getContinue(),
    q ? searchLibrary(q) : Promise.resolve(null),
  ]);

  if (!overview.length)
    return (
      <>
        {header}
        <EmptyState
          title="Nenhuma apostila ainda"
          action={
            admin ? (
              <Button asChild variant="primary">
                <Link href="/biblioteca/importar">
                  <Upload />
                  Importar a primeira disciplina
                </Link>
              </Button>
            ) : null
          }
        >
          {admin
            ? "Importe o arquivo .json de uma disciplina preparado a partir dos PDFs."
            : "Assim que a conta administradora importar uma disciplina, ela aparece aqui."}
        </EmptyState>
      </>
    );

  const contests = new Map<string, { name: string; items: DisciplineSummary[] }>();
  for (const d of overview) {
    const c = contests.get(d.contestId) ?? { name: d.contestName, items: [] };
    c.items.push(d);
    contests.set(d.contestId, c);
  }

  return (
    <>
      {header}
      <SearchBox q={q} />
      {hits ? (
        <section className="mt-6" aria-label="Resultados da busca">
          <p className="mb-3 text-[13px] text-fg-3">
            {hits.length ? `${plural(hits.length, "resultado", "resultados")} para “${q}”` : ""}
          </p>
          <SearchResults q={q} hits={hits} />
        </section>
      ) : (
        <>
          {cont && (
            <section
              aria-labelledby="continue"
              className="mt-6 rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-subtle text-accent">
                  <BookMarked className="size-5" />
                </span>
                <div className="min-w-0 flex-1 basis-[calc(100%-56px)] sm:basis-auto">
                  <p id="continue" className="text-[12.5px] text-fg-3">
                    Último assunto acessado · {cont.disciplineName}
                  </p>
                  <p className="truncate text-[15.5px] font-semibold text-fg">
                    {topicLabel({ number: cont.topicNumber, title: cont.topicTitle })}
                  </p>
                  <ProgressBar percent={cont.percent} className="mt-2 max-w-[320px]" />
                </div>
                <Button asChild variant="primary" className="w-full sm:w-auto">
                  <Link href={topicHref(cont.disciplineId, cont.topicId, cont.lastBlockId)}>
                    Continuar estudando
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </section>
          )}
          {[...contests.entries()].map(([id, c]) => (
            <section key={id} aria-labelledby={`c-${id}`} className="mt-9">
              <h2 id={`c-${id}`} className="mb-3 text-[13px] font-semibold tracking-[0.02em] text-fg-3">
                {c.name}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {c.items.map((d) => (
                  <DisciplineCard key={d.id} d={d} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}

function DisciplineCard({ d }: { d: DisciplineSummary }) {
  return (
    <Link
      href={`/biblioteca/${encodeURIComponent(d.id)}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface-1 p-4 shadow-card transition-colors hover:border-border-strong sm:p-5"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[15px] leading-snug font-semibold text-fg">{d.name}</span>
          <span className="mt-1 block text-[12.5px] text-fg-3">
            {plural(d.chapters, "capítulo", "capítulos")} · {plural(d.topics, "tópico", "tópicos")}
          </span>
        </span>
        <ArrowRight className="mt-0.5 size-4 shrink-0 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="mt-6 flex items-center justify-between text-[12.5px] text-fg-2">
        <span>{d.readPercent}% lido</span>
        <span className="text-fg-3">
          {d.done ? `${d.done} ${d.done === 1 ? "concluído" : "concluídos"}` : ""}
        </span>
      </span>
      <ProgressBar percent={d.readPercent} className="mt-1.5" />
    </Link>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
        Biblioteca
      </h1>
      <div className="mt-2.5 h-3 w-72 rounded bg-surface-2" />
      <div className="mt-8 h-11 rounded-xl bg-surface-2" />
      <div className="mt-6 h-24 rounded-2xl bg-surface-2/60" />
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-surface-2/50" />
        ))}
      </div>
    </div>
  );
}
