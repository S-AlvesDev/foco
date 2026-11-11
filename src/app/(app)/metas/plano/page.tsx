import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Target } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { getPlanPage } from "@/features/plan/queries";
import { CurrentMeta, PlanList, PlanSummary } from "@/features/plan/components/plan-view";

export const metadata: Metadata = { title: "Plano de metas" };

export default function PlanPageRoute() {
  return (
    <Page className="max-w-[880px]">
      <Suspense fallback={<Skeleton />}>
        <PlanContent />
      </Suspense>
    </Page>
  );
}

async function PlanContent() {
  const page = await getPlanPage();
  const header = (
    <PageHeader
      title="Plano de metas"
      description="Plano da PRF do seu curso, só com as matérias que têm apostila na Biblioteca. Cada meta abre direto os tópicos certos."
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/metas">
            <Target />
            Metas de horas
          </Link>
        </Button>
      }
    />
  );
  if (!page)
    return (
      <>
        {header}
        <p className="text-[14px] text-fg-2">
          O plano usa as apostilas da Biblioteca, que não está disponível nesta conta.
        </p>
      </>
    );
  return (
    <>
      {header}
      <div className="flex flex-col gap-5">
        {page.marksMissing && (
          <Notice tone="warning">
            Para marcar revisões e questões como feitas, rode a migração <strong>0013_study_plan.sql</strong>{" "}
            no SQL Editor do Supabase. As metas de leitura já funcionam sem ela.
          </Notice>
        )}
        <PlanSummary page={page} />
        <CurrentMeta page={page} />
        <p className="text-[12.5px] leading-relaxed text-fg-3">
          O plano anda quando você conclui: uma meta de leitura fica pronta quando todos os tópicos dela estão
          marcados como lidos na Biblioteca. Revisões gerais e metas de questões você conclui no botão.
          Português, Matemática, Informática e Redação ficam com as videoaulas do curso, por isso não aparecem
          aqui.
        </p>
        <PlanList page={page} />
      </div>
    </>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
        Plano de metas
      </h1>
      <div className="mt-2.5 h-3 w-72 rounded bg-surface-2" />
      <div className="mt-8 h-32 rounded-2xl bg-surface-2/50" />
      <div className="mt-5 h-64 rounded-2xl bg-surface-2/50" />
    </div>
  );
}
