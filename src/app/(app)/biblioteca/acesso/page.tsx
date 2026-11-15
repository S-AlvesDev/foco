import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { Page } from "@/components/layout/page";
import { getAccessState } from "@/features/library/access";
import { AccessRequestPanel } from "@/features/library/components/gate";

export const metadata: Metadata = { title: "Acesso aos concursos" };

export default function AccessPage() {
  return (
    <Page>
      <Link
        href="/biblioteca"
        className="mb-6 inline-flex items-center gap-1 text-[13px] text-fg-3 hover:text-fg"
      >
        <ChevronLeft className="size-4" />
        Biblioteca
      </Link>
      <Suspense fallback={<div aria-hidden className="h-64 animate-pulse rounded-2xl bg-surface-2/40" />}>
        <Access />
      </Suspense>
    </Page>
  );
}

async function Access() {
  const access = await getAccessState();
  if (access.full || !access.installed) redirect("/biblioteca");
  return <AccessRequestPanel title="Acesso aos concursos" contests={access.contests} />;
}
