/** Plano de metas: definição e cálculo do progresso (funções puras, sem banco). */
import { addDays, daysBetween } from "@/lib/dates";

export type ItemKind = "read" | "practice" | "review";

export type PlanItem = {
  kind: ItemKind;
  disciplineId: string;
  discipline: string;
  title: string;
  topics: string[];
};

/** Meta de estudo (`items`) ou revisão geral de um intervalo de metas (`review: [de, até]`). */
export type PlanMeta = {
  id: string;
  extra?: boolean;
  items?: PlanItem[];
  review?: [string, string];
};

export type Plan = { id: string; name: string; source: string; metas: PlanMeta[] };

export type TopicInfo = { id: string; number: string | null; title: string; disciplineId: string };
export type TopicProgress = { status: string; percent: number; completedAt: string | null };
export type TopicMemory = { level: string; dueOn: string; state: string };

export type ItemState = {
  index: number;
  kind: ItemKind;
  discipline: string;
  disciplineId: string;
  title: string;
  /** Tópicos que existem na Biblioteca, na ordem do plano. */
  topics: (TopicInfo & { status: string; percent: number; memory: TopicMemory | null })[];
  missing: number;
  done: boolean;
  doneOn: string | null;
  /** Precisa de marcação manual para concluir (questões, revisão ou tópicos não importados). */
  manual: boolean;
  readDone: number;
};

export type MetaState = {
  id: string;
  label: string;
  extra: boolean;
  kind: "study" | "review";
  reviewRange: [string, string] | null;
  items: ItemState[];
  done: boolean;
  doneOn: string | null;
  /** Fração concluída (0–1), para a barra. */
  progress: number;
};

export type PlanState = {
  metas: MetaState[];
  current: MetaState | null;
  done: number;
  total: number;
  coreDone: number;
  coreTotal: number;
  pace: { perWeek: number; basis: "real" | "default" };
  finishOn: string | null;
};

export const metaLabel = (m: Pick<PlanMeta, "id" | "extra">) =>
  m.extra ? `Extra ${m.id.slice(1)}` : `Meta ${m.id}`;

/** Tópicos de uma revisão geral: todos os tópicos das metas de estudo entre `de` e `até` (inclusive). */
export function reviewTopics(plan: Plan, range: [string, string]): string[] {
  const a = plan.metas.findIndex((m) => m.id === range[0]);
  const b = plan.metas.findIndex((m) => m.id === range[1]);
  if (a < 0 || b < a) return [];
  const seen = new Set<string>();
  for (const m of plan.metas.slice(a, b + 1))
    for (const it of m.items ?? []) for (const t of it.topics) seen.add(t);
  return [...seen];
}

const dateOf = (ts: string | null | undefined, toLocal: (ts: string) => string) => (ts ? toLocal(ts) : null);
const maxDate = (ds: (string | null)[]) =>
  ds.reduce<string | null>((m, d) => (d && (!m || d > m) ? d : m), null);

/**
 * Estado do plano. Uma meta de leitura conclui quando todos os tópicos (que existem na Biblioteca)
 * estão concluídos no leitor; questões, revisões e tópicos ausentes concluem pela marcação manual.
 * A meta atual é a primeira não concluída (o plano anda quando você conclui, não pelo calendário).
 */
export function planState(opts: {
  plan: Plan;
  topics: Map<string, TopicInfo>;
  progress: Map<string, TopicProgress>;
  memory: Map<string, TopicMemory>;
  /** "meta:item" -> data (AAAA-MM-DD) em que foi marcado. */
  marks: Map<string, string>;
  today: string;
  /** Converte timestamp do banco para a data local. */
  toLocal: (ts: string) => string;
}): PlanState {
  const { plan, topics, progress, memory, marks, today, toLocal } = opts;

  const buildItem = (it: PlanItem, index: number, metaId: string): ItemState => {
    const list = it.topics
      .map((id) => topics.get(id))
      .filter((x): x is TopicInfo => !!x)
      .map((x) => {
        const p = progress.get(x.id);
        return {
          ...x,
          status: p?.status ?? "not_started",
          percent: p?.percent ?? 0,
          memory: memory.get(x.id) ?? null,
        };
      });
    const missing = it.topics.length - list.length;
    const readDone = list.filter((x) => x.status === "done").length;
    const manual = it.kind !== "read" || list.length === 0;
    const mark = marks.get(`${metaId}:${index}`) ?? null;
    const readOk = list.length > 0 && readDone === list.length;
    const done = manual ? !!mark : readOk;
    const doneOn = manual
      ? mark
      : readOk
        ? maxDate(list.map((x) => dateOf(progress.get(x.id)?.completedAt, toLocal)))
        : null;
    return {
      index,
      kind: it.kind,
      discipline: it.discipline,
      disciplineId: it.disciplineId,
      title: it.title,
      topics: list,
      missing,
      done,
      doneOn,
      manual,
      readDone,
    };
  };

  const metas: MetaState[] = plan.metas.map((m) => {
    if (m.review) {
      const ids = reviewTopics(plan, m.review);
      const [a, b] = m.review.map((id) => (id.startsWith("E") ? id.slice(1) : id));
      const item = buildItem(
        {
          kind: "review",
          disciplineId: "",
          discipline: "Revisão geral",
          title: m.extra ? `Revisão das extras ${a} a ${b}` : `Revisão das metas ${a} a ${b}`,
          topics: ids,
        },
        0,
        m.id,
      );
      return {
        id: m.id,
        label: metaLabel(m),
        extra: !!m.extra,
        kind: "review",
        reviewRange: m.review,
        items: [item],
        done: item.done,
        doneOn: item.doneOn,
        progress: item.done ? 1 : 0,
      };
    }
    const items = (m.items ?? []).map((it, i) => buildItem(it, i, m.id));
    const done = items.length > 0 && items.every((i) => i.done);
    const parts = items.map((i) =>
      i.done ? 1 : i.manual || !i.topics.length ? 0 : i.readDone / i.topics.length,
    );
    return {
      id: m.id,
      label: metaLabel(m),
      extra: !!m.extra,
      kind: "study",
      reviewRange: null,
      items,
      done,
      doneOn: done ? maxDate(items.map((i) => i.doneOn)) : null,
      progress: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0,
    };
  });

  const core = metas.filter((m) => !m.extra);
  const doneCount = metas.filter((m) => m.done).length;
  const current = metas.find((m) => !m.done) ?? null;

  // Ritmo: metas concluídas na janela recente (de 7 a 14 dias, contando a partir da primeira conclusão,
  // para não diluir o começo do plano). Com menos de 3 metas, usa o ritmo sugerido de 6 por semana.
  const doneDays = metas.map((m) => m.doneOn).filter((d): d is string => !!d && d <= today);
  const first = doneDays.reduce<string | null>((a, d) => (!a || d < a ? d : a), null);
  const span = first ? Math.min(14, Math.max(7, daysBetween(first, today) + 1)) : 14;
  const recent = doneDays.filter((d) => daysBetween(d, today) < span).length;
  const pace =
    recent >= 3
      ? { perWeek: (recent / span) * 7, basis: "real" as const }
      : { perWeek: 6, basis: "default" as const };
  const remaining = metas.length - doneCount;
  const finishOn = remaining === 0 ? null : addDays(today, Math.ceil((remaining / pace.perWeek) * 7));

  return {
    metas,
    current,
    done: doneCount,
    total: metas.length,
    coreDone: core.filter((m) => m.done).length,
    coreTotal: core.length,
    pace,
    finishOn,
  };
}
