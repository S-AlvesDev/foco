import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, ChevronLeft, Highlighter, ListTree } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { plural } from "@/lib/format";
import { isQuestionAdmin } from "@/features/questions/queries";
import { AdminArchive } from "@/features/library/components/admin-archive";
import { libraryGate } from "@/features/library/components/gate";
import {
  ColorFilter,
  EmptyState,
  MarkList,
  ProgressBar,
  SearchBox,
  SearchResults,
} from "@/features/library/components/parts";
import { Toc, topicHref } from "@/features/library/components/toc";
import { MARK_COLORS, topicLabel, type MarkColor } from "@/features/library/model";
import { getDiscipline, listMarks, searchLibrary } from "@/features/library/queries";
import { getDisciplineLevels } from "@/features/memory/queries";

export const metadata: Metadata = { title: "Biblioteca" };

export default function DisciplinePage({ params, searchParams }: PageProps<"/biblioteca/[disciplina]">) {
  return (
    <Page>
      <Suspense fallback={<Skeleton />}>
        <Discipline params={params} searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Discipline({
  params,
  searchParams,
}: {
  params: PageProps<"/biblioteca/[disciplina]">["params"];
  searchParams: PageProps<"/biblioteca/[disciplina]">["searchParams"];
}) {
  const [{ disciplina }, sp] = await Promise.all([params, searchParams]);
  const id = decodeURIComponent(disciplina);
  const gate = await libraryGate();
  if (gate) return gate;
  const d = await getDiscipline(id);
  if (!d) notFound();
  const tab = sp.aba === "marcacoes" ? "marks" : "content";
  const color = MARK_COLORS.includes(sp.cor as MarkColor) ? (sp.cor as MarkColor) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 120) : "";
  const [admin, marks, hits, levels] = await Promise.all([
    isQuestionAdmin().catch(() => false),
    tab === "marks" ? listMarks({ disciplineId: d.id, kind: "excerpts", color }) : Promise.resolve([]),
    q ? searchLibrary(q, d.id) : Promise.resolve(null),
    getDisciplineLevels(d.id).catch(() => ({})),
  ]);

  const total = d.topics.length;
  const done = d.topics.filter((t) => t.status === "done").length;
  const percent = total ? Math.round(d.topics.reduce((s, t) => s + t.percent, 0) / total) : 0;
  const last = [...d.topics]
    .filter((t) => t.lastReadAt)
    .sort((a, b) => (b.lastReadAt! > a.lastReadAt! ? 1 : -1))[0];
  const firstUnread = d.topics.find((t) => t.status !== "done");
  const target = last ?? firstUnread ?? d.topics[0];
  const base = `/biblioteca/${encodeURIComponent(d.id)}`;

  return (
    <>
      <Link
        href="/biblioteca"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-fg-3 hover:text-fg"
      >
        <ChevronLeft className="size-4" />
        Biblioteca
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg-3">{d.contestName}</p>
          <h1 className="mt-1 text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
            {d.name}
          </h1>
          <p className="mt-1.5 text-[14px] text-fg-2">
            {plural(d.chapters.length, "capítulo", "capítulos")} · {plural(total, "tópico", "tópicos")} ·{" "}
            {done} com leitura concluída
          </p>
          {d.description && (
            <p className="mt-2 max-w-[620px] text-[13.5px] leading-relaxed text-fg-3">{d.description}</p>
          )}
        </div>
        {target && (
          <Button asChild variant="primary">
            <Link href={topicHref(d.id, target.id)}>
              {last ? "Continuar estudando" : "Começar a ler"}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
      <div className="mb-6 rounded-2xl border border-border bg-surface-1 px-4 py-3.5">
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-fg-2">{percent}% do material lido</span>
          {last && <span className="truncate pl-4 text-fg-3">Último: {topicLabel(last)}</span>}
        </div>
        <ProgressBar percent={percent} className="mt-2" />
      </div>

      <SearchBox q={q} action={base} placeholder={`Buscar em ${d.name}…`} />

      {hits ? (
        <section className="mt-5" aria-label="Resultados da busca">
          <SearchResults q={q} hits={hits} />
        </section>
      ) : (
        <>
          <div className="mt-6 mb-5 flex gap-1 border-b border-border" role="tablist">
            <TabLink href={base} active={tab === "content"} icon={<ListTree className="size-4" />}>
              Conteúdo
            </TabLink>
            <TabLink
              href={`${base}?aba=marcacoes`}
              active={tab === "marks"}
              icon={<Highlighter className="size-4" />}
            >
              Minhas marcações
            </TabLink>
          </div>
          {tab === "content" ? (
            <Toc disciplineId={d.id} chapters={d.chapters} levels={levels} />
          ) : (
            <div className="flex flex-col gap-4">
              <ColorFilter base={base} current={color} params={{ aba: "marcacoes" }} />
              {marks.length ? (
                <MarkList marks={marks} showDiscipline={false} />
              ) : (
                <EmptyState title={color ? "Nenhum trecho nesta cor" : "Nenhum trecho marcado ainda"}>
                  Selecione um trecho no leitor para marcar com uma cor, anotar ou favoritar.
                </EmptyState>
              )}
            </div>
          )}
        </>
      )}
      {admin && (
        <div className="mt-12 flex justify-end border-t border-border pt-4">
          <AdminArchive kind="discipline" id={d.id} label="Disciplina" redirectTo="/biblioteca" />
        </div>
      )}
    </>
  );
}

function TabLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13.5px] font-medium transition-colors",
        active ? "border-accent text-fg" : "border-transparent text-fg-3 hover:text-fg",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-3 w-20 rounded bg-surface-2" />
      <div className="mt-6 h-8 w-80 rounded bg-surface-2" />
      <div className="mt-3 h-3 w-60 rounded bg-surface-2" />
      <div className="mt-6 h-16 rounded-2xl bg-surface-2/60" />
      <div className="mt-6 h-64 rounded-2xl bg-surface-2/40" />
    </div>
  );
}
