import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Target } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { getPlanPage, PLANS } from "@/features/plan/queries";
import { PlanSwitcher } from "@/features/plan/components/plan-switcher";
import { CurrentMeta, PlanList, PlanSummary } from "@/features/plan/components/plan-view";

export const metadata: Metadata = { title: "Plano de metas" };

export default function PlanPageRoute() {
  return (
    <Page>
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
      description="As metas do concurso, ligadas às apostilas da Biblioteca."
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
        {PLANS.length > 1 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-[13px] font-medium text-fg-2">Plano ativo</span>
            <PlanSwitcher
              plans={PLANS.map((p) => ({ id: p.id, label: p.name.replace(/^Plano de metas /, "") }))}
              active={page.plan.id}
            />
            <span className="text-[12px] text-fg-3">Vale para este aparelho e muda a Missão do dia.</span>
          </div>
        )}
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
          {page.plan.note && ` ${page.plan.note}`}
        </p>
        <PlanList page={page} />
      </div>
    </>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <h1 className="font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[34px]">
        Plano de metas
      </h1>
      <div className="mt-2.5 h-3 w-72 rounded bg-surface-2" />
      <div className="mt-8 h-32 rounded-2xl bg-surface-2/50" />
      <div className="mt-5 h-64 rounded-2xl bg-surface-2/50" />
    </div>
  );
}
