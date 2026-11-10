import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, BookText } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { isQuestionAdmin, questionAdminExists } from "@/features/questions/queries";
import { libraryGate } from "@/features/library/components/gate";
import { LibraryImportView } from "@/features/library/components/import-view";

export const metadata: Metadata = { title: "Importar materiais" };

export default function LibraryImportPage() {
  return (
    <Page className="max-w-[880px]">
      <Button asChild variant="ghost" className="-ml-2 mb-4">
        <Link href="/biblioteca">
          <ArrowLeft />
          Biblioteca
        </Link>
      </Button>
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-fg sm:text-[30px]">
        Importar materiais
      </h1>
      <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-2xl bg-surface-2/60" />}>
        <Content />
      </Suspense>
    </Page>
  );
}

async function Content() {
  const [admin, exists, gate] = await Promise.all([isQuestionAdmin(), questionAdminExists(), libraryGate()]);
  if (gate && admin) return <div className="mt-6">{gate}</div>;
  if (!admin)
    return (
      <p className="mt-2 text-[14px] text-fg-2">
        {exists ? (
          "Só a conta administradora importa materiais. Eles aparecem para vocês dois."
        ) : (
          <>
            Nenhuma conta administradora ainda. Ative em{" "}
            <Link href="/questoes/importar" className="text-accent underline-offset-2 hover:underline">
              Questões › Importar
            </Link>
            ; a mesma conta importa as apostilas.
          </>
        )}
      </p>
    );
  return (
    <>
      <p className="mt-1.5 mb-6 flex items-start gap-2 text-[14px] text-fg-2">
        <BookText className="mt-0.5 size-4 shrink-0 text-steel" />
        <span>
          Use o arquivo no formato “alpha-biblioteca” (descrito em docs/BIBLIOTECA.md). Reimportar com os
          mesmos ids atualiza o material sem apagar marcações, anotações, favoritos nem progresso.
        </span>
      </p>
      <LibraryImportView />
    </>
  );
}
