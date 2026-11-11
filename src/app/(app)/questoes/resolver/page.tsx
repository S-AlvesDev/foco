import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, SearchX } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { QuestionSolver } from "@/features/questions/components/question-solver";
import { filtersToParams, parseFilters } from "@/features/questions/model";
import { findAt, getAreaPref, getMyState, getPublicQuestion } from "@/features/questions/queries";

export const metadata: Metadata = { title: "Resolver questões" };

export default function SolvePage({ searchParams }: PageProps<"/questoes/resolver">) {
  return (
    <Page size="narrow">
      <Suspense fallback={<SolveSkeleton />}>
        <Solve searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Solve({ searchParams }: { searchParams: PageProps<"/questoes/resolver">["searchParams"] }) {
  const sp = await searchParams;
  const filters = parseFilters(sp, await getAreaPref());
  const rawN = Number(Array.isArray(sp.n) ? sp.n[0] : sp.n);
  const n = Number.isInteger(rawN) && rawN >= 1 && rawN <= 1_000_000 ? rawN : 1;
  const rawSeed = Array.isArray(sp.s) ? sp.s[0] : sp.s;
  const seed = rawSeed && /^[a-z0-9]{1,16}$/.test(rawSeed) ? rawSeed : null;
  const listHref = `/questoes?${filtersToParams(filters)}`;

  const found = await findAt(filters, n - 1, seed);
  if (!found.id) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong px-6 py-14 text-center">
        <SearchX className="mx-auto size-8 text-fg-3" aria-hidden />
        <p className="mt-3 text-[15px] font-semibold text-fg">
          {found.total === 0 ? "Nenhuma questão com esses filtros" : "Você chegou ao fim da lista"}
        </p>
        <p className="mx-auto mt-1.5 max-w-[420px] text-[13.5px] leading-relaxed text-fg-2">
          {found.total === 0
            ? "Volte aos filtros e remova algum critério."
            : `A lista tem ${found.total.toLocaleString("pt-BR")} ${found.total === 1 ? "questão" : "questões"}. Volte aos filtros para montar outra.`}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild variant="secondary">
            <Link href={listHref}>
              <ArrowLeft />
              Voltar aos filtros
            </Link>
          </Button>
          {found.total > 0 && (
            <Button asChild variant="primary">
              <Link href={`/questoes/resolver?${filtersToParams(filters, { n: 1, s: seed })}`}>
                Recomeçar do início
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const [question, mine] = await Promise.all([getPublicQuestion(found.id), getMyState(found.id)]);
  if (!question) throw new Error("QUESTION_NOT_FOUND");

  return (
    <QuestionSolver
      // Nova questão = estado novo (seleção, resposta, abas).
      key={`${question.id}:${n}`}
      question={question}
      mine={mine}
      position={n}
      total={found.total}
      status={filters.status}
      baseQuery={filtersToParams(filters, { s: seed }).toString()}
      listHref={listHref}
    />
  );
}

function SolveSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 rounded-md bg-surface-2" />
        <div className="h-4 w-36 rounded bg-surface-2" />
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-surface-2" />
      <div className="mt-6 rounded-2xl border border-border bg-surface-1 p-6">
        <div className="h-4 w-2/3 rounded bg-surface-2" />
        <div className="mt-3 h-3 w-1/3 rounded bg-surface-2" />
        <div className="mt-8 space-y-2.5">
          <div className="h-4 rounded bg-surface-2" />
          <div className="h-4 rounded bg-surface-2" />
          <div className="h-4 w-4/5 rounded bg-surface-2" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="h-14 rounded-xl bg-surface-2" />
          <div className="h-14 rounded-xl bg-surface-2" />
        </div>
      </div>
    </div>
  );
}
