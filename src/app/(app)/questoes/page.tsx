import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Upload } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { AreaChooser } from "@/features/questions/components/area-chooser";
import { QuestionFilters } from "@/features/questions/components/question-filters";
import { parseFilters, toQuery } from "@/features/questions/model";
import {
  getAreaPref,
  getFacets,
  isQuestionAdmin,
  questionAdminExists,
  QuestionsNotInstalled,
} from "@/features/questions/queries";

export const metadata: Metadata = { title: "Banco de questões" };

export default function QuestionsPage({ searchParams }: PageProps<"/questoes">) {
  return (
    <Page>
      <Suspense fallback={<QuestionsSkeleton />}>
        <Questions searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Questions({ searchParams }: { searchParams: PageProps<"/questoes">["searchParams"] }) {
  const sp = await searchParams;
  let loaded;
  try {
    loaded = await Promise.all([getAreaPref(), isQuestionAdmin(), questionAdminExists()]);
  } catch (e) {
    if (!(e instanceof QuestionsNotInstalled)) throw e;
    return (
      <>
        <Header />
        <div className="rounded-2xl border border-dashed border-border-strong px-6 py-14 text-center">
          <p className="text-[15px] font-semibold text-fg">O banco de questões ainda não foi instalado</p>
          <p className="mx-auto mt-1.5 max-w-[480px] text-[13.5px] leading-relaxed text-fg-2">
            No Supabase, abra SQL Editor e rode o arquivo supabase/migrations/0009_questions.sql. Depois,
            recarregue esta página.
          </p>
        </div>
      </>
    );
  }
  const [pref, admin, adminExists] = loaded;
  const filters = parseFilters(sp, pref);
  // As facetas trazem também a contagem por área (para a escolha de área).
  const facets = await getFacets(filters);
  const catalog = facets.area.reduce((n, a) => n + a.n, 0);

  const importLink = admin ? (
    <Button asChild variant="secondary">
      <Link href="/questoes/importar">
        <Upload />
        Importar questões
      </Link>
    </Button>
  ) : !adminExists ? (
    <Button asChild variant="secondary">
      <Link href="/questoes/importar">
        <Upload />
        Ativar importação
      </Link>
    </Button>
  ) : null;

  if (catalog === 0 && !toQuery(filters).text) {
    return (
      <>
        <Header actions={importLink} />
        <div className="rounded-2xl border border-dashed border-border-strong px-6 py-14 text-center">
          <p className="text-[15px] font-semibold text-fg">O banco de questões ainda está vazio</p>
          <p className="mx-auto mt-1.5 max-w-[460px] text-[13.5px] leading-relaxed text-fg-2">
            {admin || !adminExists
              ? "Importe um lote em .json para começar. As questões ficam disponíveis para as duas contas."
              : "Assim que a conta administradora importar um lote, as questões aparecem aqui."}
          </p>
          {importLink && <div className="mt-5 flex justify-center">{importLink}</div>}
        </div>
      </>
    );
  }

  if (!filters.area) {
    return (
      <>
        <Header actions={importLink} />
        <AreaChooser areas={facets.area} total={catalog} />
      </>
    );
  }

  return (
    <>
      <Header actions={importLink} />
      <QuestionFilters filters={filters} facets={facets} catalog={catalog} />
    </>
  );
}

function Header({ actions }: { actions?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
          Banco de questões
        </h1>
        <p className="mt-1 text-[14px] text-fg-2">
          Filtre, resolva e veja o gabarito comentado de cada questão.
        </p>
      </div>
      {actions}
    </div>
  );
}

function QuestionsSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
        Banco de questões
      </h1>
      <div className="mt-2.5 h-3 w-72 rounded bg-surface-2" />
      <div className="mt-8 h-10 w-80 rounded-lg bg-surface-2" />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[88px] rounded-2xl bg-surface-2/60" />
        ))}
      </div>
      <div className="mt-5 h-48 rounded-2xl bg-surface-2/50" />
    </div>
  );
}
