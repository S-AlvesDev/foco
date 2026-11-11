import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, ListChecks, Play, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { areaLabel } from "../model";
import { byDisciplina, dailySeries, questionSummary, rateTone, weakFocus, type QRow } from "../performance";

const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);
const toneText = {
  good: "text-success",
  mid: "text-warning",
  low: "text-danger",
  none: "text-fg-3",
} as const;
const toneBar = { good: "bg-success", mid: "bg-warning", low: "bg-danger", none: "bg-surface-3" } as const;
const n = (v: number) => v.toLocaleString("pt-BR");

function filterHref(p: Record<string, string>) {
  return `/questoes?${new URLSearchParams(p)}` as Route;
}

/** Bloco "Questões" da página de desempenho. */
export function QuestionPerformance({
  rows,
  prevRows,
  from,
  to,
  today,
  periodLabel,
}: {
  rows: QRow[];
  prevRows: QRow[];
  from: string;
  to: string;
  today: string;
  periodLabel: string;
}) {
  const s = questionSummary(rows, from, to);
  const prev = questionSummary(prevRows, "0000-01-01", "9999-12-31");
  const disc = byDisciplina(rows);
  const weak = weakFocus(rows);
  const series = dailySeries(rows, from, to);
  const max = Math.max(...series.map((d) => d.answered), 1);

  return (
    <section aria-labelledby="q-perf-title" className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="q-perf-title" className="text-[18px] font-semibold tracking-[-0.015em] text-fg">
            Questões
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-3">
            Respostas no banco de questões, últimos {periodLabel} ({shortDate(from, today)} a{" "}
            {shortDate(to, today)})
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/questoes">
            <ListChecks />
            Resolver questões
          </Link>
        </Button>
      </div>

      {s.answered === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong px-6 py-10 text-center">
          <p className="text-[14px] font-medium text-fg">Nenhuma questão resolvida neste período</p>
          <p className="mx-auto mt-1.5 max-w-[440px] text-[13.5px] leading-relaxed text-fg-2">
            Resolva questões no banco e aqui aparecem o acerto por disciplina, a evolução por dia e os
            assuntos que pedem revisão.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
            <Kpi
              label="Resolvidas"
              value={n(s.answered)}
              sub={prev.answered ? `${n(prev.answered)} no período anterior` : undefined}
            />
            <Kpi
              label="Acerto"
              value={pct(s.rate)}
              valueClass={toneText[rateTone(s.rate)]}
              sub={
                prev.rate !== null && s.rate !== null
                  ? `${s.rate >= prev.rate ? "+" : "−"}${Math.abs(Math.round((s.rate - prev.rate) * 100))} p.p. sobre o anterior`
                  : undefined
              }
            />
            <Kpi label="Certas · erradas" value={`${n(s.correct)} · ${n(s.answered - s.correct)}`} />
            <Kpi label="Dias com questões" value={n(s.days)} />
          </dl>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card aria-labelledby="q-daily-title">
              <h3 id="q-daily-title" className="text-[15px] font-semibold text-fg">
                Questões por dia
              </h3>
              <p className="mt-0.5 flex flex-wrap gap-x-4 text-[12.5px] text-fg-3">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-success" aria-hidden /> Certas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-danger/70" aria-hidden /> Erradas
                </span>
              </p>
              <div
                role="img"
                aria-label={`Questões por dia: ${n(s.answered)} resolvidas em ${s.days} dias`}
                className={cn("mt-4 flex h-[150px] items-end", series.length > 45 ? "gap-[2px]" : "gap-1")}
              >
                {series.map((d) => {
                  const wrong = d.answered - d.correct;
                  return (
                    <div
                      key={d.day}
                      title={`${shortDate(d.day, today)}: ${d.answered} (${d.correct} certas)`}
                      className="flex h-full min-w-0 flex-1 flex-col justify-end gap-[2px]"
                    >
                      {wrong > 0 && (
                        <span
                          className="rounded-t-[3px] bg-danger/70"
                          style={{ height: `${(wrong / max) * 100}%` }}
                        />
                      )}
                      {d.correct > 0 && (
                        <span
                          className={cn("bg-success", wrong > 0 ? "" : "rounded-t-[3px]")}
                          style={{ height: `${(d.correct / max) * 100}%` }}
                        />
                      )}
                      {d.answered === 0 && <span className="h-[2px] rounded-full bg-surface-3" />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[11.5px] text-fg-3">
                <span>{shortDate(from, today)}</span>
                <span>{shortDate(to, today)}</span>
              </div>
            </Card>

            <Card aria-labelledby="q-weak-title">
              <h3 id="q-weak-title" className="flex items-center gap-2 text-[15px] font-semibold text-fg">
                <TriangleAlert className="size-4 text-warning" aria-hidden />
                Para reforçar
              </h3>
              <p className="mt-0.5 text-[12.5px] text-fg-3">
                {weak.level === "assunto" ? "Assuntos" : "Disciplinas"} com menor acerto, com ao menos 3
                respostas
              </p>
              {weak.items.length === 0 ? (
                <p className="mt-4 text-[13.5px] leading-relaxed text-fg-2">
                  Nada com erros recorrentes neste período.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {weak.items.map((w) => (
                    <li key={`${w.area}${w.disciplina}${w.assunto}`}>
                      <Link
                        href={filterHref({
                          area: w.area,
                          disciplina: w.disciplina,
                          ...(w.assunto ? { assunto: w.assunto } : {}),
                        })}
                        className="group flex items-center gap-3 py-2.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] text-fg group-hover:underline">
                            {w.assunto ?? w.disciplina}
                          </span>
                          <span className="block truncate text-[12px] text-fg-3">
                            {w.assunto ? `${w.disciplina} · ` : ""}
                            {areaLabel(w.area)}
                          </span>
                        </span>
                        <span
                          className={cn("text-[13px] font-semibold tabular-nums", toneText[rateTone(w.rate)])}
                        >
                          {pct(w.rate)}
                        </span>
                        <span className="w-12 text-right text-[12px] text-fg-3 tabular-nums">
                          {w.correct}/{w.answered}
                        </span>
                        <ChevronRight className="size-4 text-fg-3" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card aria-labelledby="q-disc-title">
            <h3 id="q-disc-title" className="text-[15px] font-semibold text-fg">
              Acerto por disciplina
            </h3>
            <p className="mt-0.5 text-[12.5px] text-fg-3">
              Verde a partir de 70%, âmbar de 50% a 69%, vermelho abaixo de 50%
            </p>
            <table className="mt-4 w-full text-[13.5px]">
              <thead className="sr-only">
                <tr>
                  <th>Disciplina</th>
                  <th>Acerto</th>
                  <th>Certas de resolvidas</th>
                </tr>
              </thead>
              <tbody>
                {disc.map((d) => {
                  const tone = rateTone(d.rate);
                  return (
                    <tr key={d.disciplina} className="border-t border-border first:border-t-0">
                      <td className="py-2.5 pr-3">
                        <span className="block truncate text-fg">{d.disciplina}</span>
                        <span
                          className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-3"
                          aria-hidden
                        >
                          <span
                            className={cn("block h-full rounded-full", toneBar[tone])}
                            style={{ width: `${Math.max(2, (d.rate ?? 0) * 100)}%` }}
                          />
                        </span>
                      </td>
                      <td className={cn("w-14 py-2.5 text-right font-semibold tabular-nums", toneText[tone])}>
                        {pct(d.rate)}
                      </td>
                      <td className="w-20 py-2.5 text-right text-[12.5px] text-fg-3 tabular-nums">
                        {n(d.correct)}/{n(d.answered)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-surface-1 px-4 py-3.5">
      <dt className="text-[12.5px] text-fg-3">{label}</dt>
      <dd
        className={cn(
          "mt-1.5 text-[20px] leading-tight font-semibold tracking-[-0.015em] text-fg tabular-nums",
          valueClass,
        )}
      >
        {value}
      </dd>
      {sub && <dd className="mt-1.5 text-[12px] text-fg-3">{sub}</dd>}
    </div>
  );
}

/** Cartão do painel: questões de hoje e dos últimos 7 dias. */
export function QuestionsTodayCard({ rows, today, from }: { rows: QRow[]; today: string; from: string }) {
  const t = questionSummary(rows, today, today);
  const w = questionSummary(rows, from, today);
  const series = dailySeries(rows, from, today);
  const max = Math.max(...series.map((d) => d.answered), 1);
  const weak = weakFocus(rows, 1).items[0];
  return (
    <Card aria-labelledby="questions-title" className="flex flex-col">
      <CardHeader
        id="questions-title"
        icon={ListChecks}
        title="Questões"
        sub="Hoje e últimos 7 dias"
        action={
          <Link
            href="/questoes"
            aria-label="Abrir banco de questões"
            className="-mr-1.5 flex size-8 items-center justify-center rounded-lg text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <ChevronRight className="size-[18px]" />
          </Link>
        }
      />
      <div className="mt-4 grid grid-cols-[1fr_1fr_auto] items-end gap-4">
        <div>
          <p className="text-[12.5px] text-fg-3">Hoje</p>
          <p className="mt-1 text-[22px] leading-none font-bold text-fg tabular-nums">{n(t.answered)}</p>
          <p className={cn("mt-1 text-[12.5px] font-medium tabular-nums", toneText[rateTone(t.rate)])}>
            {t.rate === null ? "sem respostas" : `${pct(t.rate)} de acerto`}
          </p>
        </div>
        <div>
          <p className="text-[12.5px] text-fg-3">7 dias</p>
          <p className="mt-1 text-[22px] leading-none font-bold text-fg tabular-nums">{n(w.answered)}</p>
          <p className={cn("mt-1 text-[12.5px] font-medium tabular-nums", toneText[rateTone(w.rate)])}>
            {w.rate === null ? "sem respostas" : `${pct(w.rate)} de acerto`}
          </p>
        </div>
        <div className="flex h-12 items-end gap-1 lg:hidden" aria-hidden>
          {series.map((d) => (
            <span
              key={d.day}
              className={cn("w-2 rounded-t-[2px]", d.answered ? "bg-accent" : "bg-surface-3")}
              style={{ height: `${d.answered ? Math.max(12, (d.answered / max) * 100) : 8}%` }}
            />
          ))}
        </div>
      </div>
      {weak && (
        <Link
          href={filterHref({
            area: weak.area,
            disciplina: weak.disciplina,
            ...(weak.assunto ? { assunto: weak.assunto } : {}),
          })}
          className="mt-4 flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2.5 text-[13px] text-fg hover:bg-warning/15"
        >
          <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            Reforce <strong className="font-semibold">{weak.assunto ?? weak.disciplina}</strong>:{" "}
            {pct(weak.rate)} de acerto
          </span>
          <ChevronRight className="size-4 shrink-0 text-fg-3" aria-hidden />
        </Link>
      )}
      <div className="mt-auto pt-5">
        <Button asChild className="w-full">
          <Link href="/questoes">
            <Play />
            {t.answered ? "Continuar resolvendo" : "Resolver questões"}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
