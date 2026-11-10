"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { stripAccents } from "@/lib/format";
import { getLinkOptionsAction, saveTopicLinksAction, type LinkOptions } from "../actions";
import { INCIDENCE_LABELS, type Incidence } from "../fsrs";

const norm = (s: string) => stripAccents(s).toLowerCase();
const words = (s: string) =>
  norm(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);

/** Administração: peso do tópico no edital e assuntos do banco de questões ligados a ele. */
export function TopicLinksDialog({
  topicId,
  topicTitle,
  disciplineName,
}: {
  topicId: string;
  topicTitle: string;
  disciplineName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<LinkOptions | null>(null);
  const [links, setLinks] = useState<{ disciplina: string; assunto: string }[]>([]);
  const [incidence, setIncidence] = useState<Incidence>("media");
  const [q, setQ] = useState("");
  const [saving, startSave] = useTransition();

  const load = async () => {
    const r = await getLinkOptionsAction(topicId);
    if (!r.ok) {
      toast.error(r.message);
      return;
    }
    setData(r);
    setLinks(r.links);
    setIncidence(r.incidence);
  };

  const key = (l: { disciplina: string; assunto: string }) => `${l.disciplina}\u0000${l.assunto}`;
  const chosen = useMemo(() => new Set(links.map(key)), [links]);

  const options = useMemo(() => {
    if (!data) return [];
    const discWords = words(disciplineName);
    const titleWords = words(topicTitle);
    const text = norm(q.trim());
    return data.subjects
      .filter((s) => !chosen.has(key(s)))
      .map((s) => {
        const sameDisc = words(s.disciplina).some((w) => discWords.includes(w)) ? 1 : 0;
        const overlap = words(s.assunto).filter((w) => titleWords.includes(w)).length;
        return { ...s, score: sameDisc * 2 + overlap * 3 };
      })
      .filter((s) => (text ? norm(`${s.disciplina} ${s.assunto}`).includes(text) : s.score >= 3))
      .sort((a, b) => b.score - a.score || a.assunto.localeCompare(b.assunto))
      .slice(0, 30);
  }, [data, q, chosen, disciplineName, topicTitle]);

  const save = () =>
    startSave(async () => {
      const r = await saveTopicLinksAction({ topicId, incidence, links });
      if (!r.ok) return void toast.error(r.message);
      toast.success("Ligações salvas.");
      setOpen(false);
      router.refresh();
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void load();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Link2 />
          Questões e peso
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Questões e peso no edital"
        description="As questões destes assuntos entram na revisão do tópico e decidem a nota."
        className="sm:w-[min(560px,calc(100vw-32px))]"
      >
        <DialogBody className="flex flex-col gap-5">
          {!data ? (
            <p className="text-[13.5px] text-fg-3">Carregando…</p>
          ) : (
            <>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-fg">Incidência no edital</p>
                <Segmented<Incidence>
                  label="Incidência no edital"
                  value={incidence}
                  onChange={setIncidence}
                  options={(["alta", "media", "baixa"] as Incidence[]).map((v) => ({
                    value: v,
                    label: INCIDENCE_LABELS[v],
                  }))}
                />
                <p className="mt-1 text-[12px] text-fg-3">
                  Alta vem antes na fila quando falta tempo; baixa, depois.
                </p>
              </div>
              <div>
                <p className="text-[13px] font-medium text-fg">Assuntos ligados ({links.length})</p>
                {links.length ? (
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {links.map((l) => (
                      <li
                        key={key(l)}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5"
                      >
                        <span className="min-w-0 text-[13.5px] text-fg">
                          {l.assunto}
                          <span className="block text-[12px] text-fg-3">{l.disciplina}</span>
                        </span>
                        <button
                          type="button"
                          aria-label={`Remover ${l.assunto}`}
                          onClick={() => setLinks((x) => x.filter((y) => key(y) !== key(l)))}
                          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-3 hover:bg-surface-2 hover:text-fg"
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[12.5px] text-fg-3">
                    Nenhum. Sem questões, a revisão usa só a autoavaliação.
                  </p>
                )}
              </div>
              <div>
                <label className="relative block">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-3" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar assunto no banco de questões"
                    className="h-10 w-full rounded-lg border border-border bg-surface-2 pr-3 pl-8 text-[15px] text-fg placeholder:text-fg-3 focus:border-accent focus:outline-none sm:text-[14px]"
                  />
                </label>
                <p className="mt-1.5 text-[12px] text-fg-3">
                  {q.trim() ? "Resultados da busca" : "Sugestões pelo nome do tópico"}
                </p>
                <ul className="mt-1 flex flex-col">
                  {options.map((s) => (
                    <li key={key(s)}>
                      <button
                        type="button"
                        onClick={() =>
                          setLinks((x) => [...x, { disciplina: s.disciplina, assunto: s.assunto }])
                        }
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
                      >
                        <Plus className="size-4 shrink-0 text-accent" />
                        <span className="min-w-0 flex-1 text-[13.5px] text-fg">
                          {s.assunto}
                          <span className="block text-[12px] text-fg-3">
                            {s.disciplina} · {s.total} {s.total === 1 ? "questão" : "questões"}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {!options.length && (
                    <li className="px-2 py-1.5 text-[12.5px] text-fg-3">
                      {q.trim() ? "Nenhum assunto encontrado." : "Sem sugestões: busque pelo assunto."}
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!data}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
