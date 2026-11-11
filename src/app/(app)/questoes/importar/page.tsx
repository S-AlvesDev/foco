import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { ClaimAdmin, ImportView, ReportList } from "@/features/questions/components/import-view";
import {
  getCatalogSize,
  isQuestionAdmin,
  listOpenReports,
  questionAdminExists,
} from "@/features/questions/queries";

export const metadata: Metadata = { title: "Importar questões" };

export default function ImportPage() {
  return (
    <Page size="narrow">
      <Button asChild variant="ghost" className="-ml-2 mb-4">
        <Link href="/questoes">
          <ArrowLeft />
          Banco de questões
        </Link>
      </Button>
      <h1 className="font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[34px]">
        Importar questões
      </h1>
      <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-2xl bg-surface-2/60" />}>
        <Content />
      </Suspense>
    </Page>
  );
}

async function Content() {
  const user = await requireUser();
  const [admin, exists, size, reports] = await Promise.all([
    isQuestionAdmin(),
    questionAdminExists(),
    getCatalogSize(),
    listOpenReports(user.id),
  ]);

  if (!admin) {
    return (
      <>
        <p className="mt-1 text-[14px] text-fg-2">
          {exists
            ? "Só a conta administradora do banco importa lotes. As questões importadas aparecem para as duas contas."
            : "Nenhuma conta importa questões ainda. A primeira que ativar vira a administradora do banco."}
        </p>
        {!exists && <ClaimAdmin />}
        {reports.length > 0 && <ReportList reports={reports} canResolve={false} />}
      </>
    );
  }

  return (
    <>
      <p className="mt-1 flex items-center gap-1.5 text-[14px] text-fg-2">
        <ShieldCheck className="size-4 text-success" aria-hidden />
        Esta conta administra o banco. Hoje ele tem {size.toLocaleString("pt-BR")}{" "}
        {size === 1 ? "questão" : "questões"}.
      </p>
      <ImportView />
      <ReportList reports={reports} canResolve />
    </>
  );
}
