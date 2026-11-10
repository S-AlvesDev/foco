import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { libraryGate } from "@/features/library/components/gate";
import { Reader } from "@/features/library/components/reader";
import { getTopicPage } from "@/features/library/queries";
import { TopicMemory } from "@/features/memory/components/topic-memory";

export const metadata: Metadata = { title: "Leitura" };

export default function TopicPage({ params }: PageProps<"/biblioteca/[disciplina]/[topico]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <TopicLoader params={params} />
    </Suspense>
  );
}

async function TopicLoader({ params }: { params: PageProps<"/biblioteca/[disciplina]/[topico]">["params"] }) {
  const { disciplina, topico } = await params;
  const gate = await libraryGate();
  if (gate) return <div className="mx-auto max-w-[720px] px-4 pt-10">{gate}</div>;
  const page = await getTopicPage(decodeURIComponent(disciplina), decodeURIComponent(topico));
  if (!page) notFound();
  return (
    <Reader
      key={page.topic.id}
      page={page}
      memory={
        <Suspense>
          <TopicMemory
            topicId={page.topic.id}
            topicTitle={page.topic.title}
            disciplineName={page.discipline.name}
            done={page.progress?.status === "done"}
          />
        </Suspense>
      }
    />
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-[720px] animate-pulse px-4 pt-8">
      <div className="h-9 rounded-lg bg-surface-2/60" />
      <div className="mt-8 h-3 w-40 rounded bg-surface-2" />
      <div className="mt-3 h-8 w-3/4 rounded bg-surface-2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="mt-5 h-20 rounded bg-surface-2/40" />
      ))}
    </div>
  );
}
