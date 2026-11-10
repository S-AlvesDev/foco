"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CircleAlert, CircleCheck, FileJson, ImageUp, TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { plural } from "@/lib/format";
import { checkLibraryImport, layoutBlock, topicLabel, type Block, type ImportCheck } from "../model";
import {
  finishImportAction,
  importBlocksAction,
  importStructureAction,
  previewImportAction,
  type ImportPreview,
} from "../actions";
import { BlockBody } from "./blocks";

type Ready = Extract<ImportCheck, { ok: true }>;
type Report = {
  topics: number;
  blocks: number;
  created: number;
  changed: number;
  unchanged: number;
  marksMoved: number;
  marksReview: number;
  archivedTopics: number;
  images: number;
  errors: { where: string; message: string }[];
};

const MAX_PART = 800_000; // abaixo do limite de envio do servidor

export function LibraryImportView() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [check, setCheck] = useState<ImportCheck | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [readError, setReadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  const read = async (files: FileList | null) => {
    if (!files?.length) return;
    setReadError(null);
    setReport(null);
    setPreview(null);
    const list = Array.from(files);
    const jsons = list.filter((f) => f.name.toLowerCase().endsWith(".json"));
    const imgs = list.filter((f) => /^image\//.test(f.type));
    if (jsons.length > 1)
      return setReadError("Envie um arquivo .json por vez (uma disciplina ou um conjunto de capítulos).");
    if (imgs.length)
      setImages((prev) => [...prev.filter((p) => !imgs.some((i) => i.name === p.name)), ...imgs]);
    if (!jsons.length) return;
    const f = jsons[0];
    if (f.size > 60 * 1024 * 1024) return setReadError(`${f.name} tem mais de 60 MB.`);
    let data: unknown;
    try {
      data = JSON.parse(await f.text());
    } catch {
      return setReadError(`${f.name} não é um JSON válido.`);
    }
    const c = checkLibraryImport(data);
    setFileName(f.name);
    setCheck(c);
    if (c.ok) {
      const tooBig = c.topics.find((t) => JSON.stringify(t.blocks).length > MAX_PART);
      if (tooBig) {
        setCheck({
          ok: false,
          issues: [
            {
              path: topicLabel({ number: tooBig.numero, title: tooBig.titulo }),
              message: "tópico grande demais para um envio; divida em subtópicos",
            },
          ],
        });
        return;
      }
      try {
        const p = await previewImportAction({
          disciplineId: c.data.disciplina.id,
          topicIds: c.topics.map((t) => t.id),
          blocks: c.topics.flatMap((t) => t.blocks.map((b) => ({ id: b.id, topicId: t.id }))),
          mode: c.data.modo,
          chapterIds: c.data.capitulos.map((ch) => ch.id),
        });
        setPreview(p);
      } catch {
        setPreview({ ok: false, message: "Sem conexão para comparar com o que já existe." });
      }
    }
  };

  const ready = check?.ok ? (check as Ready) : null;
  const missingImages = ready ? ready.stats.images.filter((n) => !images.some((i) => i.name === n)) : [];
  const blocked = preview?.ok && preview.takenBlocks.length > 0;

  const run = async () => {
    if (!ready) return;
    const errors: Report["errors"] = [];
    const rep: Report = {
      topics: 0,
      blocks: 0,
      created: 0,
      changed: 0,
      unchanged: 0,
      marksMoved: 0,
      marksReview: 0,
      archivedTopics: 0,
      images: 0,
      errors,
    };
    const disc = ready.data.disciplina.id;
    try {
      // 1. imagens
      const used = images.filter((i) => ready.stats.images.includes(i.name));
      if (used.length) {
        const supabase = createClient();
        for (let i = 0; i < used.length; i++) {
          setProgress({ label: "Enviando imagens", done: i, total: used.length });
          const file = used[i];
          const { error } = await supabase.storage
            .from("library")
            .upload(`${disc}/${file.name}`, file, { upsert: true, contentType: file.type });
          if (error) errors.push({ where: `imagem ${file.name}`, message: error.message });
          else rep.images++;
        }
      }
      // 2. estrutura
      setProgress({ label: "Criando capítulos e tópicos", done: 0, total: 1 });
      const s = await importStructureAction(ready.structure, ready.data.modo);
      if (!s.ok) {
        errors.push({ where: "estrutura", message: s.message });
        setReport(rep);
        return;
      }
      rep.archivedTopics = s.archivedTopics;
      // 3. conteúdo, tópico a tópico
      for (let i = 0; i < ready.topics.length; i++) {
        const t = ready.topics[i];
        setProgress({ label: "Enviando conteúdo", done: i, total: ready.topics.length });
        let r: Awaited<ReturnType<typeof importBlocksAction>>;
        try {
          r = await importBlocksAction(t.id, t.blocks);
        } catch {
          r = { ok: false, message: "falha de conexão" };
        }
        if (!r.ok) {
          errors.push({ where: topicLabel({ number: t.numero, title: t.titulo }), message: r.message });
          continue;
        }
        rep.topics++;
        rep.blocks += r.blocks;
        rep.created += r.created;
        rep.changed += r.changed;
        rep.unchanged += r.unchanged;
        rep.marksMoved += r.marksMoved;
        rep.marksReview += r.marksReview;
      }
      setReport(rep);
      await finishImportAction();
      if (!errors.length) toast.success("Material importado");
      router.refresh();
    } finally {
      setProgress(null);
    }
  };

  const sample = ready?.topics.find((t) => t.blocks.length);

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void read(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors",
          drag ? "border-accent bg-accent-subtle" : "border-border-strong bg-surface-1",
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2 text-steel">
          <FileJson className="size-5" />
        </span>
        <p className="mt-3 text-[15px] font-semibold text-fg">Escolher o arquivo .json da disciplina</p>
        <p className="mt-1 max-w-[440px] text-[13px] text-fg-2">
          Junto, dá para escolher as imagens citadas no arquivo. Nada é salvo antes de você confirmar.
        </p>
        <input
          ref={input}
          type="file"
          accept=".json,application/json,image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          multiple
          className="sr-only"
          onChange={(e) => {
            void read(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => input.current?.click()}
          disabled={Boolean(progress)}
        >
          <Upload />
          Escolher arquivos
        </Button>
      </div>

      {readError && <Notice tone="error">{readError}</Notice>}

      {check && !check.ok && (
        <section className="rounded-2xl border border-danger/40 bg-danger-subtle px-4 py-3.5">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-danger">
            <CircleAlert className="size-4" />
            {fileName}: {plural(check.issues.length, "problema", "problemas")} — nada foi importado
          </p>
          <ul className="mt-2 flex max-h-[360px] flex-col gap-1.5 overflow-y-auto text-[13px]">
            {check.issues.map((i, k) => (
              <li key={k} className="text-fg-2">
                <span className="text-fg">{i.path || "arquivo"}:</span> {i.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {ready && (
        <section aria-label="Prévia" className="rounded-2xl border border-border bg-surface-1 p-4 sm:p-5">
          <p className="text-[12.5px] text-fg-3">
            {fileName} · {ready.data.concurso.nome} ·{" "}
            {ready.data.modo === "disciplina" ? "disciplina completa" : "só os capítulos do arquivo"}
          </p>
          <h2 className="mt-1 text-[18px] font-semibold text-fg">{ready.data.disciplina.nome}</h2>
          <p className="mt-1 text-[13.5px] text-fg-2">
            {plural(ready.stats.chapters, "capítulo", "capítulos")} ·{" "}
            {plural(ready.stats.topics, "tópico", "tópicos")} ·{" "}
            {plural(ready.stats.blocks, "bloco", "blocos")} ·{" "}
            {plural(ready.data.fontes.length, "fonte", "fontes")}
          </p>

          {preview && !preview.ok && (
            <Notice tone="error" className="mt-3">
              {preview.message}
            </Notice>
          )}
          {preview?.ok && (
            <ul className="mt-3 flex flex-col gap-1 text-[13px] text-fg-2">
              <li className="flex items-center gap-2">
                <CircleCheck className="size-4 text-success" />
                {preview.exists ? "Atualização de uma disciplina que já existe" : "Disciplina nova"}:{" "}
                {preview.newTopics} tópicos novos, {preview.existingTopics} atualizados
              </li>
              {preview.toArchive.length > 0 && (
                <li className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                  <span>
                    {plural(preview.toArchive.length, "tópico sai", "tópicos saem")} da biblioteca (ficam
                    arquivados, sem apagar marcações):{" "}
                    {preview.toArchive
                      .slice(0, 6)
                      .map((t) => t.title)
                      .join(", ")}
                    {preview.toArchive.length > 6 ? "…" : ""}
                  </span>
                </li>
              )}
              {preview.exists && preview.marksOnDiscipline > 0 && (
                <li className="flex items-start gap-2">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  {plural(
                    preview.marksOnDiscipline,
                    "marcação/anotação existente é preservada",
                    "marcações/anotações existentes são preservadas",
                  )}
                  ; trechos que mudarem de texto são reposicionados ou ficam “para revisar”.
                </li>
              )}
              {preview.takenBlocks.length > 0 && (
                <li className="flex items-start gap-2 text-danger">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  Blocos com id já usado em outro tópico:{" "}
                  {preview.takenBlocks
                    .slice(0, 5)
                    .map((b) => `${b.id} (em ${b.topicId})`)
                    .join(", ")}
                  . Corrija os ids.
                </li>
              )}
            </ul>
          )}

          {ready.warnings.length > 0 && (
            <details className="mt-3 text-[13px]">
              <summary className="cursor-pointer text-warning">
                {plural(ready.warnings.length, "aviso", "avisos")} (não impedem a importação)
              </summary>
              <ul className="mt-1.5 flex flex-col gap-1 text-fg-2">
                {ready.warnings.slice(0, 40).map((w, i) => (
                  <li key={i}>
                    {w.path}: {w.message}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {ready.stats.images.length > 0 && (
            <p className="mt-3 flex items-start gap-2 text-[13px] text-fg-2">
              <ImageUp className="mt-0.5 size-4 shrink-0 text-steel" />
              {plural(ready.stats.images.length, "imagem citada", "imagens citadas")};{" "}
              {missingImages.length
                ? `faltam escolher ${missingImages.slice(0, 4).join(", ")}${missingImages.length > 4 ? "…" : ""} (se já foram enviadas antes, pode seguir)`
                : "todas escolhidas"}
              .
            </p>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-[13.5px] font-medium text-fg">Estrutura</summary>
            <ol className="mt-2 flex flex-col gap-2 text-[13px]">
              {ready.data.capitulos.map((c) => (
                <li key={c.id}>
                  <p className="font-medium text-fg">
                    {c.numero ? `${c.numero}. ` : ""}
                    {c.titulo}
                  </p>
                  <ul className="mt-0.5 text-fg-2">
                    {ready.topics
                      .filter((t) => t.chapterId === c.id)
                      .map((t) => (
                        <li key={t.id} style={{ paddingLeft: 12 + t.depth * 14 }}>
                          {topicLabel({ number: t.numero, title: t.titulo })}{" "}
                          <span className="text-fg-3">({t.blocks.length})</span>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ol>
          </details>

          {sample && (
            <details className="mt-3">
              <summary className="cursor-pointer text-[13.5px] font-medium text-fg">
                Prévia do conteúdo: {sample.titulo}
              </summary>
              <div className="apostila mt-3 flex max-h-[420px] flex-col gap-4 overflow-y-auto rounded-xl border border-border p-4">
                {sample.blocks.slice(0, 12).map((b) => {
                  const { layout } = layoutBlock({ id: b.id, kind: b.tipo, data: b.dados } as Block);
                  return (
                    <div key={b.id}>
                      <BlockBody layout={layout} ranges={[]} />
                    </div>
                  );
                })}
              </div>
            </details>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
            {progress && (
              <span className="text-[13px] text-fg-2 tabular-nums">
                {progress.label}… {progress.done}/{progress.total}
              </span>
            )}
            <Button
              variant="primary"
              onClick={() => void run()}
              loading={Boolean(progress)}
              disabled={Boolean(blocked) || !preview?.ok}
            >
              <Upload />
              Confirmar importação
            </Button>
          </div>
        </section>
      )}

      {report && (
        <section
          aria-live="polite"
          className={cn(
            "rounded-2xl border px-4 py-3.5",
            report.errors.length
              ? "border-warning/40 bg-warning/[0.06]"
              : "border-success/40 bg-success/[0.06]",
          )}
        >
          <p className="flex items-center gap-2 text-[14px] font-semibold text-fg">
            {report.errors.length ? (
              <TriangleAlert className="size-4 text-warning" />
            ) : (
              <CircleCheck className="size-4 text-success" />
            )}
            {report.errors.length ? "Importação concluída com problemas" : "Importação concluída"}
          </p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-2">
            {plural(report.topics, "tópico", "tópicos")} e {plural(report.blocks, "bloco", "blocos")}:{" "}
            {report.created} novos, {report.changed} alterados, {report.unchanged} sem mudança.
            {report.archivedTopics
              ? ` ${plural(report.archivedTopics, "tópico arquivado", "tópicos arquivados")}.`
              : ""}
            {report.images ? ` ${plural(report.images, "imagem enviada", "imagens enviadas")}.` : ""}
            {report.marksMoved
              ? ` ${plural(report.marksMoved, "marcação reposicionada", "marcações reposicionadas")}.`
              : ""}
            {report.marksReview
              ? ` ${plural(report.marksReview, "marcação ficou", "marcações ficaram")} para revisar.`
              : ""}
          </p>
          {report.errors.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 text-[13px]">
              {report.errors.map((e, i) => (
                <li key={i} className="text-fg-2">
                  <span className="text-fg">{e.where}:</span> {e.message}
                </li>
              ))}
            </ul>
          )}
          {ready && (
            <Button asChild variant="secondary" className="mt-3">
              <Link href={`/biblioteca/${encodeURIComponent(ready.data.disciplina.id)}`}>
                Abrir a disciplina
              </Link>
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
