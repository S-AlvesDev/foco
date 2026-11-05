"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CircleAlert, CircleCheck, FileJson, Flag, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/lib/utils";
import { claimAdminAction, importChunkAction, resolveReportAction } from "../actions";
import { areaLabel, checkImport, REPORT_CATEGORIES, type ImportCheck, type ImportItem } from "../model";
import type { OpenReport } from "../queries";

/** Partes de até 200 questões e ~700 KB, abaixo do limite de envio do servidor. */
function chunk(items: ImportItem[]) {
  const out: ImportItem[][] = [];
  let cur: ImportItem[] = [];
  let size = 0;
  for (const it of items) {
    const s = JSON.stringify(it).length;
    if (cur.length > 0 && (cur.length >= 200 || size + s > 700_000)) {
      out.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(it);
    size += s;
  }
  if (cur.length) out.push(cur);
  return out;
}

type Loaded = { names: string[]; check: ImportCheck };
type Done = {
  inserted: number;
  updated: number;
  unchanged: number;
  errors: { id: string; message: string }[];
};

export function ImportView() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  const read = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setReadError(null);
    setDone(null);
    setFatal(null);
    const merged: ImportCheck = { valid: [], invalid: [], duplicates: [] };
    const names: string[] = [];
    const seen = new Set<string>();
    for (const file of Array.from(files)) {
      if (file.size > 60 * 1024 * 1024) {
        setReadError(`${file.name} tem mais de 60 MB. Divida em arquivos menores.`);
        return;
      }
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        setReadError(`${file.name} não é um JSON válido.`);
        return;
      }
      const c = checkImport(data);
      names.push(file.name);
      for (const v of c.valid) {
        if (seen.has(v.id)) merged.duplicates.push(v.id);
        else {
          seen.add(v.id);
          merged.valid.push(v);
        }
      }
      merged.invalid.push(...c.invalid.map((i) => ({ ...i, id: i.id || `${file.name} #${i.index + 1}` })));
      merged.duplicates.push(...c.duplicates);
    }
    setLoaded({ names, check: merged });
  };

  const run = async () => {
    if (!loaded) return;
    const parts = chunk(loaded.check.valid);
    const acc: Done = { inserted: 0, updated: 0, unchanged: 0, errors: [] };
    setProgress({ sent: 0, total: loaded.check.valid.length });
    setFatal(null);
    let sent = 0;
    for (const part of parts) {
      const r = await importChunkAction(part);
      if (!r.ok) {
        setFatal(
          `${r.message} ${sent > 0 ? `As primeiras ${sent} foram enviadas; importar de novo continua sem duplicar.` : ""}`,
        );
        setProgress(null);
        if (sent > 0) setDone(acc);
        router.refresh();
        return;
      }
      acc.inserted += r.inserted;
      acc.updated += r.updated;
      acc.unchanged += r.unchanged;
      acc.errors.push(...r.errors);
      sent += part.length;
      setProgress({ sent, total: loaded.check.valid.length });
    }
    setProgress(null);
    setDone(acc);
    setLoaded(null);
    if (input.current) input.current.value = "";
    toast.success(`${(acc.inserted + acc.updated).toLocaleString("pt-BR")} questões gravadas`);
    router.refresh();
  };

  const c = loaded?.check;
  const byArea = new Map<string, number>();
  const byDisc = new Map<string, number>();
  for (const v of c?.valid ?? []) {
    byArea.set(v.area, (byArea.get(v.area) ?? 0) + 1);
    byDisc.set(v.disciplina, (byDisc.get(v.disciplina) ?? 0) + 1);
  }

  return (
    <section
      aria-labelledby="import-title"
      className="mt-7 rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-6"
    >
      <h2 id="import-title" className="text-[16px] font-semibold text-fg">
        Enviar lote
      </h2>
      <p className="mt-1 text-[13.5px] leading-relaxed text-fg-2">
        Arquivo .json com a lista de questões no formato do Alpha-20K. Questões novas entram, as que mudaram
        são atualizadas pelo id e as iguais são ignoradas, então importar o mesmo arquivo de novo não duplica
        nada.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          read(e.dataTransfer.files);
        }}
        className={cn(
          "mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-9 text-center transition-colors",
          drag
            ? "border-accent bg-accent-subtle"
            : "border-border-strong hover:border-accent/60 hover:bg-surface-2/60",
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent-subtle text-accent">
          <FileJson className="size-5" aria-hidden />
        </span>
        <span className="text-[14px] font-semibold text-fg">Escolher arquivos .json</span>
        <span className="text-[12.5px] text-fg-3">
          ou arraste para cá. Dá para enviar vários lotes juntos.
        </span>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          multiple
          className="sr-only"
          onChange={(e) => read(e.target.files)}
          disabled={!!progress}
        />
      </label>

      {readError && (
        <Notice tone="error" className="mt-4">
          {readError}
        </Notice>
      )}

      {c && (
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
            <span className="text-fg-2">
              {loaded!.names.length === 1 ? "Arquivo" : "Arquivos"}:{" "}
              <span className="font-medium text-fg">{loaded!.names.join(", ")}</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Count label="Prontas para importar" n={c.valid.length} tone="good" />
            <Count label="Com problema" n={c.invalid.length} tone={c.invalid.length ? "bad" : undefined} />
            <Count
              label="Repetidas no arquivo"
              n={c.duplicates.length}
              tone={c.duplicates.length ? "warn" : undefined}
            />
          </div>
          {byArea.size > 0 && (
            <p className="text-[13px] leading-relaxed text-fg-2">
              {[...byArea].map(([a, n]) => `${areaLabel(a)}: ${n}`).join(" · ")} · {byDisc.size}{" "}
              {byDisc.size === 1 ? "disciplina" : "disciplinas"}
            </p>
          )}
          {c.invalid.length > 0 && (
            <details className="rounded-xl border border-danger/25 bg-danger-subtle px-4 py-3 text-[13px]">
              <summary className="cursor-pointer font-medium text-fg">
                Ver as {c.invalid.length} questões com problema (não serão importadas)
              </summary>
              <ul className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto">
                {c.invalid.slice(0, 200).map((i, k) => (
                  <li key={k} className="text-fg-2">
                    <span className="font-mono text-fg">{i.id || `#${i.index + 1}`}</span> — {i.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {c.duplicates.length > 0 && (
            <p className="text-[12.5px] text-fg-3">
              Repetidas: só a primeira ocorrência de {c.duplicates.slice(0, 8).join(", ")}
              {c.duplicates.length > 8 ? "…" : ""} será usada.
            </p>
          )}

          {progress ? (
            <div aria-live="polite">
              <div className="flex justify-between text-[13px] text-fg-2">
                <span>Enviando…</span>
                <span className="tabular-nums">
                  {progress.sent.toLocaleString("pt-BR")} de {progress.total.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-(image:--accent-fill) transition-[width] duration-300"
                  style={{ width: `${(progress.sent / Math.max(progress.total, 1)) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setLoaded(null);
                  if (input.current) input.current.value = "";
                }}
              >
                Cancelar
              </Button>
              <Button variant="primary" size="lg" disabled={c.valid.length === 0} onClick={run}>
                <Upload />
                Importar {c.valid.length.toLocaleString("pt-BR")}{" "}
                {c.valid.length === 1 ? "questão" : "questões"}
              </Button>
            </div>
          )}
        </div>
      )}

      {fatal && (
        <Notice tone="error" className="mt-4">
          {fatal}
        </Notice>
      )}

      {done && (
        <div className="mt-5 rounded-xl border border-success/30 bg-success/8 px-4 py-4" role="status">
          <p className="flex items-center gap-2 text-[14.5px] font-semibold text-fg">
            <CircleCheck className="size-4 text-success" aria-hidden />
            Importação concluída
          </p>
          <p className="mt-1 text-[13.5px] text-fg-2">
            {done.inserted.toLocaleString("pt-BR")} novas · {done.updated.toLocaleString("pt-BR")} atualizadas
            · {done.unchanged.toLocaleString("pt-BR")} já estavam iguais
            {done.errors.length > 0 && ` · ${done.errors.length} recusadas pelo banco`}
          </p>
          {done.errors.length > 0 && (
            <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto text-[13px] text-fg-2">
              {done.errors.slice(0, 200).map((e, k) => (
                <li key={k}>
                  <CircleAlert className="mr-1 inline size-3.5 text-danger" aria-hidden />
                  <span className="font-mono text-fg">{e.id}</span> — {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Count({ label, n, tone }: { label: string; n: number; tone?: "good" | "bad" | "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/60 px-3 py-3">
      <p
        className={cn(
          "text-[22px] leading-none font-bold tabular-nums",
          tone === "good"
            ? "text-success"
            : tone === "bad"
              ? "text-danger"
              : tone === "warn"
                ? "text-warning"
                : "text-fg",
        )}
      >
        {n.toLocaleString("pt-BR")}
      </p>
      <p className="mt-1.5 text-[12px] leading-tight text-fg-2">{label}</p>
    </div>
  );
}

export function ClaimAdmin() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface-1 p-5 shadow-card">
      <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
        <ShieldCheck className="size-5 text-accent" aria-hidden />
        Administrar o banco de questões
      </p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-2">
        A conta administradora importa os lotes e revisa os erros reportados. Só uma conta pode ter esse
        papel, e ele fica com a primeira que ativar.
      </p>
      {error && (
        <Notice tone="error" className="mt-3">
          {error}
        </Notice>
      )}
      <Button
        variant="primary"
        className="mt-4"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await claimAdminAction();
            if (!r.ok) setError(r.message);
            else {
              toast.success("Esta conta agora administra o banco de questões");
              router.refresh();
            }
          })
        }
      >
        Ativar nesta conta
      </Button>
    </div>
  );
}

export function ReportList({ reports, canResolve }: { reports: OpenReport[]; canResolve: boolean }) {
  return (
    <section
      aria-labelledby="reports-title"
      className="mt-6 rounded-2xl border border-border bg-surface-1 p-4 shadow-card sm:p-6"
    >
      <h2 id="reports-title" className="flex items-center gap-2 text-[16px] font-semibold text-fg">
        <Flag className="size-4 text-fg-3" aria-hidden />
        {canResolve ? "Erros reportados" : "Seus relatos em aberto"}
        <span className="text-[13px] font-medium text-fg-3 tabular-nums">{reports.length}</span>
      </h2>
      {reports.length === 0 ? (
        <p className="mt-2 text-[13.5px] text-fg-2">Nenhum erro reportado em aberto.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} canResolve={canResolve} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ReportRow({ report: r, canResolve }: { report: OpenReport; canResolve: boolean }) {
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] text-fg">
          <span className="font-mono font-semibold">{r.questionId}</span>
          <span className="text-fg-3"> · </span>
          {REPORT_CATEGORIES[r.category as keyof typeof REPORT_CATEGORIES] ?? r.category}
          {canResolve && r.mine && <span className="text-fg-3"> · enviado por você</span>}
        </p>
        {r.message && (
          <p className="mt-0.5 text-[13px] leading-relaxed whitespace-pre-line text-fg-2">{r.message}</p>
        )}
        <p className="mt-0.5 text-[12px] text-fg-3">
          {r.createdAt.slice(8, 10)}/{r.createdAt.slice(5, 7)}/{r.createdAt.slice(0, 4)}
        </p>
      </div>
      {canResolve && (
        <Button
          size="sm"
          variant="secondary"
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await resolveReportAction(r.id);
              if (!res.ok) toast.error(res.message);
              else toast.success("Marcado como resolvido");
            })
          }
        >
          <CircleCheck />
          Resolvido
        </Button>
      )}
    </li>
  );
}
