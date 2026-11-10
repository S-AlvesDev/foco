import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/page";
import { cn } from "@/lib/utils";
import { libraryGate } from "@/features/library/components/gate";
import { ColorFilter, EmptyState, MarkList, SearchBox } from "@/features/library/components/parts";
import { MARK_COLORS, type MarkColor } from "@/features/library/model";
import { listMarks } from "@/features/library/queries";

export const metadata: Metadata = { title: "Marcações e anotações" };

const KINDS = { todas: undefined, anotacoes: "note", marcacoes: "highlight" } as const;

export default function LibraryNotesPage({ searchParams }: PageProps<"/biblioteca/anotacoes">) {
  return (
    <Page>
      <Link
        href="/biblioteca"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-fg-3 hover:text-fg"
      >
        <ChevronLeft className="size-4" />
        Biblioteca
      </Link>
      <PageHeader
        title="Marcações e anotações"
        description="Tudo o que você destacou e anotou nas apostilas."
      />
      <Suspense fallback={<div aria-hidden className="h-64 animate-pulse rounded-2xl bg-surface-2/40" />}>
        <Notes searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Notes({ searchParams }: { searchParams: PageProps<"/biblioteca/anotacoes">["searchParams"] }) {
  const sp = await searchParams;
  const gate = await libraryGate();
  if (gate) return gate;
  const tipo = (typeof sp.tipo === "string" && sp.tipo in KINDS ? sp.tipo : "todas") as keyof typeof KINDS;
  const color = MARK_COLORS.includes(sp.cor as MarkColor) ? (sp.cor as MarkColor) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 120) : "";
  const kind = KINDS[tipo];
  const marks = (await listMarks({ kind: color ? "highlight" : kind, color, q })).filter(
    (m) => m.kind !== "favorite",
  );
  const params = (extra: Record<string, string | undefined>) => {
    const p: Record<string, string> = {};
    for (const [k, v] of Object.entries({ tipo, cor: color, q, ...extra }))
      if (v && !(k === "tipo" && v === "todas")) p[k] = v;
    return p;
  };
  const link = (extra: Record<string, string | undefined>) => {
    const s = new URLSearchParams(params(extra)).toString();
    return s ? `/biblioteca/anotacoes?${s}` : "/biblioteca/anotacoes";
  };
  return (
    <div className="flex flex-col gap-4">
      <SearchBox
        q={q}
        action="/biblioteca/anotacoes"
        placeholder="Pesquisar nas suas anotações e trechos…"
        hidden={params({ q: undefined })}
      />
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tipo">
        {(
          [
            ["todas", "Tudo"],
            ["anotacoes", "Anotações"],
            ["marcacoes", "Marcações"],
          ] as const
        ).map(([k, label]) => (
          <Link
            key={k}
            href={link({ tipo: k, cor: k === "anotacoes" ? undefined : color })}
            aria-current={tipo === k ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-[12.5px]",
              tipo === k ? "border-accent bg-accent-subtle text-fg" : "border-border text-fg-2 hover:text-fg",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
      {tipo !== "anotacoes" && (
        <ColorFilter base="/biblioteca/anotacoes" current={color} params={params({ cor: undefined })} />
      )}
      {marks.length ? (
        <MarkList marks={marks} />
      ) : (
        <EmptyState title={q ? `Nada encontrado para “${q}”` : "Nada por aqui ainda"}>
          No leitor, selecione um trecho para marcar com uma cor ou anotar. Anotações gerais ficam no fim de
          cada tópico.
        </EmptyState>
      )}
    </div>
  );
}
