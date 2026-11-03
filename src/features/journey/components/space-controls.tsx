"use client";

import { useOptimistic, useState, useTransition } from "react";
import { LogOut, MoreHorizontal, Pencil, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { renameCoupleAction, setAchievementSharedAction, updateSharingAction } from "../actions";
import type { Achievement, Sharing } from "../queries";
import { LeaveDialog } from "./setup";

export function SpaceMenu({ id, name, partnerName }: { id: string; name: string; partnerName: string }) {
  const [rename, setRename] = useState(false);
  const [leave, setLeave] = useState(false);
  return (
    <>
      <Menu>
        <MenuTrigger
          aria-label="Opções do espaço"
          className="flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-3 outline-none hover:bg-surface-2 hover:text-fg data-[state=open]:bg-surface-2"
        >
          <MoreHorizontal className="size-4" />
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem onSelect={() => setRename(true)}>
            <Pencil />
            Renomear espaço
          </MenuItem>
          <MenuSeparator />
          <MenuItem destructive onSelect={() => setLeave(true)}>
            <LogOut />
            Sair do espaço…
          </MenuItem>
        </MenuContent>
      </Menu>
      <RenameDialog open={rename} onOpenChange={setRename} id={id} name={name} />
      <LeaveDialog open={leave} onOpenChange={setLeave} partnerName={partnerName} />
    </>
  );
}

function RenameDialog({
  open,
  onOpenChange,
  id,
  name,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  id: string;
  name: string;
}) {
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) setValue(name);
      }}
    >
      <DialogContent title="Renomear espaço">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              setError(null);
              const res = await renameCoupleAction({ id, name: value });
              if (!res.ok) return setError(res.message);
              toast.success("Nome salvo");
              onOpenChange(false);
            });
          }}
          noValidate
        >
          <DialogBody>
            <Field label="Nome" error={error ?? undefined}>
              {(p) => (
                <Input {...p} value={value} onChange={(e) => setValue(e.target.value)} maxLength={60} />
              )}
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={pending}>
              Salvar nome
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const SHARING_ITEMS: { key: keyof Sharing; label: string; detail: string }[] = [
  {
    key: "share_study_time",
    label: "Tempo de estudo",
    detail: "Horas por dia, semana e mês, calendário, sequência e progresso nos desafios.",
  },
  {
    key: "share_subject_breakdown",
    label: "Matérias",
    detail: "Nomes e cores das suas matérias e as horas em cada uma.",
  },
  {
    key: "share_goal_progress",
    label: "Metas pessoais",
    detail: "O progresso das suas metas no dia, semana ou mês atual.",
  },
];

/** O que eu compartilho (editável) e o que a outra pessoa compartilha (somente leitura). */
export function PrivacySettings({
  mine,
  partner,
  partnerName,
}: {
  mine: Sharing;
  partner: Sharing;
  partnerName: string;
}) {
  const [, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic(mine, (cur, patch: Partial<Sharing>) => ({
    ...cur,
    ...patch,
  }));
  const toggle = (key: keyof Sharing) =>
    startTransition(async () => {
      const next = !state[key];
      setOptimistic({ [key]: next });
      const res = await updateSharingAction({ [key]: next });
      if (!res.ok) toast.error(res.message);
      else toast.success(next ? "Agora compartilhado" : "Deixou de ser compartilhado");
    });
  const partnerShared = SHARING_ITEMS.filter((i) => partner[i.key]).map((i) => i.label.toLowerCase());

  return (
    <section aria-labelledby="privacy-title">
      <h2 id="privacy-title" className="text-[14px] font-semibold text-fg">
        Privacidade
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-fg-2">
        Anotações, diário, revisões e sessões detalhadas nunca são compartilhados. Você escolhe o resto.
      </p>
      <ul className="mt-3 divide-y divide-border">
        {SHARING_ITEMS.map((item) => (
          <li key={item.key} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
              <p id={`share-${item.key}`} className="text-[13.5px] text-fg">
                {item.label}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-3">{item.detail}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state[item.key]}
              aria-labelledby={`share-${item.key}`}
              onClick={() => toggle(item.key)}
              className={cn(
                "relative mt-0.5 inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border transition-colors",
                state[item.key] ? "border-accent bg-accent" : "border-border-strong bg-surface-3",
              )}
            >
              <span
                className={cn(
                  "inline-block size-4 rounded-full bg-white shadow transition-transform",
                  state[item.key] ? "translate-x-[18px]" : "translate-x-[2px]",
                )}
              />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12.5px] text-fg-3">
        {partnerShared.length
          ? `${partnerName} compartilha com você: ${partnerShared.join(", ")}.`
          : `${partnerName} ainda não compartilha nada com você.`}
      </p>
    </section>
  );
}

/** Conquistas: as minhas (com opção de compartilhar) e as que a outra pessoa compartilhou. */
export function AchievementsList({
  items,
  meId,
  partnerName,
  canShare,
  todayISO,
}: {
  items: Achievement[];
  meId: string;
  partnerName?: string;
  canShare: boolean;
  todayISO: string;
}) {
  const mine = items.filter((a) => a.user_id === meId);
  const theirs = items.filter((a) => a.user_id !== meId);
  return (
    <div className="flex flex-col gap-6">
      <div>
        {partnerName && <h3 className="mb-1 text-[13px] font-medium text-fg-2">Suas</h3>}
        {mine.length === 0 ? (
          <p className="text-[13.5px] text-fg-2">
            Registre sessões para conquistar marcas como a primeira sessão, 7 dias seguidos e 10 horas de
            estudo.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {mine.map((a) => (
              <AchievementRow key={a.id} a={a} canShare={canShare} todayISO={todayISO} />
            ))}
          </ul>
        )}
      </div>
      {partnerName && (
        <div>
          <h3 className="mb-1 text-[13px] font-medium text-fg-2">De {partnerName}</h3>
          {theirs.length === 0 ? (
            <p className="text-[13.5px] text-fg-2">Nenhuma conquista compartilhada ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {theirs.map((a) => (
                <AchievementRow key={a.id} a={a} canShare={false} todayISO={todayISO} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function AchievementRow({ a, canShare, todayISO }: { a: Achievement; canShare: boolean; todayISO: string }) {
  const [pending, startTransition] = useTransition();
  const [shared, setShared] = useOptimistic(a.is_shared);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-warning"
        aria-hidden
      >
        <Trophy className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] text-fg">{a.title}</span>
        <span className="block text-[12px] text-fg-3">{shortDate(a.achieved_on, todayISO)}</span>
      </span>
      {canShare && (
        <Button
          variant={shared ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={shared}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setShared(!shared);
              const res = await setAchievementSharedAction(a.id, !shared);
              if (!res.ok) toast.error(res.message);
            })
          }
        >
          {shared ? "Compartilhada" : "Compartilhar"}
        </Button>
      )}
    </li>
  );
}
