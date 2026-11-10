import "server-only";
import Link from "next/link";
import { ArrowRight, ChevronRight, LibraryBig } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { topicLabel } from "../model";
import { canReadLibrary, getContinue, getOverview } from "../queries";
import { ProgressBar } from "./parts";
import { topicHref } from "./toc";

/** Card do painel: continuar a leitura e o quanto já foi lido. Some se a biblioteca não estiver disponível. */
export async function LibraryCard() {
  let data;
  try {
    if (!(await canReadLibrary())) return null;
    data = await Promise.all([getOverview(), getContinue()]);
  } catch {
    return null;
  }
  const [overview, cont] = data;
  if (!overview.length) return null;
  const topics = overview.reduce((s, d) => s + d.topics, 0);
  const done = overview.reduce((s, d) => s + d.done, 0);
  const pct = topics ? Math.round(overview.reduce((s, d) => s + d.readPercent * d.topics, 0) / topics) : 0;
  return (
    <Card aria-labelledby="library-title">
      <CardHeader
        id="library-title"
        icon={LibraryBig}
        title="Biblioteca"
        sub={`${pct}% lido · ${done} de ${topics} tópicos concluídos`}
        action={
          <Link
            href="/biblioteca"
            aria-label="Abrir biblioteca"
            className="-mr-1.5 flex size-8 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ChevronRight className="size-[18px]" />
          </Link>
        }
      />
      {cont ? (
        <Link
          href={topicHref(cont.disciplineId, cont.topicId, cont.lastBlockId)}
          className="mt-4 flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-border-strong hover:bg-surface-2/50"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] text-fg-3">
              Continuar lendo · {cont.disciplineName}
            </span>
            <span className="block truncate text-[14px] font-medium text-fg">
              {topicLabel({ number: cont.topicNumber, title: cont.topicTitle })}
            </span>
            <ProgressBar percent={cont.percent} className="mt-1.5" />
          </span>
          <ArrowRight className="size-4 shrink-0 text-fg-3" />
        </Link>
      ) : (
        <p className="mt-4 text-[13.5px] leading-relaxed text-fg-2">
          {overview.length === 1 ? "1 disciplina disponível" : `${overview.length} disciplinas disponíveis`}.
          Abra a biblioteca para começar a ler.
        </p>
      )}
    </Card>
  );
}
