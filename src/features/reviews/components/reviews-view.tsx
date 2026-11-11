"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { selectChevron as chevron, selectClass } from "@/components/ui/select";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStudy } from "@/features/timer/study-provider";
import type { StudySubject } from "@/features/timer/types";
import { GROUP_TITLE, reviewGroup, type Review, type ReviewGroup } from "../schedule";
import { ReviewList } from "./review-list";

type View = "pendentes" | "historico";

export function ReviewsView({
  reviews,
  subjects,
  todayISO,
  view,
  subjectId,
  counts,
  materials,
  library,
}: {
  /** Card da revisão adaptativa da Biblioteca (some quando não disponível). */
  library?: React.ReactNode;
  /** Assunto → link do tópico correspondente na Biblioteca. */
  materials?: Record<string, string>;
  reviews: Review[];
  subjects: (StudySubject & { archived: boolean })[];
  todayISO: string;
  view: View;
  subjectId?: string;
  counts: { pending: number; history: number; overdue: number; today: number };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { openReview, ready } = useStudy();
  const active = subjects.filter((s) => !s.archived);

  const set = (key: string, value?: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`/revisoes${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  const groups = (["overdue", "today", "week", "later"] as ReviewGroup[])
    .map((g) => ({ g, items: reviews.filter((r) => reviewGroup(r.due_date, todayISO) === g) }))
    .filter((x) => x.items.length > 0);

  const summary =
    counts.pending === 0
      ? "Agende revisões para voltar aos assuntos no tempo certo."
      : [
          counts.overdue ? plural(counts.overdue, "atrasada", "atrasadas") : null,
          counts.today ? `${counts.today} para hoje` : null,
          plural(counts.pending, "pendente", "pendentes"),
        ]
          .filter(Boolean)
          .join(", ");

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] leading-[1.1] font-semibold tracking-[-0.015em] text-fg sm:text-[34px]">
            Revisões
          </h1>
          <p className="mt-1 text-[14px] text-fg-2 first-letter:uppercase">{summary}</p>
        </div>
        <Button
          variant="primary"
          onClick={() => openReview({ subjectId: subjectId ?? undefined })}
          disabled={!ready}
        >
          <Plus />
          Agendar revisão
        </Button>
      </div>

      {library && <div className="mb-6 empty:hidden">{library}</div>}

      <div className={cn("flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-60")}>
        <Segmented<View>
          label="Mostrar"
          value={view}
          onChange={(v) => set("ver", v === "pendentes" ? undefined : v)}
          options={[
            { value: "pendentes", label: `Pendentes (${counts.pending})` },
            { value: "historico", label: `Histórico (${counts.history})` },
          ]}
        />
        <select
          aria-label="Matéria"
          value={subjectId ?? ""}
          onChange={(e) => set("materia", e.target.value || undefined)}
          className={selectClass}
          style={{ backgroundImage: chevron }}
        >
          <option value="">Todas as matérias</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.archived ? " (arquivada)" : ""}
            </option>
          ))}
        </select>
      </div>

      {reviews.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border-strong px-6 py-12 text-center">
          <CalendarClock className="mx-auto size-5 text-fg-3" />
          <p className="mt-3 text-[14px] font-medium text-fg">
            {view === "historico"
              ? "Nenhuma revisão concluída ainda"
              : subjectId
                ? "Nada pendente nesta matéria"
                : "Nenhuma revisão pendente"}
          </p>
          <p className="mx-auto mt-1.5 max-w-[420px] text-[13.5px] leading-relaxed text-fg-2">
            {view === "historico"
              ? "Quando você concluir ou pular uma revisão, ela aparece aqui com a data e o comentário."
              : "Depois de estudar um assunto, agende revisões para amanhã, em 7 e em 30 dias. Você também pode agendar a partir de uma sessão ou anotação."}
          </p>
          {view === "pendentes" && (
            <Button
              variant="secondary"
              className="mt-5"
              onClick={() => openReview({ subjectId: subjectId ?? undefined })}
              disabled={!ready}
            >
              <Plus />
              Agendar revisão
            </Button>
          )}
        </div>
      ) : view === "historico" ? (
        <div className="mt-6 border-t border-border">
          <ReviewList
            reviews={reviews}
            subjects={subjects}
            activeSubjects={active}
            todayISO={todayISO}
            materials={materials}
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {groups.map(({ g, items }) => (
            <section key={g} aria-label={GROUP_TITLE[g]}>
              <h2
                className={cn(
                  "flex items-baseline justify-between border-b border-border pb-2 text-[13px] font-semibold",
                  g === "overdue" ? "text-danger" : "text-fg",
                )}
              >
                {GROUP_TITLE[g]}
                <span className="text-[12.5px] font-normal text-fg-3 tabular-nums">{items.length}</span>
              </h2>
              <ReviewList
                reviews={items}
                subjects={subjects}
                activeSubjects={active}
                todayISO={todayISO}
                materials={materials}
              />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
