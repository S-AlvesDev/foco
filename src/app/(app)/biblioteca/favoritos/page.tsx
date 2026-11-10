import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/page";
import { libraryGate } from "@/features/library/components/gate";
import { EmptyState, MarkList } from "@/features/library/components/parts";
import { listMarks } from "@/features/library/queries";

export const metadata: Metadata = { title: "Favoritos da biblioteca" };

export default function FavoritesPage() {
  return (
    <Page>
      <Link
        href="/biblioteca"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-fg-3 hover:text-fg"
      >
        <ChevronLeft className="size-4" />
        Biblioteca
      </Link>
      <PageHeader title="Favoritos" description="Tópicos e trechos que você favoritou nas apostilas." />
      <Suspense fallback={<div aria-hidden className="h-64 animate-pulse rounded-2xl bg-surface-2/40" />}>
        <Favorites />
      </Suspense>
    </Page>
  );
}

async function Favorites() {
  const gate = await libraryGate();
  if (gate) return gate;
  const favs = await listMarks({ kind: "favorite" });
  const topics = favs.filter((f) => !f.blockId);
  const excerpts = favs.filter((f) => f.blockId);
  if (!favs.length)
    return (
      <EmptyState title="Nenhum favorito ainda">
        No leitor, toque na estrela para favoritar o tópico, ou selecione um trecho e escolha a estrela.
      </EmptyState>
    );
  return (
    <div className="flex flex-col gap-8">
      {topics.length > 0 && (
        <section aria-labelledby="fav-topics">
          <h2 id="fav-topics" className="mb-3 text-[14px] font-semibold text-fg">
            Tópicos
          </h2>
          <MarkList marks={topics} />
        </section>
      )}
      {excerpts.length > 0 && (
        <section aria-labelledby="fav-excerpts">
          <h2 id="fav-excerpts" className="mb-3 text-[14px] font-semibold text-fg">
            Trechos
          </h2>
          <MarkList marks={excerpts} />
        </section>
      )}
    </div>
  );
}
