import "server-only";
import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortDate } from "@/lib/format";
import { isQuestionAdmin } from "@/features/questions/queries";
import { getTopicMemory } from "../queries";
import { LevelBadge } from "./level-badge";
import { IncludeInReviews } from "./include-button";
import { TopicLinksDialog } from "./topic-links-dialog";

/** Linha do leitor: nível de domínio, próxima revisão e (admin) ligação com as questões. */
export async function TopicMemory({
  topicId,
  topicTitle,
  disciplineName,
  done,
}: {
  topicId: string;
  topicTitle: string;
  disciplineName: string;
  done: boolean;
}) {
  const [mem, admin] = await Promise.all([
    getTopicMemory(topicId).catch(() => null),
    isQuestionAdmin().catch(() => false),
  ]);
  if (!mem && !admin && !done) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-fg-3">
      {mem ? (
        <>
          <LevelBadge level={mem.level} />
          {mem.state === "suspended" ? (
            <span>fora das revisões</span>
          ) : mem.dueOn <= mem.today ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/revisoes/hoje?topico=${encodeURIComponent(topicId)}`}>
                <Play />
                Revisar agora
              </Link>
            </Button>
          ) : (
            <span>próxima revisão {shortDate(mem.dueOn, mem.today)}</span>
          )}
        </>
      ) : done ? (
        <IncludeInReviews topicId={topicId} />
      ) : null}
      {admin && (
        <TopicLinksDialog topicId={topicId} topicTitle={topicTitle} disciplineName={disciplineName} />
      )}
    </div>
  );
}
