import "server-only";
import Link from "next/link";
import { BrainCircuit, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { plural, shortDate } from "@/lib/format";
import { canReadLibrary } from "@/features/library/queries";
import { getQueue, getMemoryItems } from "../queries";
import { LevelBadge } from "./level-badge";
import { topicLabel } from "@/features/library/model";

/**
 * Card "Revisões de hoje" (painel e página Revisões). Some quando a Biblioteca não está disponível
 * ou a revisão adaptativa não foi instalada. `always` mostra mesmo sem tópicos (com a explicação).
 */
export async function MemoryCard({ always = false }: { always?: boolean }) {
  let q, items;
  try {
    if (!(await canReadLibrary())) return null;
    [q, items] = await Promise.all([getQueue(), getMemoryItems()]);
  } catch {
    return null;
  }
  if (!q.total && !always) return null;
  const next = items
    .filter((i) => i.state !== "suspended" && i.dueOn > q.today)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))[0];
  return (
    <Card aria-labelledby="memory-title" className="flex flex-col">
      <CardHeader
        id="memory-title"
        icon={BrainCircuit}
        title="Revisões de hoje"
        sub={
          q.now.length
            ? `Biblioteca · ${plural(q.now.length, "tópico", "tópicos")} · ~${q.minutes} min`
            : q.total
              ? "Biblioteca · nada vencido hoje"
              : "Revisão adaptativa dos tópicos concluídos"
        }
        action={
          <Link
            href="/revisoes/hoje"
            aria-label="Abrir revisões de hoje"
            className="-mr-1.5 flex size-8 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ChevronRight className="size-[18px]" />
          </Link>
        }
      />
      {q.now.length > 0 ? (
        <>
          <ul className="mt-4 flex flex-col gap-2">
            {q.now.slice(0, 3).map((t) => (
              <li key={t.topicId} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-[13.5px] text-fg">
                  {topicLabel({ number: t.topicNumber, title: t.topicTitle })}
                </span>
                <LevelBadge level={t.level} compact />
              </li>
            ))}
          </ul>
          {q.now.length > 3 && <p className="mt-1.5 text-[12.5px] text-fg-3">e mais {q.now.length - 3}</p>}
          <div className="mt-auto pt-5">
            <Button asChild className="w-full">
              <Link href="/revisoes/hoje">
                <Play />
                Começar revisão
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-4 text-[13.5px] leading-relaxed text-fg-2">
          {q.total
            ? next
              ? `Próxima em ${shortDate(next.dueOn, q.today)}. ${plural(q.total, "tópico", "tópicos")} nas revisões.`
              : `${plural(q.total, "tópico", "tópicos")} nas revisões.`
            : "Ao concluir um tópico na Biblioteca, ele entra aqui com a primeira revisão no dia seguinte; depois, as datas se ajustam ao seu desempenho."}
        </p>
      )}
    </Card>
  );
}
