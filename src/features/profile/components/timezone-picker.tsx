"use client";

import { Command } from "cmdk";
import { Popover } from "radix-ui";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BRAZIL_ZONES,
  timeZoneName,
  timeZoneOffset,
  timeZoneOffsetMinutes,
  timeZoneRegion,
} from "@/lib/time";

type Zone = { id: string; name: string; region: string; offset: string; minutes: number };

function buildZones(): { brazil: Zone[]; others: Zone[] } {
  const now = new Date();
  const all = (Intl.supportedValuesOf?.("timeZone") ?? BRAZIL_ZONES).filter((z) => z.includes("/"));
  const toZone = (id: string): Zone => ({
    id,
    name: timeZoneName(id),
    region: timeZoneRegion(id),
    offset: timeZoneOffset(id, now),
    minutes: timeZoneOffsetMinutes(id, now),
  });
  const brazil = BRAZIL_ZONES.filter((z) => all.includes(z) || z === "America/Sao_Paulo").map(toZone);
  const others = all
    .filter((z) => !BRAZIL_ZONES.includes(z))
    .map(toZone)
    .sort((a, b) => a.minutes - b.minutes || a.name.localeCompare(b.name));
  return { brazil, others };
}

export function TimezonePicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (tz: string) => void;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const zones = useMemo(() => (open ? buildZones() : null), [open]);

  const select = (tz: string) => {
    setOpen(false);
    if (tz !== value) onChange(tz);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        className={cn(
          "flex h-9 w-full max-w-[360px] cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-left text-[14px]",
          "transition-colors hover:border-border-strong data-[state=open]:border-accent",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-fg">{timeZoneName(value)}</span>
        <span className="text-[12.5px] text-fg-3 tabular-nums">{timeZoneOffset(value)}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-fg-3" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-lg bg-surface-3 shadow-pop data-[state=open]:animate-pop"
        >
          <Command loop className="flex max-h-[min(380px,60vh)] flex-col">
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-fg-3" />
              <Command.Input
                autoFocus
                placeholder="Buscar cidade ou fuso…"
                className="h-10 w-full bg-transparent text-[14px] text-fg placeholder:text-fg-3 focus:outline-none"
              />
            </div>
            <Command.List className="overflow-y-auto overscroll-contain p-1">
              <Command.Empty className="px-3 py-6 text-center text-[13px] text-fg-3">
                Nenhum fuso encontrado.
              </Command.Empty>
              {zones && (
                <>
                  <Group heading="Brasil" zones={zones.brazil} value={value} onSelect={select} />
                  <Group heading="Outros" zones={zones.others} value={value} onSelect={select} />
                </>
              )}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Group({
  heading,
  zones,
  value,
  onSelect,
}: {
  heading: string;
  zones: Zone[];
  value: string;
  onSelect: (tz: string) => void;
}) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:text-fg-3"
    >
      {zones.map((z) => (
        <Command.Item
          key={z.id}
          value={`${z.name} ${z.id} ${z.region} ${z.offset}`}
          onSelect={() => onSelect(z.id)}
          className="flex h-8 cursor-pointer items-center gap-2 rounded-[5px] px-2 text-[13px] text-fg-2 data-[selected=true]:bg-surface-2 data-[selected=true]:text-fg"
        >
          <Check className={cn("size-3.5 shrink-0 text-accent", z.id !== value && "invisible")} />
          <span className="min-w-0 flex-1 truncate">
            {z.name}
            {z.region && z.region !== "Brasil" && <span className="ml-1.5 text-fg-3">{z.region}</span>}
          </span>
          <span className="text-[12px] text-fg-3 tabular-nums">{z.offset}</span>
        </Command.Item>
      ))}
    </Command.Group>
  );
}
