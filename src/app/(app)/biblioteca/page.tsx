import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BookMarked, KeyRound, NotebookPen, Star, Upload, UserCheck } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/format";
import { isQuestionAdmin } from "@/features/questions/queries";
import { libraryGate } from "@/features/library/components/gate";
import { EmptyState, ProgressBar, SearchBox, SearchResults } from "@/features/library/components/parts";
import { topicHref } from "@/features/library/components/toc";
import { topicLabel } from "@/features/library/model";
import { getContinue, getOverview, searchLibrary, type DisciplineSummary } from "@/features/library/queries";
import { getActivePlanScope } from "@/features/plan/queries";
import { countPendingRequests, getAccessState } from "@/features/library/access";
import { cn } from "@/lib/utils";

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
  const [gate, admin, access] = await Promise.all([
    libraryGate(),
    isQuestionAdmin().catch(() => false),
    getAccessState().catch(() => null),
  ]);
  const partial = !!access && access.installed && !access.full;
  const pendingCount = admin && access?.installed ? await countPendingRequests() : 0;
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
            {partial && (
              <Button asChild variant="ghost">
                <Link href="/biblioteca/acesso">
                  <KeyRound />
                  Outros concursos
                </Link>
              </Button>
            )}
            {admin && access?.installed && (
              <Button asChild variant="ghost">
                <Link href="/biblioteca/solicitacoes">
                  <UserCheck />
                  <span className="hidden sm:inline">Solicitações</span>
                  {pendingCount > 0 && (
                    <span
                      className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] leading-5 font-semibold text-accent-fg tabular-nums"
                      aria-label={`${pendingCount} aguardando`}
                    >
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </Button>
            )}
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

  const [overview, cont, hits, scope] = await Promise.all([
    getOverview(),
    getContinue(),
    q ? searchLibrary(q) : Promise.resolve(null),
    getActivePlanScope().catch(() => null),
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

  // Quem tem acesso só a alguns concursos vê esses agrupados; as disciplinas extras liberadas pelo
  // plano (de outros concursos) aparecem à parte, em "Também usadas no plano".
  const visible = partial ? overview.filter((d) => access.allowed.has(d.contestId)) : overview;
  const extras = partial ? overview.filter((d) => !access.allowed.has(d.contestId)) : [];
  const contests = new Map<string, { name: string; items: DisciplineSummary[] }>();
  for (const d of visible) {
    const c = contests.get(d.contestId) ?? { name: d.contestName, items: [] };
    c.items.push(d);
    contests.set(d.contestId, c);
  }
  // O concurso do plano ativo vem primeiro e é o filtro padrão.
  const planContest =
    scope?.plan.contestId && contests.has(scope.plan.contestId) ? scope.plan.contestId : null;
  const ordered = [...contests.entries()].sort(
    ([a], [b]) => Number(b === planContest) - Number(a === planContest),
  );
  const cParam = typeof sp.c === "string" ? sp.c : null;
  const selected = cParam && (cParam === "todos" || contests.has(cParam)) ? cParam : (planContest ?? "todos");
  const shown = selected === "todos" ? ordered : ordered.filter(([id]) => id === selected);
  const alsoInPlan = partial
    ? extras
    : scope && selected !== "todos" && selected === planContest
      ? overview.filter((d) => d.contestId !== selected && scope.disciplineIds.has(d.id))
      : [];
  const contestOf = new Map(overview.map((d) => [d.id, d.contestName]));

  return (
    <>
      {header}
      <SearchBox q={q} />
      {hits ? (
        <section className="mt-6" aria-label="Resultados da busca">
          <p className="mb-3 text-[13px] text-fg-3">
            {hits.length ? `${plural(hits.length, "resultado", "resultados")} para “${q}”` : ""}
          </p>
          <SearchResults q={q} hits={hits} contestOf={contests.size > 1 ? contestOf : undefined} />
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
          {contests.size > 1 && (
            <nav aria-label="Concursos" className="mt-8 -mb-2 flex flex-wrap items-center gap-2">
              {[["todos", "Todos"] as const, ...ordered.map(([id, c]) => [id, c.name] as const)].map(
                ([id, name]) => (
                  <Link
                    key={id}
                    href={`/biblioteca?c=${encodeURIComponent(id)}`}
                    scroll={false}
                    aria-current={selected === id ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                      selected === id
                        ? "border-accent/60 bg-accent-subtle text-fg"
                        : "border-border bg-surface-1 text-fg-2 hover:border-border-strong hover:text-fg",
                    )}
                  >
                    {name}
                    {id === planContest && (
                      <span
                        className="size-1.5 rounded-full bg-accent"
                        aria-label="(plano ativo)"
                        title="Plano ativo"
                      />
                    )}
                  </Link>
                ),
              )}
            </nav>
          )}
          {shown.map(([id, c]) => (
            <section key={id} aria-labelledby={`c-${id}`} className="mt-9">
              <h2 id={`c-${id}`} className="mb-3 text-[13px] font-semibold tracking-[0.02em] text-fg-3">
                {c.name}
                {id === planContest && (
                  <span className="ml-2 font-normal text-fg-3">· concurso do plano ativo</span>
                )}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {c.items.map((d) => (
                  <DisciplineCard key={d.id} d={d} />
                ))}
              </div>
            </section>
          ))}
          {alsoInPlan.length > 0 && (scope || partial) && (
            <section aria-labelledby="also-plan" className="mt-9">
              <h2 id="also-plan" className="text-[13px] font-semibold tracking-[0.02em] text-fg-3">
                {scope ? `Também usadas no ${scope.plan.name}` : "Também usadas no seu plano"}
              </h2>
              <p className="mt-1 mb-3 text-[12.5px] text-fg-3">
                Apostilas de outros concursos que cobrem assuntos do seu edital.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {alsoInPlan.map((d) => (
                  <DisciplineCard key={d.id} d={d} badge={d.contestName} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

function DisciplineCard({ d, badge }: { d: DisciplineSummary; badge?: string }) {
  return (
    <Link
      href={`/biblioteca/${encodeURIComponent(d.id)}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface-1 p-4 shadow-card transition-colors hover:border-border-strong sm:p-5"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          {badge && (
            <span className="mb-1.5 inline-block rounded bg-surface-2 px-1.5 py-px text-[11px] font-semibold text-fg-2">
              {badge}
            </span>
          )}
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
      <h1 className="font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[34px]">
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
